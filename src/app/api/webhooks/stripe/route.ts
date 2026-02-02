import { NextRequest, NextResponse } from 'next/server';
import { validateStripeWebhook } from '@/lib/stripe';
import { creditWallet } from '@/lib/wallet';
import { calculateWalletDeposit } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { purchaseTwilioNumber } from '@/lib/twilio-provisioning';
import Stripe from 'stripe';

/**
 * Handles Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = validateStripeWebhook(body, signature);
  } catch (error) {
    console.error('❌ Stripe webhook validation failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handles successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;
  const amount = paymentIntent.amount / 100; // Convert from cents

  // Find user by Stripe customer ID
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  // Check if this is a number purchase vs wallet deposit
  const paymentType = paymentIntent.metadata.type;

  if (paymentType === 'number_purchase') {
    await handleNumberPurchase(stripeCustomer.userId, stripeCustomer.user.email, paymentIntent);
  } else {
    await handleWalletDeposit(stripeCustomer.userId, stripeCustomer.user.email, amount, paymentIntent.id);
  }
}

/**
 * Handles number purchase payment
 */
async function handleNumberPurchase(userId: string, userEmail: string, paymentIntent: Stripe.PaymentIntent) {
  const areaCode = paymentIntent.metadata.areaCode !== 'any' ? paymentIntent.metadata.areaCode : undefined;

  try {
    // Purchase Twilio number
    const phoneNumber = await purchaseTwilioNumber(areaCode);

    // Save to database (no encryption needed - it's under our account)
    await prisma.twilioConfig.create({
      data: {
        userId,
        accountSid: 'ADMIN_MANAGED', // Marker that this is under admin account
        authToken: 'ADMIN_MANAGED',
        phoneNumber,
        verified: true,
      },
    });

    console.log('✅ Number purchased and assigned:', {
      userId,
      phoneNumber,
      setupFee: 5.00,
    });

    // Send confirmation email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: `Snap Calls <${process.env.FROM_EMAIL}>`,
        to: userEmail,
        subject: '🎉 Your Snap Calls Number is Ready!',
        html: `
          <h2>Welcome to Snap Calls!</h2>
          <p>Your business phone number has been set up successfully.</p>
          <h3>Your Number: ${phoneNumber}</h3>
          <p>This is your dedicated Snap Calls number. When customers call and you miss it, we'll text them back instantly.</p>
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>Add funds to your wallet to start responding to calls</li>
            <li>Customize your message templates</li>
            <li>Start never missing another customer!</li>
          </ol>
          <p>Questions? Just reply to this email.</p>
        `,
      });
    } catch (error) {
      console.error('❌ Failed to send number purchase email:', error);
    }
  } catch (error) {
    console.error('❌ Failed to purchase number:', error);
    // TODO: Refund the $5 if number purchase fails
  }
}

/**
 * Handles wallet deposit payment
 */
async function handleWalletDeposit(userId: string, userEmail: string, amount: number, paymentIntentId: string) {
  // Calculate deposit with bonus
  const depositInfo = calculateWalletDeposit(amount);

  // Credit wallet with bonus
  const balanceAfter = await creditWallet({
    userId,
    amount: depositInfo.totalCredit,
    description: `Wallet deposit: $${amount} + $${depositInfo.bonusAmount} bonus`,
    referenceId: paymentIntentId,
  });

  console.log('✅ Payment processed:', {
    userId,
    depositAmount: amount,
    bonusAmount: depositInfo.bonusAmount,
    totalCredit: depositInfo.totalCredit,
    balanceAfter,
  });

  // Send confirmation email
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `Snap Calls <${process.env.FROM_EMAIL}>`,
      to: userEmail,
      subject: '✅ Wallet Deposit Successful',
      html: `
        <h2>Deposit Successful!</h2>
        <p>Your wallet has been credited with $${depositInfo.totalCredit.toFixed(2)}:</p>
        <ul>
          <li>Deposit amount: $${depositInfo.depositAmount.toFixed(2)}</li>
          <li>Bonus: $${depositInfo.bonusAmount.toFixed(2)} (${depositInfo.description})</li>
        </ul>
        <p>New balance: $${balanceAfter.toFixed(2)}</p>
        <p>Thank you for using Snap Calls!</p>
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send deposit confirmation email:', error);
  }
}

/**
 * Handles failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;

  // Find user by Stripe customer ID
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  console.error('❌ Payment failed:', {
    userId: stripeCustomer.userId,
    paymentIntentId: paymentIntent.id,
    failureMessage: paymentIntent.last_payment_error?.message,
  });

  // Send failure notification email
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `Snap Calls <${process.env.FROM_EMAIL}>`,
      to: stripeCustomer.user.email,
      subject: '❌ Wallet Deposit Failed',
      html: `
        <h2>Payment Failed</h2>
        <p>We were unable to process your wallet deposit.</p>
        <p>Reason: ${paymentIntent.last_payment_error?.message || 'Unknown error'}</p>
        <p>Please try again or contact support if the problem persists.</p>
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
  }
}

/**
 * Handles subscription created/updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionType: 'PUBLIC_LINE',
    },
  });

  console.log('✅ Subscription updated:', {
    userId: stripeCustomer.userId,
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

/**
 * Handles subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      subscriptionType: 'BASIC',
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
    },
  });

  console.log('✅ Subscription cancelled:', {
    userId: stripeCustomer.userId,
    subscriptionId: subscription.id,
  });

  // Send cancellation confirmation email
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `Snap Calls <${process.env.FROM_EMAIL}>`,
      to: stripeCustomer.user.email,
      subject: 'Public Line Subscription Cancelled',
      html: `
        <h2>Subscription Cancelled</h2>
        <p>Your Public Line subscription has been cancelled.</p>
        <p>You've been downgraded to the Basic plan. You can still use call forwarding, but direct calls to your number will not be answered.</p>
        <p>You can upgrade again anytime from your dashboard.</p>
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
  }
}

/**
 * Handles successful invoice payment (monthly subscription)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  // Update subscription status to active
  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      subscriptionStatus: 'active',
    },
  });

  console.log('✅ Subscription payment succeeded:', {
    userId: stripeCustomer.userId,
    invoiceId: invoice.id,
    amount: invoice.amount_paid / 100,
  });
}

/**
 * Handles failed invoice payment (subscription payment failed)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!stripeCustomer) {
    console.error('❌ No user found for Stripe customer:', customerId);
    return;
  }

  // Pause service
  await prisma.user.update({
    where: { id: stripeCustomer.userId },
    data: {
      subscriptionStatus: 'paused',
      isActive: false,
    },
  });

  console.error('❌ Subscription payment failed:', {
    userId: stripeCustomer.userId,
    invoiceId: invoice.id,
  });

  // Send payment failure email
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `Snap Calls <${process.env.FROM_EMAIL}>`,
      to: stripeCustomer.user.email,
      subject: '⚠️ Subscription Payment Failed - Service Paused',
      html: `
        <h2>Payment Failed</h2>
        <p>We were unable to process your monthly Public Line subscription payment.</p>
        <p>Your service has been paused until payment is successful.</p>
        <p>Please update your payment method in your dashboard to restore service.</p>
        <p>If you have any questions, please contact support.</p>
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send payment failure email:', error);
  }
}

