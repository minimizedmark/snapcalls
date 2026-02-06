# Wallet-First Flow Update

## Date: February 6, 2026

## Overview
Changed the onboarding flow from direct $5 charge for phone numbers to a wallet-first approach where users must load funds into their wallet first, with bonus incentives for larger deposits.

---

## Changes Made

### 1. ✅ Updated Wallet Deposit Bonus Tiers

**File:** `src/lib/pricing.ts`

Updated the bonus structure to match correct percentages:
- **$20**: No bonus (0%) - Minimum deposit
- **$30**: $4.50 bonus (15%)
- **$50**: $12.50 bonus (25%)
- **$100**: $50 bonus (50%)

### 2. ✅ Fixed Stripe Publishable Key Issue

**File:** `src/app/onboarding/page.tsx`

Fixed the environment variable handling that was causing the 401 error. The key was being passed incorrectly as `STRIPE_PUBLISHABLE_KEY=pk_live...` instead of just the key value. Now properly checks for the key before initializing Stripe.

```typescript
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!stripeKey) {
  console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
}
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;
```

### 3. ✅ Redesigned Onboarding Flow

**File:** `src/app/onboarding/page.tsx`

**Old Flow:**
1. Enter business info
2. Pay $5 directly for number via Stripe
3. Complete

**New Flow:**
1. Enter business info
2. Deposit into wallet (minimum $20, with bonus options)
3. After payment succeeds, automatically deduct $5 from wallet for number
4. Complete

**Key Changes:**
- Added deposit amount selection with visual cards showing bonuses
- Shows total credit user will receive (deposit + bonus)
- Shows remaining balance after $5 number setup fee
- Payment button now says "Deposit $X (Get $Y credit)"
- After successful payment, automatically calls `/api/number/purchase` to provision the number from wallet balance

### 4. ✅ Updated Number Purchase Route

**File:** `src/app/api/number/purchase/route.ts`

**Before:** Created a Stripe payment intent for $5

**After:** Debits $5 from user's wallet balance

**Key Changes:**
- Removed Stripe payment intent creation
- Added wallet balance check (must have at least $5)
- Uses `debitWallet()` to deduct the setup fee
- Returns clear error if insufficient funds
- Immediately provisions the number after wallet debit
- Sends confirmation email with setup summary

### 5. ✅ Updated Wallet Deposit Route

**File:** `src/app/api/wallet/deposit/route.ts`

**Added:**
- Validation for deposit amounts (must be $20, $30, $50, or $100)
- Imports PRICING constant for validation
- Stores amount in payment intent metadata

### 6. ✅ Updated Stripe Webhook

**File:** `src/app/api/webhooks/stripe/route.ts`

**Changes:**
- Removed conditional logic for `number_purchase` payment type
- All payment intents are now treated as wallet deposits
- Commented out old `handleNumberPurchase()` function (kept for reference)
- Webhook now only handles wallet deposits, then number provisioning happens via API call

---

## User Flow Summary

### Step 1: Business Information
User enters:
- Business name
- Opening hours
- Closing hours

### Step 2: Wallet Deposit
User sees:
- 4 deposit options in a grid layout
- Each card shows:
  - Deposit amount
  - Total credit they'll receive
  - Bonus badge (if applicable)
- Info box showing their balance after the $5 deduction
- Area code input (optional)

**Deposit Options:**
```
┌─────────────┐  ┌─────────────┐
│    $20      │  │    $30      │
│             │  │  [15% bonus]│
│ = $20 credit│  │ = $34.50    │
└─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐
│    $50      │  │   $100      │
│  [25% bonus]│  │  [50% bonus]│
│ = $62.50    │  │ = $150      │
└─────────────┘  └─────────────┘
```

### Step 3: Payment
- Stripe Payment Element loads
- Button shows: "Deposit $X (Get $Y credit)"
- On success:
  1. Webhook credits wallet with bonus
  2. Frontend calls `/api/number/purchase`
  3. API debits $5 from wallet
  4. Number is provisioned
  5. User moves to completion screen

### Step 4: Completion
Shows success message with remaining wallet balance

---

## Technical Benefits

1. **Simpler webhook logic** - Only handles wallet deposits
2. **Better user experience** - Clear incentive structure with bonuses
3. **More flexible** - Users can add more funds later using same flow
4. **Atomic transactions** - Wallet debit and number provisioning in single API call
5. **Better error handling** - Clear messaging when insufficient funds

---

## Testing Checklist

- [ ] Test each deposit tier ($20, $30, $50, $100)
- [ ] Verify bonuses are calculated correctly
- [ ] Confirm wallet is credited via webhook
- [ ] Ensure number is provisioned after wallet deposit
- [ ] Test insufficient balance scenario
- [ ] Verify email confirmations are sent
- [ ] Check Stripe publishable key loads correctly
- [ ] Test area code preference
- [ ] Verify final wallet balance is correct

---

## Environment Variables Required

Make sure these are set:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Frontend
STRIPE_SECRET_KEY=sk_live_...                    # Backend
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook validation
```

---

## Notes

- The old `handleNumberPurchase()` function in the webhook is commented out but kept for reference
- Number purchase is now immediate (no webhook delay)
- Users must have at least $5 in wallet to purchase a number
- Minimum deposit is $20 (enforced in API)
