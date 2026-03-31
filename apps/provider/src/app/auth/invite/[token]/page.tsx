'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, Mail, Lock, User, Loader2 } from 'lucide-react';
import { auth, team, ApiError } from '@/lib/api';

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<'loading' | 'choice' | 'register' | 'login' | 'success' | 'error'>('choice');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register form
  const [regForm, setRegForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Resolve params (Next.js 15 async params)
  if (token === null) {
    params.then((p) => setToken(p.token));
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 size={24} className="animate-spin text-accent-blue" />
      </div>
    );
  }

  async function handleAcceptWithExisting() {
    setLoading(true);
    setError('');
    try {
      await auth.login(loginForm.email, loginForm.password).then((data) => {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      });
      await team.acceptInvitation(token!);
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptWithNewAccount() {
    if (regForm.password !== regForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await auth.register({
        email: regForm.email,
        password: regForm.password,
        fullName: regForm.fullName,
        username: regForm.email.split('@')[0],
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      await team.acceptInvitation(token!);
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-full max-w-md text-center">
          <div className="bg-bg-card border border-border-primary rounded-xl p-8">
            <CheckCircle size={48} className="mx-auto text-status-success mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invitation Accepted</h2>
            <p className="text-sm text-text-muted mb-6">You have been added to the organization. You can now access the provider portal.</p>
            <a href="/" className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
              Go to Dashboard <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-full max-w-md text-center">
          <div className="bg-bg-card border border-border-primary rounded-xl p-8">
            <XCircle size={48} className="mx-auto text-status-error mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-sm text-text-muted mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
            <a href="/auth/login" className="text-accent-blue hover:underline text-sm">Go to Login</a>
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
          <p className="text-text-muted text-sm mt-1">Team Invitation</p>
        </div>

        <div className="bg-bg-card border border-border-primary rounded-xl p-8">
          {error && (
            <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
          )}

          {/* Choice step */}
          {step === 'choice' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-1">Accept Invitation</h2>
              <p className="text-sm text-text-muted mb-6">You have been invited to join an organization on TrustInbox. Choose how to proceed:</p>

              <button onClick={() => setStep('login')}
                className="w-full flex items-center gap-3 px-4 py-3 border border-border-secondary rounded-lg hover:bg-bg-hover transition-colors text-left">
                <Mail size={20} className="text-accent-blue shrink-0" />
                <div>
                  <p className="text-sm font-medium">I have an account</p>
                  <p className="text-xs text-text-muted">Sign in with your existing credentials</p>
                </div>
              </button>

              <button onClick={() => setStep('register')}
                className="w-full flex items-center gap-3 px-4 py-3 border border-border-secondary rounded-lg hover:bg-bg-hover transition-colors text-left">
                <User size={20} className="text-accent-purple shrink-0" />
                <div>
                  <p className="text-sm font-medium">Create a new account</p>
                  <p className="text-xs text-text-muted">Register and join the organization</p>
                </div>
              </button>
            </div>
          )}

          {/* Login step */}
          {step === 'login' && (
            <form onSubmit={(e) => { e.preventDefault(); handleAcceptWithExisting(); }} className="space-y-4">
              <h2 className="text-lg font-semibold mb-1">Sign In & Accept</h2>
              <p className="text-sm text-text-muted mb-4">Sign in to link this invitation to your account.</p>

              <div>
                <label className="block text-xs text-text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="email" value={loginForm.email} onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="you@company.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="••••••••" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('choice'); setError(''); }}
                  className="flex-1 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                  {loading ? 'Accepting…' : 'Sign In & Accept'}
                </button>
              </div>
            </form>
          )}

          {/* Register step */}
          {step === 'register' && (
            <form onSubmit={(e) => { e.preventDefault(); handleAcceptWithNewAccount(); }} className="space-y-4">
              <h2 className="text-lg font-semibold mb-1">Create Account & Accept</h2>
              <p className="text-sm text-text-muted mb-4">Create your account to join the organization.</p>

              <div>
                <label className="block text-xs text-text-muted mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="text" value={regForm.fullName} onChange={(e) => setRegForm((p) => ({ ...p, fullName: e.target.value }))} required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="Jane Smith" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="email" value={regForm.email} onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))} required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="jane@company.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="password" value={regForm.password} onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))} required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="password" value={regForm.confirmPassword} onChange={(e) => setRegForm((p) => ({ ...p, confirmPassword: e.target.value }))} required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="••••••••" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('choice'); setError(''); }}
                  className="flex-1 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                  {loading ? 'Creating…' : 'Create & Accept'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
