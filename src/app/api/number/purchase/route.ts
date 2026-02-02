import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { purchaseTwilioNumber } from '@/lib/twilio-provisioning';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const NUMBER_SETUP_FEE = 5.00; // $5 one-time fee

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { twilioConfig: true, stripeCustomer: true },
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
    const { areaCode } = body;

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomer?.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      
      await prisma.stripeCustomer.create({
        data: {
          userId: user.id,
          stripeCustomerId: customer.id,
        },
      });
      
      stripeCustomerId = customer.id;
    }

    // Create payment intent for $5 number setup fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: NUMBER_SETUP_FEE * 100, // $5 in cents
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        userId: user.id,
        type: 'number_purchase',
        areaCode: areaCode || 'any',
      },
      description: 'Snap Calls - Phone Number Setup ($5 one-time fee)',
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: NUMBER_SETUP_FEE,
    });
  } catch (error) {
    console.error('Number purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate number purchase' },
      { status: 500 }
    );
  }
}
