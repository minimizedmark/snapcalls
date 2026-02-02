import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/twilio';
import { toDecimal } from '@/lib/pricing';
import { debitWallet } from '@/lib/wallet';

/**
 * Handles incoming SMS messages for two-way conversations
 */
export async function POST(req: NextRequest) {
  // Return 200 OK immediately
  const response = new Response('OK', { status: 200 });

  // Process asynchronously
  processIncomingSmsAsync(req).catch((error) => {
    console.error('❌ Error processing incoming SMS:', error);
  });

  return response;
}

async function processIncomingSmsAsync(req: NextRequest) {
  try {
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const {
      MessageSid: smsMessageSid,
      From: customerNumber,
      To: businessNumber,
      Body: messageBody,
    } = payload;

    if (!smsMessageSid || !customerNumber || !businessNumber || !messageBody) {
      console.error('❌ Missing required SMS parameters');
      return;
    }

    // Find the Twilio config and user
    const twilioConfig = await prisma.twilioConfig.findFirst({
      where: {
        phoneNumber: businessNumber,
        verified: true,
      },
      include: {
        user: {
          include: {
            userFeatures: true,
            notificationSettings: true,
            wallet: true,
          },
        },
      },
    });

    if (!twilioConfig) {
      console.error('❌ No Twilio config found for:', businessNumber);
      return;
    }

    const user = twilioConfig.user;

    // Check if two-way is enabled
    if (!user.userFeatures?.twoWayEnabled) {
      console.log('ℹ️  Two-way messaging not enabled for user:', user.id);
      return;
    }

    // Find the most recent call from this customer
    const normalizedCustomerNumber = normalizePhoneNumber(customerNumber);
    const recentCall = await prisma.callLog.findFirst({
      where: {
        userId: user.id,
        callerNumber: normalizedCustomerNumber,
        customerReplied: false,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!recentCall) {
      console.log('ℹ️  No recent call found for customer:', customerNumber);
      return;
    }

    // Update call log with customer reply
    await prisma.callLog.update({
      where: { id: recentCall.id },
      data: {
        customerReplied: true,
        customerReplyText: messageBody,
        twoWayTriggered: true,
      },
    });

    // Charge for two-way feature if not already charged
    if (recentCall.twoWayCost.toNumber() === 0) {
      try {
        const balanceAfter = await debitWallet({
          userId: user.id,
          amount: 0.5, // Two-way cost
          description: `Two-way conversation with ${customerNumber}`,
          referenceId: recentCall.id,
        });

        // Update call log with two-way cost
        await prisma.callLog.update({
          where: { id: recentCall.id },
          data: {
            twoWayCost: toDecimal(0.5),
            totalCost: {
              increment: toDecimal(0.5),
            },
          },
        });

        console.log('✅ Two-way cost charged:', { userId: user.id, balanceAfter });
      } catch (error) {
        console.error('❌ Failed to charge two-way cost:', error);
      }
    }

    // Notify owner of customer reply
    const notifSettings = user.notificationSettings;
    if (notifSettings?.notifyOnReply) {
      // Send SMS notification if enabled
      if (notifSettings.notifySms && notifSettings.smsNumber) {
        try {
          const { sendOwnerNotification } = await import('@/lib/twilio');
          await sendOwnerNotification(
            notifSettings.smsNumber,
            `💬 Reply from ${customerNumber}: "${messageBody.substring(0, 100)}${messageBody.length > 100 ? '...' : ''}"`
          );
        } catch (error) {
          console.error('❌ Failed to send owner SMS notification:', error);
        }
      }

      // Send email notification if enabled
      if (notifSettings.notifyEmail && notifSettings.emailAddress) {
        // Email notification could be implemented here
        console.log('📧 Email notification would be sent to:', notifSettings.emailAddress);
      }
    }

    console.log('✅ Incoming SMS processed:', {
      callLogId: recentCall.id,
      customerNumber,
      messageLength: messageBody.length,
    });
  } catch (error) {
    console.error('❌ Error processing incoming SMS:', error);
    throw error;
  }
}
