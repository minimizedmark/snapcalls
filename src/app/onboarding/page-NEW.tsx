'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Building2, Wallet, CheckCircle, DollarSign } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const WALLET_TIERS = [
  { amount: 20, bonus: 0, description: 'Minimum deposit' },
  { amount: 30, bonus: 5, description: '15% bonus' },
  { amount: 50, bonus: 10, description: '20% bonus' },
  { amount: 100, bonus: 50, description: '50% bonus!' },
];

function WalletDepositForm({ 
  amount, 
  onSuccess 
}: { 
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding?step=3`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setLoading(false);
    } else {
      // Payment succeeded
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Processing...' : `Add $${amount} to Wallet`}
      </button>
    </form>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Form data
  const [businessName, setBusinessName] = useState('');
  const [hoursStart, setHoursStart] = useState('09:00');
  const [hoursEnd, setHoursEnd] = useState('17:00');
  const [selectedTier, setSelectedTier] = useState(WALLET_TIERS[0]);

  // Check if setup fee already paid
  useEffect(() => {
    const checkSetupStatus = async () => {
      const res = await fetch('/api/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
        
        // If they already have balance, setup fee was paid
        if (data.balance > 0) {
          // Skip to step 3 (complete)
          setStep(3);
        }
      }
    };
    checkSetupStatus();
  }, []);

  const handleBusinessInfoNext = async () => {
    setLoading(true);
    
    // Save business info
    const res = await fetch('/api/onboarding/business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName,
        hoursStart,
        hoursEnd,
      }),
    });

    if (res.ok) {
      setStep(2);
    }
    
    setLoading(false);
  };

  const handleWalletDepositStart = async () => {
    setLoading(true);

    // Create payment intent for wallet deposit
    const res = await fetch('/api/wallet/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: selectedTier.amount }),
    });

    const data = await res.json();
    setClientSecret(data.clientSecret);
    setLoading(false);
  };

  const handlePaymentSuccess = async () => {
    // Payment succeeded, wait for webhook to credit wallet
    // Then deduct setup fee
    setLoading(true);

    // Poll wallet balance until it updates
    let attempts = 0;
    const checkBalance = setInterval(async () => {
      const res = await fetch('/api/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        if (data.balance >= 5 || attempts > 10) {
          clearInterval(checkBalance);
          
          // Deduct setup fee
          const setupRes = await fetch('/api/onboarding/setup-fee', {
            method: 'POST',
          });

          if (setupRes.ok) {
            const balanceRes = await fetch('/api/wallet/balance');
            const balanceData = await balanceRes.json();
            setWalletBalance(balanceData.balance);
            setStep(3);
          }
          
          setLoading(false);
        }
      }
      attempts++;
    }, 1000);
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  const getTotalCredits = (tier: typeof WALLET_TIERS[0]) => {
    return tier.amount + tier.bonus;
  };

  const getCreditsAfterSetup = (tier: typeof WALLET_TIERS[0]) => {
    return getTotalCredits(tier) - 5; // $5 setup fee
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Snap Calls</h1>
              <p className="text-sm text-cyan-500 font-medium">Setup in a snap</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex items-center ${i < 3 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= i
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {i}
                  </div>
                  {i < 3 && (
                    <div
                      className={`h-1 flex-1 mx-4 ${
                        step > i ? 'bg-cyan-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={step >= 1 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>
                Business Info
              </span>
              <span className={step >= 2 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>
                Fund Wallet
              </span>
              <span className={step >= 3 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>
                Complete
              </span>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Building2 className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">Tell us about your business</h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Acme HVAC"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opens At
                    </label>
                    <input
                      type="time"
                      value={hoursStart}
                      onChange={(e) => setHoursStart(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closes At
                    </label>
                    <input
                      type="time"
                      value={hoursEnd}
                      onChange={(e) => setHoursEnd(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={handleBusinessInfoNext}
                  disabled={!businessName || loading}
                  className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Wallet className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">Fund Your Wallet</h2>
                </div>

                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-cyan-900 mb-2">How it works</h3>
                  <ul className="text-sm text-cyan-800 space-y-1">
                    <li>• Minimum deposit: $20</li>
                    <li>• One-time setup fee: $5 (covers your phone number)</li>
                    <li>• Each missed call response: $1</li>
                    <li>• Bigger deposits = bonus credits!</li>
                  </ul>
                </div>

                {!clientSecret ? (
                  <>
                    <div className="space-y-3">
                      {WALLET_TIERS.map((tier) => (
                        <button
                          key={tier.amount}
                          onClick={() => setSelectedTier(tier)}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            selectedTier.amount === tier.amount
                              ? 'border-cyan-500 bg-cyan-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-lg">${tier.amount}</div>
                              <div className="text-sm text-gray-600">{tier.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Total credits</div>
                              <div className="font-bold text-cyan-600">
                                ${getTotalCredits(tier)}
                                {tier.bonus > 0 && (
                                  <span className="text-sm text-green-600 ml-1">
                                    (+${tier.bonus})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ${getCreditsAfterSetup(tier)} after setup fee
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>You'll get:</strong> ${getTotalCredits(selectedTier)} in credits
                        {selectedTier.bonus > 0 && ` (includes $${selectedTier.bonus} bonus)`}
                        <br />
                        <strong>After $5 setup fee:</strong> ${getCreditsAfterSetup(selectedTier)} available for calls
                      </p>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleWalletDepositStart}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {loading ? 'Loading...' : `Add $${selectedTier.amount}`}
                      </button>
                    </div>
                  </>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <WalletDepositForm 
                      amount={selectedTier.amount}
                      onSuccess={handlePaymentSuccess} 
                    />
                  </Elements>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="text-2xl font-bold">You're all set!</h2>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    Welcome to Snap Calls!
                  </h3>
                  <p className="text-green-800 mb-4">
                    Your account is ready and your number is being provisioned.
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <div className="text-2xl font-bold text-cyan-600 mb-1">
                      ${walletBalance.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Available wallet balance
                    </div>
                  </div>

                  <p className="text-sm text-green-700">
                    Next: Customize your message templates and start never missing another customer!
                  </p>
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-medium"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
