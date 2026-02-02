import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { fromDecimal, formatCurrency } from '@/lib/pricing';
import { Phone, DollarSign, MessageSquare, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch user data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      wallet: true,
      businessSettings: true,
      twilioConfig: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  // Check if onboarding is complete
  if (!user.businessSettings || !user.twilioConfig) {
    redirect('/onboarding');
  }

  // Fetch stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalCalls, todayCalls, weekCalls, walletBalance] = await Promise.all([
    prisma.callLog.count({
      where: { userId: user.id },
    }),
    prisma.callLog.count({
      where: {
        userId: user.id,
        timestamp: { gte: today },
      },
    }),
    prisma.callLog.count({
      where: {
        userId: user.id,
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    user.wallet ? fromDecimal(user.wallet.balance) : 0,
  ]);

  // Fetch recent calls
  const recentCalls = await prisma.callLog.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: 'desc' },
    take: 5,
    select: {
      id: true,
      callerNumber: true,
      callerName: true,
      timestamp: true,
      responseType: true,
      isVip: true,
      totalCost: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back to Snap Calls!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today&apos;s Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{todayCalls}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{weekCalls}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalCalls}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Wallet Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(walletBalance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentCalls.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No calls yet. Your missed calls will appear here.</p>
            </div>
          ) : (
            recentCalls.map((call) => (
              <div key={call.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">
                        {call.callerName || call.callerNumber}
                      </p>
                      {call.isVip && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(call.timestamp).toLocaleString()} • {call.responseType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(fromDecimal(call.totalCost))}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
