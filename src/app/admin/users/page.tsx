'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  businessName: string;
  phoneNumber: string;
  subscriptionType: string;
  subscriptionStatus: string | null;
  setupFeePaid: boolean;
  walletBalance: number;
  directCallsThisMonth: number;
  totalCalls: number;
  isActive: boolean;
  createdAt: string;
  stripeCustomerId: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: page.toString(),
        limit: '50',
        search,
      });

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filter, page]);

  const handleAction = async (userId: string, action: string, data?: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, data }),
      });

      if (res.ok) {
        fetchUsers(); // Refresh list
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const getStatusBadge = (user: User) => {
    if (!user.isActive || user.subscriptionStatus === 'paused') {
      return <span className="px-2 py-1 bg-red-900/50 text-red-200 text-xs rounded">Paused</span>;
    }
    if (user.subscriptionType === 'PUBLIC_LINE') {
      return <span className="px-2 py-1 bg-green-900/50 text-green-200 text-xs rounded">Public Line</span>;
    }
    return <span className="px-2 py-1 bg-cyan-900/50 text-cyan-200 text-xs rounded">Basic</span>;
  };

  const getUpgradeStatus = (user: User) => {
    if (user.subscriptionType === 'PUBLIC_LINE') return null;
    if (user.directCallsThisMonth >= 20) {
      return <span className="text-red-400 text-xs">🚨 Ready for upgrade!</span>;
    }
    if (user.directCallsThisMonth >= 10) {
      return <span className="text-yellow-400 text-xs">⚠️ {user.directCallsThisMonth} calls</span>;
    }
    return <span className="text-gray-500 text-xs">{user.directCallsThisMonth} calls</span>;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-gray-400 text-sm mt-1">View and manage all users</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                  placeholder="Search by email or business name..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Users' },
                { value: 'basic', label: 'Basic' },
                { value: 'public-line', label: 'Public Line' },
                { value: 'approaching-upgrade', label: '10+ Calls' },
                { value: 'ready-upgrade', label: '20+ Calls' },
                { value: 'paused', label: 'Paused' },
                { value: 'low-balance', label: 'Low Balance' },
                { value: 'incomplete-setup', label: 'Incomplete Setup' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setFilter(value);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === value
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Wallet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Calls</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Upgrade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-750">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-white">{user.businessName}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                          <div className="text-xs text-gray-500">{user.phoneNumber}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="px-4 py-4">
                        <div className={`font-medium ${user.walletBalance < 5 ? 'text-red-400' : 'text-green-400'}`}>
                          ${user.walletBalance.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-300">{user.totalCalls} total</div>
                      </td>
                      <td className="px-4 py-4">
                        {getUpgradeStatus(user)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          {user.isActive ? (
                            <button
                              onClick={() => handleAction(user.id, 'pause')}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Pause service"
                            >
                              <Pause className="w-4 h-4 text-yellow-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(user.id, 'resume')}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Resume service"
                            >
                              <Play className="w-4 h-4 text-green-400" />
                            </button>
                          )}
                          
                          {user.subscriptionType === 'BASIC' && user.directCallsThisMonth >= 20 && (
                            <button
                              onClick={() => handleAction(user.id, 'manual-upgrade')}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Manually upgrade to Public Line"
                            >
                              <TrendingUp className="w-4 h-4 text-cyan-400" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Add wallet funds"
                          >
                            <DollarSign className="w-4 h-4 text-green-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Wallet Funds Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Add Wallet Funds</h3>
            <p className="text-gray-400 mb-4">
              Adding funds to: <strong className="text-white">{selectedUser.businessName}</strong>
            </p>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat((e.target as any).amount.value);
                handleAction(selectedUser.id, 'add-wallet-funds', { amount });
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount to add ($)
                </label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  placeholder="10.00"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
