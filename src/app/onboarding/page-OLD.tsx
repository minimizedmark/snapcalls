'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Building2, MessageSquare, CheckCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [businessName, setBusinessName] = useState('');
  const [hoursStart, setHoursStart] = useState('09:00');
  const [hoursEnd, setHoursEnd] = useState('17:00');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleComplete = async () => {
    setLoading(true);
    // TODO: Submit onboarding data
    // For now, just redirect
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
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
                Twilio Setup
              </span>
              <span className={step >= 3 ? 'text-cyan-600 font-medium' : 'text-gray-600'}>
                Messages
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
                  onClick={() => setStep(2)}
                  disabled={!businessName}
                  className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Phone className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">Connect your Twilio account</h2>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <strong>Need a Twilio account?</strong> Visit{' '}
                    <a
                      href="https://www.twilio.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      twilio.com
                    </a>{' '}
                    to sign up. It&apos;s free to get started!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account SID
                  </label>
                  <input
                    type="text"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auth Token
                  </label>
                  <input
                    type="password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Twilio Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!twilioSid || !twilioToken || !phoneNumber}
                    className="flex-1 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <MessageSquare className="w-6 h-6 text-cyan-500" />
                  <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    Setup Complete!
                  </h3>
                  <p className="text-green-800 mb-4">
                    Your Snap Calls account is ready to start responding to missed calls.
                  </p>
                  <p className="text-sm text-green-700">
                    Don&apos;t forget to add funds to your wallet and customize your
                    message templates in the dashboard.
                  </p>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Setting up...' : 'Go to Dashboard'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
