import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { processSetupFee } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { purchaseTwilioNumber } from '@/lib/twilio-provisioning';
import { addNumberToInventory, assignAvailableNumber } from '@/lib/number-inventory';

/**
 * Processes setup fee and provisions Twilio number
 */
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if setup fee already paid
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.setupFeePaid) {
      return NextResponse.json(
        { error: 'Setup fee already paid' },
        { status: 400 }
      );
    }

    // Deduct $5 setup fee from wallet
    const newBalance = await processSetupFee(session.user.id);

    // Assign from inventory or purchase Twilio number
    const pooledNumber = await assignAvailableNumber(session.user.id);
    const phoneNumber = pooledNumber || (await purchaseTwilioNumber());

    if (!pooledNumber) {
      await addNumberToInventory(phoneNumber, session.user.id);
    }

    // Save number to database
    await prisma.twilioConfig.create({
      data: {
        userId: session.user.id,
        accountSid: 'ADMIN_MANAGED',
        authToken: 'ADMIN_MANAGED',
        phoneNumber,
        verified: true,
      },
    });

    // Mark setup fee as paid
    await prisma.user.update({
      where: { id: session.user.id },
      data: { setupFeePaid: true },
    });

    return NextResponse.json({
      success: true,
      phoneNumber,
      newBalance,
    });
  } catch (error) {
    console.error('Setup fee error:', error);
    
    if (error instanceof Error && error.message === 'Insufficient wallet balance') {
      return NextResponse.json(
        { error: 'Insufficient wallet balance. Please add funds first.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process setup fee' },
      { status: 500 }
    );
  }
}
