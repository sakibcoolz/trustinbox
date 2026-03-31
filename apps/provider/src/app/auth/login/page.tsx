'use client';

import { useState } from 'react';
import { Mail, Lock, ArrowRight, Building2, Check } from 'lucide-react';
import { auth, profile as profileApi, type ProfileSP, ApiError } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // SP selection state
  const [spList, setSPList] = useState<ProfileSP[]>([]);
  const [showSPPicker, setShowSPPicker] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await auth.login(email, password);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      // Check if user belongs to multiple SPs
      try {
        const spRes = await profileApi.serviceProviders();
        const sps = spRes.serviceProviders || [];
        if (sps.length > 1) {
          setSPList(sps);
          localStorage.setItem('userSPs', JSON.stringify(sps));
          setShowSPPicker(true);
          return;
        }
        if (sps.length === 1) {
          localStorage.setItem('activeSpId', sps[0].id);
          localStorage.setItem('userSPs', JSON.stringify(sps));
        }
      } catch {
        // SP fetch failed — proceed without SP context
      }

      window.location.href = '/';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function selectSP(sp: ProfileSP) {
    localStorage.setItem('activeSpId', sp.id);
    window.location.href = '/';
  }

  if (showSPPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-accent-blue">TrustInbox</h1>
            <p className="text-text-muted text-sm mt-1">Provider Portal</p>
          </div>

          <div className="bg-bg-card border border-border-primary rounded-xl p-8">
            <h2 className="text-lg font-semibold mb-1">Select Organization</h2>
            <p className="text-sm text-text-muted mb-6">You belong to multiple organizations. Choose one to continue.</p>

            <div className="space-y-2">
              {spList.map((sp) => (
                <button key={sp.id} onClick={() => selectSP(sp)}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-border-secondary rounded-lg hover:bg-bg-hover hover:border-accent-blue/30 transition-colors text-left group">
                  <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-semibold shrink-0">
                    {sp.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{sp.name}</p>
                    <p className="text-xs text-text-muted">
                      {sp.industry} · <span className="capitalize">{sp.role.replace('_', ' ').toLowerCase()}</span>
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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
