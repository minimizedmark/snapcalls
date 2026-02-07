import { prisma } from './prisma';
import { toDecimal, fromDecimal, PRICING } from './pricing';

/**
 * Custom error for insufficient wallet balance
 */
export class InsufficientBalanceError extends Error {
  constructor(message: string = 'Insufficient wallet balance') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export interface DebitWalletParams {
  userId: string;
  amount: number;
  description: string;
  referenceId?: string;
}

export interface CreditWalletParams {
  userId: string;
  amount: number;
  description: string;
  referenceId?: string;
}

/**
 * Atomically debits (subtracts) amount from wallet with balance check
 * Uses atomic decrement operation to prevent race conditions
 * Returns new balance or throws InsufficientBalanceError if insufficient funds
 */
export async function debitWallet(params: DebitWalletParams): Promise<number> {
  const { userId, amount, description, referenceId } = params;

  return await prisma.$transaction(async (tx) => {
    // Atomic update with balance check in WHERE clause
    // This prevents race conditions - only updates if balance >= amount
    const result = await tx.wallet.updateMany({
      where: {
        userId,
        balance: { gte: toDecimal(amount) },
      },
      data: {
        balance: { decrement: toDecimal(amount) },
      },
    });

    // If no rows were updated, balance was insufficient
    if (result.count === 0) {
      throw new InsufficientBalanceError();
    }

    // Read the new balance
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = fromDecimal(wallet.balance);

    // Create transaction record
    await tx.walletTransaction.create({
      data: {
        userId,
        amount: toDecimal(amount),
        type: 'DEBIT',
        description,
        referenceId,
        balanceAfter: wallet.balance,
      },
    });

    return newBalance;
  });
}

/**
 * Atomically credits (adds) amount to wallet
 * Uses atomic increment operation to prevent race conditions
 * Returns new balance
 */
export async function creditWallet(params: CreditWalletParams): Promise<number> {
  const { userId, amount, description, referenceId } = params;

  return await prisma.$transaction(async (tx) => {
    // Atomic increment operation
    const result = await tx.wallet.updateMany({
      where: { userId },
      data: {
        balance: { increment: toDecimal(amount) },
      },
    });

    // Verify wallet exists
    if (result.count === 0) {
      throw new Error('Wallet not found');
    }

    // Read the new balance
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = fromDecimal(wallet.balance);

    // Create transaction record
    await tx.walletTransaction.create({
      data: {
        userId,
        amount: toDecimal(amount),
        type: 'CREDIT',
        description,
        referenceId,
        balanceAfter: wallet.balance,
      },
    });

    return newBalance;
  });
}

/**
 * Gets current wallet balance
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  return fromDecimal(wallet.balance);
}

/**
 * Checks if user has sufficient balance
 */
export async function hasInsufficientBalance(userId: string, requiredAmount: number): Promise<boolean> {
  const balance = await getWalletBalance(userId);
  return balance < requiredAmount;
}

/**
 * Checks if low balance alert should be sent
 */
export async function shouldSendLowBalanceAlert(
  userId: string,
  alertLevel: number
): Promise<boolean> {
  const balance = await getWalletBalance(userId);

  if (balance > alertLevel) {
    return false;
  }

  // Check if alert was already sent recently (within 24 hours)
  const recentAlert = await prisma.lowBalanceAlert.findFirst({
    where: {
      userId,
      alertLevel: toDecimal(alertLevel),
      lastSentAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  return !recentAlert;
}

/**
 * Records that a low balance alert was sent
 */
export async function recordLowBalanceAlert(userId: string, alertLevel: number): Promise<void> {
  // Find existing alert
  const existing = await prisma.lowBalanceAlert.findFirst({
    where: {
      userId,
      alertLevel: toDecimal(alertLevel),
    },
  });

  if (existing) {
    // Update existing alert
    await prisma.lowBalanceAlert.update({
      where: { id: existing.id },
      data: { lastSentAt: new Date() },
    });
  } else {
    // Create new alert
    await prisma.lowBalanceAlert.create({
      data: {
        userId,
        alertLevel: toDecimal(alertLevel),
        lastSentAt: new Date(),
      },
    });
  }
}

/**
 * Processes auto-reload if enabled and threshold reached
 */
export async function processAutoReload(userId: string): Promise<boolean> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet || !wallet.autoReloadEnabled) {
    return false;
  }

  const balance = fromDecimal(wallet.balance);
  const threshold = fromDecimal(wallet.autoReloadThreshold);

  if (balance >= threshold) {
    return false;
  }

  // Get Stripe customer info
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { userId },
  });

  if (!stripeCustomer || !stripeCustomer.paymentMethodId) {
    return false;
  }

  // This will be implemented with Stripe integration
  // For now, just return false
  return false;
}

/**
 * Initializes a wallet for a new user
 */
export async function initializeWallet(userId: string): Promise<void> {
  await prisma.wallet.create({
    data: {
      userId,
      balance: toDecimal(0),
      currency: 'USD',
      autoReloadEnabled: false,
      autoReloadThreshold: toDecimal(PRICING.AUTO_RELOAD.DEFAULT_THRESHOLD),
      autoReloadAmount: toDecimal(PRICING.AUTO_RELOAD.DEFAULT_AMOUNT),
    },
  });
}
