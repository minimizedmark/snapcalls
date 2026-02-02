import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateCallCost, PRICING, toDecimal, fromDecimal } from '@/lib/pricing';
import { debitWallet, shouldSendLowBalanceAlert, recordLowBalanceAlert } from '@/lib/wallet';
import { sendOwnerNotification, normalizePhoneNumber } from '@/lib/twilio';
import { sendSmsFromNumber } from '@/lib/twilio-provisioning';
import { sendLowBalanceAlertEmail, sendMissedCallNotificationEmail } from '@/lib/email';
import {
  isWithinBusinessHours,
  formatBusinessHours,
  substituteMessageVariables,
} from '@/lib/utils';

/**
 * THE MONEY PRINTER 💰
 * Critical webhook handler for Twilio missed call notifications
 * Must respond within 1 second with 200 OK
 */
export async function POST(req: NextRequest) {
  // IMMEDIATE 200 OK RESPONSE
  const response = new Response('OK', { status: 200 });

  // Process asynchronously (don't await)
  processCallAsync(req).catch((error) => {
    console.error('❌ Async call processing error:', error);
    // TODO: Log to error monitoring service (Sentry, etc.)
  });

  return response;
}

/**
 * Processes the call asynchronously
 */
async function processCallAsync(req: NextRequest) {
  try {
    // Parse webhook payload
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const {
      CallSid: twilioCallSid,
      From: callerNumber,
      To: businessNumber,
      RecordingUrl: voicemailUrl,
    } = payload;

    if (!twilioCallSid || !callerNumber || !businessNumber) {
      console.error('❌ Missing required webhook parameters');
      return;
    }

    // Check for duplicate (prevent double charging)
    const existingCall = await prisma.callLog.findUnique({
      where: { twilioCallSid },
    });

    if (existingCall) {
      console.warn('⚠️  Duplicate call webhook received:', twilioCallSid);
      return;
    }

    // Lookup user by phone number
    const twilioConfig = await prisma.twilioConfig.findFirst({
      where: {
        phoneNumber: businessNumber,
        verified: true,
      },
      include: {
        user: {
          include: {
            businessSettings: true,
            messageTemplates: true,
            userFeatures: true,
            notificationSettings: true,
            wallet: true,
          },
        },
      },
    });

    if (!twilioConfig) {
      console.error('❌ No verified Twilio config found for:', businessNumber);
      return;
    }

    const user = twilioConfig.user;

    if (!user.businessSettings || !user.messageTemplates || !user.wallet) {
      console.error('❌ User not fully configured:', user.id);
      return;
    }

    // Track direct calls for auto-upgrade (BASIC plan only)
    // If user is using this number publicly (not just for forwarding),
    // they'll rack up calls and get auto-upgraded to PUBLIC_LINE
    if (user.subscriptionType === 'BASIC') {
      const { incrementDirectCallCount } = await import('@/lib/subscription');
      await incrementDirectCallCount(user.id);
    }

    // Check wallet balance (minimum $1.00)
    const currentBalance = fromDecimal(user.wallet.balance);

    if (currentBalance < PRICING.MINIMUM_BALANCE) {
      console.warn('⚠️  Insufficient balance for user:', user.id, 'Balance:', currentBalance);

      // Send low balance alert
      await sendLowBalanceAlert(user.id, user.email, user.businessSettings.businessName, currentBalance);

      return;
    }

    // Check if caller is VIP
    const normalizedCallerNumber = normalizePhoneNumber(callerNumber);
    const vipContact = await prisma.vipContact.findFirst({
      where: {
        userId: user.id,
        phoneNumber: normalizedCallerNumber,
      },
    });

    const isVip = !!vipContact;
    const callerName = vipContact?.name || null;

    // Check business hours
    const isBusinessHours = isWithinBusinessHours(
      user.businessSettings.timezone,
      user.businessSettings.hoursStart,
      user.businessSettings.hoursEnd,
      user.businessSettings.daysOpen
    );

    // Check for voicemail
    const hasVoicemail = !!voicemailUrl;

    // Determine message type
    let responseType: string;
    let messageTemplate: string;

    if (!isBusinessHours) {
      responseType = 'after_hours';
      messageTemplate = user.messageTemplates.afterHoursResponse;
    } else if (hasVoicemail) {
      responseType = 'voicemail';
      messageTemplate = user.messageTemplates.voicemailResponse;
    } else {
      responseType = 'standard';
      messageTemplate = user.messageTemplates.standardResponse;
    }

    // Substitute variables
    const formattedHours = formatBusinessHours(
      user.businessSettings.hoursStart,
      user.businessSettings.hoursEnd
    );

    const messageSent = substituteMessageVariables(messageTemplate, {
      businessName: user.businessSettings.businessName,
      businessHours: formattedHours,
      callerName: callerName || undefined,
    });

    // Check if caller is repeat caller (for recognition cost)
    const previousCalls = await prisma.callLog.count({
      where: {
        userId: user.id,
        callerNumber: normalizedCallerNumber,
      },
    });
    const isRepeatCaller = previousCalls > 0;

    // Calculate costs
    const features = user.userFeatures || {
      sequencesEnabled: false,
      recognitionEnabled: false,
      twoWayEnabled: false,
      vipPriorityEnabled: false,
      transcriptionEnabled: false,
    };

    const pricing = calculateCallCost({
      isVip,
      hasVoicemail,
      sequencesEnabled: features.sequencesEnabled,
      recognitionEnabled: features.recognitionEnabled,
      twoWayEnabled: features.twoWayEnabled,
      vipPriorityEnabled: features.vipPriorityEnabled,
      transcriptionEnabled: features.transcriptionEnabled,
      isRepeatCaller,
      customerReplied: false, // Will be updated if customer replies
    });

    // Check balance again for total cost
    if (currentBalance < pricing.totalCost) {
      console.warn('⚠️  Insufficient balance for call cost:', pricing.totalCost);
      await sendLowBalanceAlert(user.id, user.email, user.businessSettings.businessName, currentBalance);
      return;
    }

    // Send SMS to caller using admin Twilio account
    let smsStatus = 'pending';
    let smsMessageSid: string | null = null;

    try {
      const smsResult = await sendSmsFromNumber(
        businessNumber,
        callerNumber,
        messageSent
      );

      smsStatus = smsResult.status;
      smsMessageSid = smsResult.sid;
    } catch (smsError) {
      console.error('❌ Failed to send SMS:', smsError);
      smsStatus = 'failed';

      // Don't charge wallet if SMS failed
      return;
    }

    // Deduct from wallet (atomic transaction)
    let balanceAfter: number;
    try {
      balanceAfter = await debitWallet({
        userId: user.id,
        amount: pricing.totalCost,
        description: `Call from ${callerName || callerNumber}`,
        referenceId: twilioCallSid,
      });
    } catch (walletError) {
      console.error('❌ Failed to debit wallet:', walletError);
      return;
    }

    // Create call log entry
    const callLog = await prisma.callLog.create({
      data: {
        userId: user.id,
        callerNumber: normalizedCallerNumber,
        callerName,
        twilioCallSid,
        isVip,
        isBusinessHours,
        hasVoicemail,
        voicemailUrl: voicemailUrl || null,
        responseType,
        messageSent,
        smsStatus,
        smsMessageSid,
        sequenceTriggered: features.sequencesEnabled,
        recognitionUsed: features.recognitionEnabled && isRepeatCaller,
        baseCost: toDecimal(pricing.baseCost),
        sequencesCost: toDecimal(pricing.sequencesCost),
        recognitionCost: toDecimal(pricing.recognitionCost),
        twoWayCost: toDecimal(pricing.twoWayCost),
        vipPriorityCost: toDecimal(pricing.vipPriorityCost),
        transcriptionCost: toDecimal(pricing.transcriptionCost),
        totalCost: toDecimal(pricing.totalCost),
        ownerNotified: false,
      },
    });

    // Update VIP stats if applicable
    if (vipContact) {
      await prisma.vipContact.update({
        where: { id: vipContact.id },
        data: {
          lastCallDate: new Date(),
          totalCalls: { increment: 1 },
        },
      });
    }

    // Schedule sequences if enabled
    if (features.sequencesEnabled) {
      const now = new Date();
      const sequences = [
        {
          sequenceNumber: 1,
          scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours
          messageSent: 'Just checking in - were you able to get what you needed? Reply if you have questions.',
        },
        {
          sequenceNumber: 2,
          scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
          messageSent: 'Hi again! Just wanted to follow up. Let us know if you need anything.',
        },
        {
          sequenceNumber: 3,
          scheduledAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 72 hours
          messageSent: 'Final follow-up - we\'re here if you need us!',
        },
      ];

      for (const seq of sequences) {
        await prisma.responseSequence.create({
          data: {
            callLogId: callLog.id,
            sequenceNumber: seq.sequenceNumber,
            scheduledAt: seq.scheduledAt,
            messageSent: seq.messageSent,
            status: 'scheduled',
          },
        });
      }
    }

    // Send notification to owner
    const notifSettings = user.notificationSettings;
    if (notifSettings) {
      // SMS notification
      if (notifSettings.notifySms && notifSettings.smsNumber) {
        try {
          await sendOwnerNotification(
            notifSettings.smsNumber,
            `📞 Missed call from ${callerName || callerNumber}. Auto-response sent. View: ${process.env.APP_URL}/calls`
          );
        } catch (notifError) {
          console.error('⚠️  Failed to send owner SMS notification:', notifError);
        }
      }

      // Email notification
      if (notifSettings.notifyEmail && notifSettings.emailAddress) {
        try {
          await sendMissedCallNotificationEmail(
            notifSettings.emailAddress,
            user.businessSettings.businessName,
            callerNumber,
            callerName,
            responseType,
            callLog.timestamp
          );
        } catch (emailError) {
          console.error('⚠️  Failed to send owner email notification:', emailError);
        }
      }

      // Mark as notified
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { ownerNotified: true },
      });
    }

    // Check for low balance alerts
    for (const alertLevel of PRICING.LOW_BALANCE_ALERTS) {
      if (await shouldSendLowBalanceAlert(user.id, alertLevel)) {
        await sendLowBalanceAlert(user.id, user.email, user.businessSettings.businessName, balanceAfter);
        await recordLowBalanceAlert(user.id, alertLevel);
      }
    }

    console.log('✅ Call processed successfully:', {
      callSid: twilioCallSid,
      userId: user.id,
      cost: pricing.totalCost,
      balanceAfter,
    });
  } catch (error) {
    console.error('❌ Error processing call:', error);
    throw error;
  }
}

/**
 * Sends low balance alert via email and SMS
 */
async function sendLowBalanceAlert(
  userId: string,
  email: string,
  businessName: string,
  balance: number
) {
  try {
    // Send email alert
    await sendLowBalanceAlertEmail(email, businessName, balance, balance);

    // Get notification settings for SMS
    const notifSettings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (notifSettings?.notifySms && notifSettings.smsNumber) {
      await sendOwnerNotification(
        notifSettings.smsNumber,
        `⚠️ Snap Calls Wallet Alert: Your balance is $${balance.toFixed(2)}. Add funds at ${process.env.APP_URL}/wallet`
      );
    }
  } catch (error) {
    console.error('❌ Error sending low balance alert:', error);
  }
}
