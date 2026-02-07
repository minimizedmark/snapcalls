import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { acquireNumber } from '@/lib/twilio-provisioning';
import { debitWallet, InsufficientBalanceError } from '@/lib/wallet';
import { addNumberToInventory } from '@/lib/number-inventory';
import { PRICING } from '@/lib/pricing';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        twilioConfig: true, 
        wallet: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has a number
    if (user.twilioConfig) {
      return NextResponse.json(
        { error: 'You already have a phone number' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { areaCode, country = 'US' } = body;

    const isSnapLine = user.subscriptionType === 'SNAPLINE';

    console.log('📞 Number purchase request:', {
      userId: user.id,
      email: user.email,
      areaCode: areaCode || 'any',
      country,
      isSnapLine,
    });

    /**
     * STEP 1: CHARGE WALLET FIRST
     * 
     * We always charge before attempting number acquisition because:
     * 1. We control the wallet - refunds are trivial if needed
     * 2. Prevents race conditions where users get numbers without paying
     * 3. Twilio operations are external and unpredictable
     */
    let newBalance: number;
    try {
      newBalance = await debitWallet({
        userId: user.id,
        amount: PRICING.SETUP_FEE,
        description: 'Phone number setup fee',
        referenceId: `number_setup_${crypto.randomUUID()}`,
      });

      console.log('💰 Wallet debited:', {
        userId: user.id,
        amount: PRICING.SETUP_FEE,
        newBalance,
      });
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        return NextResponse.json(
          { error: error.message },
          { status: 402 }
        );
      }
      throw error;
    }

    /**
     * STEP 2: ATTEMPT NUMBER ACQUISITION WITH FALLBACK CHAIN
     * 
     * The acquireNumber function tries:
     * 1. Pool inventory with requested area code
     * 2. Twilio with requested area code (3 retries)
     * 3. Twilio with any regional number (3 retries)
     * 4. Twilio non-regional numbers (3 retries)
     * 
     * If all methods fail, we create a pending request and notify the user.
     */
    let acquisitionResult;
    try {
      acquisitionResult = await acquireNumber({
        userId: user.id,
        requestedAreaCode: areaCode,
        country: country as 'US' | 'CA',
        isSnapLine,
      });

      console.log('✅ Number acquired:', acquisitionResult);
    } catch (acquisitionError) {
      /**
       * STEP 3: APOCALYPSE SCENARIO - TWILIO COMPLETELY DOWN
       * 
       * We do NOT refund the wallet. Instead:
       * 1. Create a PendingNumberRequest record for manual fulfillment
       * 2. Send email explaining the delay
       * 3. Return 202 Accepted
       * 
       * Philosophy: Customer paid for service, they WILL get a number.
       * Better to delay delivery than issue refunds.
       */
      console.error('❌ All number acquisition methods failed:', acquisitionError);

      // Create pending request
      await prisma.pendingNumberRequest.create({
        data: {
          userId: user.id,
          requestedAreaCode: areaCode,
          country,
          isSnapLine,
          paidAmount: PRICING.SETUP_FEE,
          status: 'PENDING',
        },
      });

      // Send delay notification email
      try {
        await resend.emails.send({
          from: `SnapCalls <${process.env.FROM_EMAIL}>`,
          to: user.email,
          subject: '⏳ Your SnapCalls Number Assignment in Progress',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #0A0A0A; color: #FFFFFF; padding: 30px; border-radius: 8px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">⏳ Number Assignment in Progress</h1>
              </div>
              
              <div style="background: #FFFFFF; padding: 30px; border-radius: 8px; margin-top: 20px; border: 2px solid #FF6B00;">
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                  We're currently experiencing high demand, which is causing delays in number assignments.
                </p>
                
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                  <strong>The phone number you requested will be emailed to you as soon as it becomes available.</strong>
                </p>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  We appreciate your patience and apologize for the inconvenience. Your payment has been processed successfully, and we're working to fulfill your request.
                </p>
                
                ${areaCode ? `<p style="color: #666; font-size: 14px;">Requested area code: <strong>${areaCode}</strong></p>` : ''}
                
                <div style="margin-top: 20px; padding: 15px; background: #FFF4E6; border-left: 4px solid #FF6B00; border-radius: 4px;">
                  <p style="margin: 0; color: #333; font-size: 14px;">
                    <strong>💡 What happens next?</strong><br>
                    Our team is monitoring this situation and will manually assign your number within 24 hours. You'll receive another email as soon as your number is ready.
                  </p>
                </div>
              </div>
              
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                Questions? Just reply to this email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('❌ Failed to send pending number email:', emailError);
      }

      return NextResponse.json(
        { 
          pending: true, 
          message: 'Number assignment in progress. You will receive an email when your number is ready.',
          setupFee: PRICING.SETUP_FEE,
          remainingBalance: newBalance,
        },
        { status: 202 }
      );
    }

    /**
     * STEP 4: NUMBER ACQUISITION SUCCEEDED - SAVE TO DATABASE
     */
    const { phoneNumber, source, isTemp } = acquisitionResult;

    // Add to inventory if purchased from Twilio
    if (source === 'twilio') {
      await addNumberToInventory(phoneNumber, user.id);
    }

    // Save TwilioConfig to database
    await prisma.twilioConfig.create({
      data: {
        userId: user.id,
        accountSid: 'ADMIN_MANAGED',
        authToken: 'ADMIN_MANAGED',
        phoneNumber,
        verified: true,
        // If temp number for SnapLine subscriber, flag it for later swap
        ...(isTemp && {
          tempNumber: true,
          requestedAreaCode: areaCode,
        }),
      },
    });

    console.log('✅ Number assigned:', {
      userId: user.id,
      phoneNumber,
      setupFee: PRICING.SETUP_FEE,
      source,
      isTemp,
      remainingBalance: newBalance,
    });

    /**
     * STEP 5: SEND SUCCESS EMAIL
     */
    try {
      await resend.emails.send({
        from: `SnapCalls <${process.env.FROM_EMAIL}>`,
        to: user.email,
        subject: '🎉 Your SnapCalls Number is Ready!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0A0A0A; color: #FFFFFF; padding: 30px; border-radius: 8px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🎉 Welcome to SnapCalls!</h1>
            </div>
            
            <div style="background: #FFFFFF; padding: 30px; border-radius: 8px; margin-top: 20px; border: 2px solid #FF6B00;">
              <h2 style="color: #333; margin-top: 0;">Your Number: ${phoneNumber}</h2>
              
              ${isTemp ? `
                <div style="margin: 20px 0; padding: 15px; background: #FFF4E6; border-left: 4px solid #FF6B00; border-radius: 4px;">
                  <p style="margin: 0; color: #333; font-size: 14px;">
                    <strong>📍 Temporary Number Notice</strong><br>
                    This is a temporary number. We're working to get you a ${areaCode ? `number in your preferred ${areaCode} area code` : 'regional number'}.
                    You'll receive an email when your permanent number is ready, and we'll handle the swap automatically.
                  </p>
                </div>
              ` : ''}
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Your business phone number has been set up successfully. When customers call and you miss it, we'll text them back instantly.
              </p>
              
              <div style="margin: 20px 0; padding: 20px; background: #F9FAFB; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333;">Setup Summary:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li>Setup fee: $${PRICING.SETUP_FEE.toFixed(2)}</li>
                  <li>Remaining wallet balance: $${newBalance.toFixed(2)}</li>
                </ul>
              </div>
              
              <h3 style="color: #333;">Next steps:</h3>
              <ol style="color: #666; line-height: 1.8;">
                <li>Customize your message templates</li>
                <li>Configure your business hours</li>
                <li>Start never missing another customer!</li>
              </ol>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              Questions? Just reply to this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('❌ Failed to send number purchase email:', emailError);
    }

    return NextResponse.json({
      success: true,
      phoneNumber,
      setupFee: PRICING.SETUP_FEE,
      remainingBalance: newBalance,
      isTemp,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Number purchase error:', errorMessage, error);
    
    return NextResponse.json(
      { error: 'Failed to purchase number', details: errorMessage },
      { status: 500 }
    );
  }
}
