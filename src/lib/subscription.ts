import { prisma } from './prisma';
import { stripe } from './stripe';
import { debitWallet, getWalletBalance } from './wallet';
import { PRICING } from './pricing';
import { sendEmail } from './email';

export interface UpgradeResult {
  success: boolean;
  message: string;
  chargedCard?: boolean;
  chargedWallet?: boolean;
}

/**
 * Checks if user should be auto-upgraded based on direct call count
 */
export async function checkAutoUpgrade(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stripeCustomer: true },
  });

  if (!user || user.subscriptionType === 'PUBLIC_LINE') {
    return; // Already on Public Line
  }

  const directCallCount = user.directCallsThisMonth;

  // Send warning at 10 direct calls
  if (directCallCount === 10 && user.upgradeWarningsSent === 0) {
    await sendUpgradeWarning(user.email, directCallCount);
    await prisma.user.update({
      where: { id: userId },
      data: { upgradeWarningsSent: 1 },
    });
    return;
  }

  // Auto-upgrade at 20 direct calls
  if (directCallCount >= 20) {
    await autoUpgradeToPublicLine(userId);
  }
}

/**
 * Auto-upgrades user to Public Line plan
 */
async function autoUpgradeToPublicLine(userId: string): Promise<UpgradeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stripeCustomer: true },
  });

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.subscriptionType === 'PUBLIC_LINE') {
    return { success: false, message: 'Already on Public Line plan' };
  }

  // Try wallet first
  const walletBalance = await getWalletBalance(userId);
  
  if (walletBalance >= PRICING.PUBLIC_LINE_MONTHLY) {
    // Charge first month from wallet
    await debitWallet({
      userId,
      amount: PRICING.PUBLIC_LINE_MONTHLY,
      description: 'Public Line plan - First month (auto-upgraded)',
    });

    // Create Stripe subscription for future months
    await createPublicLineSubscription(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionType: 'PUBLIC_LINE',
        subscriptionStatus: 'active',
      },
    });

    await sendEmail(user.email, {
      subject: 'Upgraded to Public Line Plan',
      template: 'auto-upgraded-wallet',
      data: { directCalls: user.directCallsThisMonth },
    });

    return { success: true, message: 'Upgraded via wallet', chargedWallet: true };
  }

  // Charge card for first month
  if (!user.stripeCustomer?.stripeCustomerId) {
    await pauseService(userId);
    await sendEmail(user.email, {
      subject: 'Action Required: Add Payment Method',
      template: 'payment-method-required',
      data: {},
    });
    return { success: false, message: 'No payment method on file' };
  }

  try {
    // Charge first month to card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PRICING.PUBLIC_LINE_MONTHLY * 100, // Convert to cents
      currency: 'usd',
      customer: user.stripeCustomer.stripeCustomerId,
      description: 'Public Line plan - First month',
      confirm: true,
      off_session: true,
    });

    if (paymentIntent.status !== 'succeeded') {
      await pauseService(userId);
      await sendEmail(user.email, {
        subject: 'Payment Failed - Service Paused',
        template: 'payment-failed',
        data: {},
      });
      return { success: false, message: 'Payment failed' };
    }

    // Create subscription for future months
    await createPublicLineSubscription(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionType: 'PUBLIC_LINE',
        subscriptionStatus: 'active',
      },
    });

    await sendEmail(user.email, {
      subject: 'Upgraded to Public Line Plan',
      template: 'auto-upgraded-card',
      data: { directCalls: user.directCallsThisMonth },
    });

    return { success: true, message: 'Upgraded via card', chargedCard: true };
  } catch (error) {
    console.error('Auto-upgrade payment error:', error);
    await pauseService(userId);
    return { success: false, message: 'Payment processing error' };
  }
}

/**
 * Creates a Stripe subscription for Public Line plan
 */
async function createPublicLineSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stripeCustomer: true },
  });

  if (!user?.stripeCustomer?.stripeCustomerId) {
    throw new Error('No Stripe customer found');
  }

  // Create subscription (you'll need to create this price in Stripe dashboard)
  const subscription = await stripe.subscriptions.create({
    customer: user.stripeCustomer.stripeCustomerId,
    items: [
      {
        price: process.env.STRIPE_PUBLIC_LINE_PRICE_ID!, // $20/month price ID from Stripe
      },
    ],
    metadata: {
      userId: userId,
      plan: 'public_line',
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: 'active',
    },
  });
}

/**
 * Manually upgrades user to Public Line (user-initiated)
 */
export async function upgradeToPublicLine(userId: string): Promise<UpgradeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stripeCustomer: true },
  });

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (user.subscriptionType === 'PUBLIC_LINE') {
    return { success: false, message: 'Already on Public Line plan' };
  }

  if (!user.stripeCustomer?.stripeCustomerId) {
    return { success: false, message: 'No payment method on file' };
  }

  try {
    // Create subscription immediately (first charge happens now)
    await createPublicLineSubscription(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionType: 'PUBLIC_LINE',
        subscriptionStatus: 'active',
      },
    });

    await sendEmail(user.email, {
      subject: 'Welcome to Public Line!',
      template: 'manual-upgrade',
      data: {},
    });

    return { success: true, message: 'Successfully upgraded', chargedCard: true };
  } catch (error) {
    console.error('Manual upgrade error:', error);
    return { success: false, message: 'Upgrade failed' };
  }
}

/**
 * Increments direct call counter for auto-upgrade tracking
 */
export async function incrementDirectCallCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      directCallsThisMonth: { increment: 1 },
    },
  });

  // Check if auto-upgrade needed
  await checkAutoUpgrade(userId);
}

/**
 * Resets monthly direct call counter (run via cron on 1st of month)
 */
export async function resetMonthlyDirectCallCounts(): Promise<void> {
  await prisma.user.updateMany({
    data: {
      directCallsThisMonth: 0,
      upgradeWarningsSent: 0,
    },
  });
}

/**
 * Pauses service due to payment failure
 */
async function pauseService(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'paused',
      isActive: false,
    },
  });
}

/**
 * Sends upgrade warning email
 */
async function sendUpgradeWarning(email: string, callCount: number): Promise<void> {
  await sendEmail(email, {
    subject: 'Upgrade Notice: Approaching Public Line Plan',
    template: 'upgrade-warning',
    data: {
      callCount,
      upgradeThreshold: 20,
    },
  });
}

/**
 * Cancels Public Line subscription
 */
export async function cancelPublicLineSubscription(userId: string): Promise<UpgradeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.stripeSubscriptionId) {
    return { success: false, message: 'No active subscription' };
  }

  try {
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionType: 'BASIC',
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: null,
      },
    });

    return { success: true, message: 'Subscription cancelled' };
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return { success: false, message: 'Cancellation failed' };
  }
}
