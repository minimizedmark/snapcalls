import Link from 'next/link';
import { Phone, Zap, DollarSign, MessageSquare, Users, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">Snap Calls</h1>
                <p className="text-sm text-cyan-500 font-medium">It&apos;s a snap</p>
              </div>
            </div>
            <Link
              href="/login"
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl sm:text-6xl font-bold text-black mb-6">
            NEVER MISS ANOTHER CUSTOMER
          </h2>
          <p className="text-xl sm:text-2xl text-gray-600 mb-4">
            It&apos;s a snap to set up. It&apos;s a snap to never lose a call.
          </p>
          <p className="text-lg text-gray-500 mb-12">
            Snap Calls - automated missed call responses for your business.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-lg font-semibold"
          >
            Get Started - It&apos;s a Snap!
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-black mb-3">Instant Response</h3>
            <p className="text-gray-600">
              Automatically respond to missed calls with custom SMS messages. Your customers get an instant reply, every time.
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-black mb-3">Pay As You Go</h3>
            <p className="text-gray-600">
              Only $1 per call. No monthly fees, no contracts. Add funds to your wallet and only pay for what you use.
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-black mb-3">Custom Messages</h3>
            <p className="text-gray-600">
              Create personalized responses for different scenarios: standard, voicemail, and after-hours messages.
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-black mb-3">VIP Contacts</h3>
            <p className="text-gray-600">
              Mark important contacts as VIPs and track their calls. Give your best customers the attention they deserve.
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-black mb-3">Follow-Up Sequences</h3>
            <p className="text-gray-600">
              Automatically send follow-up messages to keep customers engaged. Build relationships on autopilot.
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-black mb-3">Business Hours</h3>
            <p className="text-gray-600">
              Set your business hours and send different messages during and after hours. Always stay professional.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-black rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Snap Back to Every Customer?
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Setup in a snap. Start responding to missed calls today.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-lg font-semibold"
          >
            Get Started Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Snap Calls. Never miss another customer.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
