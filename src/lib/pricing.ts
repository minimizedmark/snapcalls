import { Decimal } from '@prisma/client/runtime/library';

// Pricing constants
export const PRICING = {
  BASE_COST: 1.0,
  FEATURES: {
    SEQUENCES: 0.5,
    RECOGNITION: 0.25,
    TWO_WAY: 0.5,
    VIP_PRIORITY_NON_VIP: 0.5,
    VIP_PRIORITY_VIP: 0.25,
    TRANSCRIPTION: 0.25,
  },
  MESSAGE_CHANGES: {
    FREE_PER_MONTH: 1,
    ADDITIONAL_COST: 0.5,
  },
  WALLET_DEPOSITS: {
    20: { bonus: 0, description: 'Minimum deposit' },
    30: { bonus: 4.5, description: '15% bonus' },
    50: { bonus: 12.5, description: '25% bonus' },
    100: { bonus: 50, description: '50% bonus' },
  },
  SETUP_FEE: 5.0,
  PUBLIC_LINE_MONTHLY: 20.0,
  AUTO_RELOAD: {
    DEFAULT_THRESHOLD: 10.0,
    DEFAULT_AMOUNT: 20.0,
  },
  MINIMUM_BALANCE: 1.0,
  LOW_BALANCE_ALERTS: [10.0, 5.0, 0.0],
} as const;

export interface CallPricingParams {
  isVip: boolean;
  hasVoicemail: boolean;
  sequencesEnabled: boolean;
  recognitionEnabled: boolean;
  twoWayEnabled: boolean;
  vipPriorityEnabled: boolean;
  transcriptionEnabled: boolean;
  isRepeatCaller?: boolean;
  customerReplied?: boolean;
}

export interface CallPricingResult {
  baseCost: number;
  sequencesCost: number;
  recognitionCost: number;
  twoWayCost: number;
  vipPriorityCost: number;
  transcriptionCost: number;
  totalCost: number;
}

/**
 * Calculates the total cost for a call based on enabled features and usage
 */
export function calculateCallCost(params: CallPricingParams): CallPricingResult {
  const result: CallPricingResult = {
    baseCost: PRICING.BASE_COST,
    sequencesCost: 0,
    recognitionCost: 0,
    twoWayCost: 0,
    vipPriorityCost: 0,
    transcriptionCost: 0,
    totalCost: PRICING.BASE_COST,
  };

  // Sequences cost - only if enabled
  if (params.sequencesEnabled) {
    result.sequencesCost = PRICING.FEATURES.SEQUENCES;
  }

  // Recognition cost - only if enabled AND caller is repeat caller
  if (params.recognitionEnabled && params.isRepeatCaller) {
    result.recognitionCost = PRICING.FEATURES.RECOGNITION;
  }

  // Two-way cost - only if enabled AND customer replied
  if (params.twoWayEnabled && params.customerReplied) {
    result.twoWayCost = PRICING.FEATURES.TWO_WAY;
  }

  // VIP priority cost - only if enabled
  if (params.vipPriorityEnabled) {
    if (params.isVip) {
      result.vipPriorityCost = PRICING.FEATURES.VIP_PRIORITY_VIP;
    } else {
      result.vipPriorityCost = PRICING.FEATURES.VIP_PRIORITY_NON_VIP;
    }
  }

  // Transcription cost - only if enabled AND voicemail exists
  if (params.transcriptionEnabled && params.hasVoicemail) {
    result.transcriptionCost = PRICING.FEATURES.TRANSCRIPTION;
  }

  // Calculate total
  result.totalCost =
    result.baseCost +
    result.sequencesCost +
    result.recognitionCost +
    result.twoWayCost +
    result.vipPriorityCost +
    result.transcriptionCost;

  return result;
}

/**
 * Calculates the message change cost
 */
export function calculateMessageChangeCost(changesUsedThisMonth: number): number {
  if (changesUsedThisMonth < PRICING.MESSAGE_CHANGES.FREE_PER_MONTH) {
    return 0;
  }
  return PRICING.MESSAGE_CHANGES.ADDITIONAL_COST;
}

/**
 * Calculates the wallet deposit amount with bonus
 */
export function calculateWalletDeposit(amount: number): {
  depositAmount: number;
  bonusAmount: number;
  totalCredit: number;
  description: string;
} {
  const bonus = PRICING.WALLET_DEPOSITS[amount as keyof typeof PRICING.WALLET_DEPOSITS];

  if (bonus) {
    return {
      depositAmount: amount,
      bonusAmount: bonus.bonus,
      totalCredit: amount + bonus.bonus,
      description: bonus.description,
    };
  }

  // No bonus for other amounts
  return {
    depositAmount: amount,
    bonusAmount: 0,
    totalCredit: amount,
    description: 'Standard deposit',
  };
}

/**
 * Converts number to Decimal for Prisma
 */
export function toDecimal(value: number): Decimal {
  return new Decimal(value);
}

/**
 * Converts Decimal to number
 */
export function fromDecimal(value: Decimal): number {
  return value.toNumber();
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number | Decimal): string {
  const num = typeof amount === 'number' ? amount : fromDecimal(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

/**
 * Processes one-time setup fee from wallet
 */
export async function processSetupFee(userId: string): Promise<number> {
  const { debitWallet } = await import('./wallet');
  return await debitWallet({
    userId,
    amount: PRICING.SETUP_FEE,
    description: 'One-time setup fee',
  });
}

