'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  DollarSign,
  Phone,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Wallet,
  LogOut,
  RefreshCw,
} from 'lucide-react';

interface Metrics {
  users: {
    total: number;
    basic: number;
    snapLine: number;
    active: number;
    paused: number;
    suspended: number;
    todaySignups: number;
    monthSignups: number;
  };
  abusePrevention: {
    at10Calls: number;
    at15Calls: number;
    at20Calls: number;
    suspended: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    monthUsageRevenue: number;
    todayRevenue: number;
    totalRevenue: number;
  };
  calls: {
    total: number;
    today: number;
    month: number;
  };
  costs: {
    estimated: number;
    profitMargin: string;
  };
  problems: {
    lowBalance: number;
    failedPayments: number;
    inactive: number;
  };
  wallet: {
    totalBalance: number;
  };
  timestamp: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/alerts'),
      ]);
      
      if (!metricsRes.ok || !alertsRes.ok) throw new Error('Failed to fetch');
      
      const metricsData = await metricsRes.json();
      const alertsData = await alertsRes.json();
      
      setMetrics(metricsData);
      setAlerts(alertsData.alerts);
      setError('');
    } catch (err) {
      setError('Failed to load metrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading metrics...</div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error || 'No data available'}</div>
      </div>
    );
  }

  const hasProblems =
    metrics.problems.lowBalance > 0 ||
    metrics.problems.failedPayments > 0 ||
    metrics.problems.inactive > 5;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Snap Calls Admin</h1>
              <p className="text-gray-400 text-sm mt-1">
                Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchMetrics();
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Auto-refresh</span>
              </label>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* NAVIGATION */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/users')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Users className="w-5 h-5" />
            <span>Manage Users</span>
          </button>
        </div>

        {/* REAL-TIME ALERTS */}
        {alerts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">🚨 Active Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg p-4 border-l-4 ${
                    alert.level === 'critical'
                      ? 'bg-red-900/30 border-red-500'
                      : alert.level === 'warning'
                      ? 'bg-yellow-900/30 border-yellow-500'
                      : 'bg-blue-900/30 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{alert.title}</h3>
                      <p className="text-sm text-gray-300">{alert.message}</p>
                    </div>
                    {alert.count && (
                      <div className="text-3xl font-bold opacity-50">
                        {alert.count}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CRITICAL ALERTS */}
        {hasProblems && (
          <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-6">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-red-200">⚠️ ATTENTION NEEDED</h2>
                <p className="text-red-300 text-sm mt-1">Issues requiring immediate action</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.problems.failedPayments > 0 && (
                <div className="bg-red-800/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-200">
                    {metrics.problems.failedPayments}
                  </div>
                  <div className="text-red-300 text-sm">Failed Payments</div>
                </div>
              )}
              {metrics.problems.lowBalance > 0 && (
                <div className="bg-yellow-800/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-200">
                    {metrics.problems.lowBalance}
                  </div>
                  <div className="text-yellow-300 text-sm">Low Balance Users</div>
                </div>
              )}
              {metrics.problems.inactive > 5 && (
                <div className="bg-orange-800/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-orange-200">
                    {metrics.problems.inactive}
                  </div>
                  <div className="text-orange-300 text-sm">Inactive Users (30d)</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KEY METRICS */}
        <div>
          <h2 className="text-2xl font-bold mb-4">📊 Today's Snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* New Signups */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-cyan-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold">{metrics.users.todaySignups}</div>
                  <div className="text-sm text-gray-400">New Signups</div>
                </div>
              </div>
            </div>

            {/* MRR */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold">${metrics.revenue.mrr}</div>
                  <div className="text-sm text-gray-400">MRR</div>
                </div>
              </div>
            </div>

            {/* Today's Revenue */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold">${metrics.revenue.todayRevenue.toFixed(2)}</div>
                  <div className="text-sm text-gray-400">Today's Revenue</div>
                </div>
              </div>
            </div>

            {/* Active Users */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-purple-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold">{metrics.users.active}</div>
                  <div className="text-sm text-gray-400">Active Users</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AUTO-UPGRADE FUNNEL */}
        <div>
          <h2 className="text-2xl font-bold mb-4">🚨 Abuse Prevention Tracking</h2>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400">
                  {metrics.abusePrevention.at10Calls}
                </div>
                <div className="text-sm text-gray-400 mt-2">At 10+ Calls</div>
                <div className="text-xs text-yellow-400 mt-1">👀 Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-400">
                  {metrics.abusePrevention.at15Calls}
                </div>
                <div className="text-sm text-gray-400 mt-2">At 15+ Calls</div>
                <div className="text-xs text-orange-400 mt-1">⚠️ Warning Sent</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-red-400">
                  {metrics.abusePrevention.at20Calls}
                </div>
                <div className="text-sm text-gray-400 mt-2">At 20+ Calls</div>
                <div className="text-xs text-red-400 mt-1">🚫 Suspended</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">
                  {metrics.snapLine}
                </div>
                <div className="text-sm text-gray-400 mt-2">Total SnapLine</div>
                <div className="text-xs text-green-400 mt-1">💰 ${metrics.snapLine * 20} MRR</div>
              </div>
            </div>
          </div>
        </div>

        {/* REVENUE & COSTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span>Revenue Breakdown</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">MRR (Subscriptions)</span>
                <span className="font-bold">${metrics.revenue.mrr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Usage Revenue (Month)</span>
                <span className="font-bold">${metrics.revenue.monthUsageRevenue.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-700 pt-4 flex justify-between">
                <span className="text-gray-400">Total Monthly Revenue</span>
                <span className="font-bold text-green-400 text-xl">
                  ${metrics.revenue.totalRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ARR (Run Rate)</span>
                <span className="font-bold text-cyan-400 text-xl">
                  ${metrics.revenue.arr.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Money Printer Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5 text-cyan-400" />
              <span>Money Printer Status</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Calls This Month</span>
                <span className="font-bold">{metrics.calls.month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estimated SMS Cost</span>
                <span className="font-bold">${metrics.costs.estimated.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Revenue from Calls</span>
                <span className="font-bold">${metrics.revenue.monthUsageRevenue.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-700 pt-4 flex justify-between">
                <span className="text-gray-400">Profit Margin</span>
                <span className="font-bold text-green-400 text-xl">
                  {metrics.costs.profitMargin}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* USER STATS */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>User Statistics</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold">{metrics.users.total}</div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">{metrics.users.basic}</div>
              <div className="text-sm text-gray-400">Basic Plan</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">{metrics.users.snapLine}</div>
              <div className="text-sm text-gray-400">SnapLine</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">{metrics.users.monthSignups}</div>
              <div className="text-sm text-gray-400">Month Signups</div>
            </div>
          </div>
        </div>

        {/* WALLET STATUS */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-yellow-400" />
            <span>Wallet Status</span>
          </h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-3xl font-bold text-yellow-400">
                ${metrics.wallet.totalBalance.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Total in User Wallets</div>
            </div>
            <div className="text-right">
              <div className="text-lg text-gray-400">Cash Flow Health</div>
              <div className="text-2xl font-bold text-green-400">
                {metrics.wallet.totalBalance > 1000 ? <CheckCircle className="inline w-6 h-6" /> : <XCircle className="inline w-6 h-6 text-red-400" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
