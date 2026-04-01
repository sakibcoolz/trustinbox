'use client';

import { useState } from 'react';
import { Mail, Lock, ArrowRight, Building2, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { auth, profile as profileApi, type ProfileSP, ApiError } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setError('');
    try {
      await auth.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
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
          {forgotMode ? (
            /* ─── Forgot Password ─── */
            forgotSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-blue/10 flex items-center justify-center">
                  <Mail size={20} className="text-accent-blue" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Check your email</h2>
                <p className="text-sm text-text-muted mb-6">
                  If an account exists for <strong className="text-text-secondary">{forgotEmail}</strong>, we&apos;ve sent password reset instructions.
                </p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false); }}
                  className="text-sm text-accent-blue hover:underline">Back to sign in</button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-1">Reset password</h2>
                <p className="text-sm text-text-muted mb-6">Enter your email and we&apos;ll send reset instructions.</p>

                {error && (
                  <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                        placeholder="you@company.com" />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                    {forgotLoading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
                <p className="text-center text-xs text-text-muted mt-6">
                  <button onClick={() => { setForgotMode(false); setError(''); }} className="text-accent-blue hover:underline">Back to sign in</button>
                </p>
              </>
            )
          ) : (
            /* ─── Sign In ─── */
            <>
              <h2 className="text-lg font-semibold mb-1">Sign in</h2>
              <p className="text-sm text-text-muted mb-6">Access your service provider dashboard</p>

              {/* Dev credentials */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={() => { setEmail('demo@trustinbox.dev'); setPassword('Demo1234!'); }}
                  className="w-full mb-4 px-4 py-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg text-left hover:bg-accent-blue/10 transition-colors"
                >
                  <p className="text-xs font-medium text-accent-blue mb-1">Dev Credentials — click to fill</p>
                  <p className="text-xs text-text-muted font-mono">demo@trustinbox.dev &nbsp;/&nbsp; Demo1234!</p>
                </button>
              )}

              {error && (
                <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs text-text-muted">Password</label>
                    <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(email); setError(''); }}
                      className="text-xs text-accent-blue hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
