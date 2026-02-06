import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent, createStripeCustomer } from '@/lib/stripe';
import { PRICING } from '@/lib/pricing';

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

    // Validate amount - must be at least $20 or one of the bonus tiers
    const validAmounts = [20, 30, 50, 100];
    if (!amount || !validAmounts.includes(amount)) {
      return NextResponse.json({ 
        error: `Invalid amount. Please select $20, $30, $50, or $100` 
      }, { status: 400 });
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
        amount: amount.toString(),
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
}
