'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Invalid password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Admin Access
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Snap Calls Control Panel
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password || loading}
              className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">
              Snap Calls Admin v1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
