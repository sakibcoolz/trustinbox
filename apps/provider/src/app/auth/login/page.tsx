'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';
import { auth, profile } from '@/lib/api';
import { tokenManager } from '@/lib/token';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { ServiceProviderPicker } from '@/components/ServiceProviderPicker';
import type { ServiceProviderMembership } from '@/lib/graphql/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { login } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // SP picker state
  const [spList, setSPList] = useState<ServiceProviderMembership[]>([]);
  const [showSPPicker, setShowSPPicker] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Auto-focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Restore remembered email
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  function validateForm(): boolean {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = await auth.login(email, password);

      if (!data?.accessToken) {
        toast.error('Login failed', 'Invalid response from server');
        return;
      }

      const { accessToken, refreshToken } = data;
      login(accessToken, refreshToken);

      // Remember email
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Fetch service providers
      try {
        const spData = await profile.serviceProviders();
        const sps: ServiceProviderMembership[] = (spData?.serviceProviders || []).map((sp) => ({
          id: sp.id,
          name: sp.name,
          industry: sp.industry,
          role: sp.role,
          status: sp.verificationStatus,
        } as ServiceProviderMembership));

        if (sps.length > 1) {
          setSPList(sps);
          setShowSPPicker(true);
          return;
        }
        if (sps.length === 1) {
          tokenManager.setActiveSpId(sps[0].id);
        }
      } catch {
        // SP fetch failed — proceed without
      }

      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error('Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await auth.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      toast.error('Error', message);
    } finally {
      setForgotLoading(false);
    }
  }

  function selectSP(sp: ServiceProviderMembership) {
    tokenManager.setActiveSpId(sp.id);
    const redirect = searchParams.get('redirect') || '/';
    router.push(redirect);
  }

  // ─── SP Picker View ───────────────────────────────────
  if (showSPPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-accent-blue">TrustInbox</h1>
            <p className="text-text-muted text-sm mt-1">Provider Portal</p>
          </div>

          <Card variant="default" padding="lg">
            <h2 className="text-lg font-semibold mb-1">Select Organization</h2>
            <p className="text-sm text-text-muted mb-6">
              You belong to multiple organizations. Choose one to continue.
            </p>
            <ServiceProviderPicker spList={spList} onSelect={selectSP} />
          </Card>
        </div>
      </div>
    );
  }

  // ─── Login View ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-accent-blue">TrustInbox</h1>
          <p className="text-text-muted text-sm mt-1">Provider Portal</p>
        </div>

        <Card variant="default" padding="lg">
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
                <button
                  onClick={() => { setForgotMode(false); setForgotSent(false); }}
                  className="text-sm text-accent-blue hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-1">Reset password</h2>
                <p className="text-sm text-text-muted mb-6">Enter your email and we&apos;ll send reset instructions.</p>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send reset link'}
                  </button>
                </form>
                <p className="text-center text-xs text-text-muted mt-6">
                  <button onClick={() => { setForgotMode(false); setErrors({}); }} className="text-accent-blue hover:underline">
                    Back to sign in
                  </button>
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
                  onClick={() => { setEmail('demo@trustinbox.dev'); setPassword('Demo1234!'); setErrors({}); }}
                  className="w-full mb-4 px-4 py-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg text-left hover:bg-accent-blue/10 transition-colors"
                >
                  <p className="text-xs font-medium text-accent-blue mb-1">Dev Credentials — click to fill</p>
                  <p className="text-xs text-text-muted font-mono">demo@trustinbox.dev &nbsp;/&nbsp; Demo1234!</p>
                </button>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="you@company.com"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-status-error mt-1">{errors.email}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs text-text-muted">Password</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setForgotEmail(email); setErrors({}); }}
                      className="text-xs text-accent-blue hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                      className="w-full pl-10 pr-10 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-status-error mt-1">{errors.password}</p>}
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border-secondary accent-accent-blue"
                  />
                  <span className="text-xs text-text-muted">Remember me</span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={16} /></>}
                </button>
              </form>

              <p className="text-center text-xs text-text-muted mt-6">
                Don&apos;t have an account?{' '}
                <a href="/auth/register" className="text-accent-blue hover:underline">Register your organization</a>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
