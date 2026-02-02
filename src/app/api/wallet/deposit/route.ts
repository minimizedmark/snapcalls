import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent, createStripeCustomer } from '@/lib/stripe';

/**
 * Create a payment intent for wallet deposit
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get or create Stripe customer
    let stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: session.user.id },
    });

    if (!stripeCustomer) {
      const customerId = await createStripeCustomer(session.user.email!);
      stripeCustomer = await prisma.stripeCustomer.create({
        data: {
          userId: session.user.id,
          stripeCustomerId: customerId,
        },
      });
    }

    // Create payment intent
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      amount,
      stripeCustomer.stripeCustomerId,
      {
        userId: session.user.id,
        type: 'wallet_deposit',
      }
    );

    return NextResponse.json({
      clientSecret,
      paymentIntentId,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
