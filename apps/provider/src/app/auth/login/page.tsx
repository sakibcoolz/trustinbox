'use client';

import { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-accent-blue">TrustInbox</h1>
          <p className="text-text-muted text-sm mt-1">Provider Portal</p>
        </div>

        <div className="bg-bg-card border border-border-primary rounded-xl p-8">
          <h2 className="text-lg font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-text-muted mb-6">Access your service provider dashboard</p>

          {error && (
            <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            Don&apos;t have an account?{' '}
            <a href="/auth/register" className="text-accent-blue hover:underline">Register your organization</a>
          </p>
        </div>
      </div>
    </div>
  );
}
