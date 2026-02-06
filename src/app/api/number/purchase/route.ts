import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { purchaseTwilioNumber } from '@/lib/twilio-provisioning';
import { debitWallet } from '@/lib/wallet';
import { addNumberToInventory, assignAvailableNumber } from '@/lib/number-inventory';
import { PRICING } from '@/lib/pricing';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { twilioConfig: true, wallet: true },
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

    // Check wallet balance
    if (!user.wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Please contact support.' },
        { status: 400 }
      );
    }

    const walletBalance = user.wallet.balance.toNumber();
    if (walletBalance < PRICING.SETUP_FEE) {
      return NextResponse.json(
        { error: `Insufficient balance. You need $${PRICING.SETUP_FEE} but have $${walletBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { areaCode } = body;

    console.log('📞 Number purchase request:', {
      userId: user.id,
      email: user.email,
      areaCode: areaCode || 'any',
      walletBalance,
    });

    // Debit the setup fee from wallet
    const newBalance = await debitWallet({
      userId: user.id,
      amount: PRICING.SETUP_FEE,
      description: 'Phone number setup fee',
      referenceId: `number_setup_${Date.now()}`,
    });

    console.log('💰 Wallet debited:', {
      userId: user.id,
      amount: PRICING.SETUP_FEE,
      newBalance,
    });

    // Try to assign from inventory first
    const pooledNumber = await assignAvailableNumber(user.id, areaCode);
    const phoneNumber = pooledNumber || (await purchaseTwilioNumber(areaCode));

    // Add to inventory if newly purchased
    if (!pooledNumber) {
      await addNumberToInventory(phoneNumber, user.id);
    }

    // Save to database
    await prisma.twilioConfig.create({
      data: {
        userId: user.id,
        accountSid: 'ADMIN_MANAGED',
        authToken: 'ADMIN_MANAGED',
        phoneNumber,
        verified: true,
      },
    });

    console.log('✅ Number assigned:', {
      userId: user.id,
      phoneNumber,
      setupFee: PRICING.SETUP_FEE,
      source: pooledNumber ? 'inventory' : 'twilio',
      remainingBalance: newBalance,
    });

    // Send confirmation email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: `Snap Calls <${process.env.FROM_EMAIL}>`,
        to: user.email,
        subject: '🎉 Your Snap Calls Number is Ready!',
        html: `
          <h2>Welcome to Snap Calls!</h2>
          <p>Your business phone number has been set up successfully.</p>
          <h3>Your Number: ${phoneNumber}</h3>
          <p>This is your dedicated Snap Calls number. When customers call and you miss it, we'll text them back instantly.</p>
          <p><strong>Setup Summary:</strong></p>
          <ul>
            <li>Setup fee: $${PRICING.SETUP_FEE.toFixed(2)}</li>
            <li>Remaining wallet balance: $${newBalance.toFixed(2)}</li>
          </ul>
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>Customize your message templates</li>
            <li>Configure your business hours</li>
            <li>Start never missing another customer!</li>
          </ol>
          <p>Questions? Just reply to this email.</p>
        `,
      });
    } catch (error) {
      console.error('❌ Failed to send number purchase email:', error);
    }

    return NextResponse.json({
      success: true,
      phoneNumber,
      setupFee: PRICING.SETUP_FEE,
      remainingBalance: newBalance,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Number purchase error:', errorMessage, error);
    
    // If it's an insufficient balance error, return it clearly
    if (errorMessage.includes('Insufficient wallet balance')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to purchase number', details: errorMessage },
      { status: 500 }
    );
  }
}
