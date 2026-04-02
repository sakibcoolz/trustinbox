'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ArrowRight, Mail, Lock, User, Loader2, Building2, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { ROLE_LABELS } from '@/lib/roles';
import type { InvitationValidation } from '@/lib/graphql/types';

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { login: authLogin, isAuthenticated } = useAuth();
  const [step, setStep] = useState<'loading' | 'choice' | 'register' | 'login' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationValidation | null>(null);

  // Register form
  const [regForm, setRegForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Validate invitation on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/auth/invite/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setError(data.error || 'This invitation link is invalid or has expired.');
          setStep('error');
          return;
        }
        setInvitation(data);
        if (data.email) {
          setRegForm((prev) => ({ ...prev, email: data.email }));
          setLoginForm((prev) => ({ ...prev, email: data.email }));
        }
        if (isAuthenticated) {
          handleAcceptDirect();
          return;
        }
        setStep('choice');
      } catch {
        setError('Failed to validate invitation.');
        setStep('error');
      }
    }
    validate();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAcceptDirect() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep('success');
        toast.success('Invitation accepted!', `You've joined ${data.serviceProvider?.name || 'the organization'}.`);
      } else {
        throw new Error(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      setStep('error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcceptWithExisting() {
    setActionLoading(true);
    setError('');
    try {
      // Login via our cookie route
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
      });
      if (!loginRes.ok) {
        const loginData = await loginRes.json();
        throw new Error(loginData.error || 'Login failed');
      }
      authLogin();

      // Accept the invitation
      const acceptRes = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const acceptData = await acceptRes.json();
      if (acceptRes.ok && acceptData.success) {
        setStep('success');
        toast.success('Welcome!', `You've joined ${acceptData.serviceProvider?.name || 'the organization'}.`);
      } else {
        throw new Error(acceptData.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcceptWithNewAccount() {
    if (regForm.password !== regForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (regForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      // Register via our cookie route
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regForm.email,
          password: regForm.password,
          fullName: regForm.fullName,
          username: regForm.email.split('@')[0],
        }),
      });
      if (!regRes.ok) {
        const regData = await regRes.json();
        throw new Error(regData.error || 'Registration failed');
      }
      authLogin();

      // Accept the invitation
      const acceptRes = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const acceptData = await acceptRes.json();
      if (acceptRes.ok && acceptData.success) {
        setStep('success');
        toast.success('Account created!', `You've joined ${acceptData.serviceProvider?.name || 'the organization'}.`);
      } else {
        throw new Error(acceptData.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setActionLoading(false);
    }
  }

  const inputCls = 'w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active';

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-accent-blue mx-auto mb-3" />
          <p className="text-sm text-text-muted">Validating invitation…</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-full max-w-md text-center">
          <Card variant="default" padding="lg">
            <CheckCircle size={48} className="mx-auto text-status-success mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invitation Accepted</h2>
            <p className="text-sm text-text-muted mb-6">
              You have been added to <span className="text-text-primary font-medium">{invitation?.organizationName || 'the organization'}</span>. You can now access the provider portal.
            </p>
            <button onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
              Go to Dashboard <ArrowRight size={16} />
            </button>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-full max-w-md text-center">
          <Card variant="default" padding="lg">
            <XCircle size={48} className="mx-auto text-status-error mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-sm text-text-muted mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
            <button onClick={() => router.push('/auth/login')} className="text-accent-blue hover:underline text-sm">Go to Login</button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-accent-blue">TrustInbox</h1>
          <p className="text-text-muted text-sm mt-1">Team Invitation</p>
        </div>

        <Card variant="default" padding="lg">
          {/* Invitation details banner */}
          {invitation && (
            <div className="mb-6 px-4 py-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Building2 size={20} className="text-accent-blue shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{invitation.organizationName}</p>
                  {invitation.inviterName && (
                    <p className="text-xs text-text-muted mt-0.5">Invited by {invitation.inviterName}</p>
                  )}
                  {invitation.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-accent-purple/10 text-accent-purple">
                      {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS] || invitation.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
          )}

          {/* Choice step */}
          {step === 'choice' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-1">Accept Invitation</h2>
              <p className="text-sm text-text-muted mb-6">Choose how you would like to join:</p>

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
                    className={inputCls}
                    placeholder="you@company.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required
                    className={inputCls}
                    placeholder="••••••••" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('choice'); setError(''); }}
                  className="flex-1 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Back
                </button>
                <button type="submit" disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                  {actionLoading ? <><Loader2 size={16} className="animate-spin" /> Accepting…</> : 'Sign In & Accept'}
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
                    className={inputCls}
                    placeholder="Jane Smith" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="email" value={regForm.email} onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))} required
                    readOnly={!!invitation?.email}
                    className={`${inputCls} ${invitation?.email ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="jane@company.com" />
                </div>
                {invitation?.email && (
                  <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
                    <Shield size={10} /> Email is pre-filled from the invitation
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="password" value={regForm.password} onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))} required
                    className={inputCls}
                    placeholder="Min 8 characters" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="password" value={regForm.confirmPassword} onChange={(e) => setRegForm((p) => ({ ...p, confirmPassword: e.target.value }))} required
                    className={inputCls}
                    placeholder="••••••••" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('choice'); setError(''); }}
                  className="flex-1 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Back
                </button>
                <button type="submit" disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                  {actionLoading ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : 'Create & Accept'}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
