'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const RESEND_COOLDOWN_S = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-request verification OTP on mount if we have an email
  useEffect(() => {
    if (emailParam) {
      sendOTP();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_S);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function sendOTP() {
    try {
      const res = await fetch('/api/gateway/auth/request-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setInfo(data.message || 'OTP sent to your email.');
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gateway/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      router.push('/inbox');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setInfo('');
    await sendOTP();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-green/5 rounded-full blur-3xl pointer-events-none" />

      <div className="card w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-accent-green to-accent-blue flex items-center justify-center shadow-glow">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Verify Email</h1>
          <p className="text-2xs text-text-muted">
            Enter the 6-digit code sent to{' '}
            <span className="text-text-secondary font-medium">{emailParam || 'your email'}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md px-4 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green text-sm rounded-md px-4 py-2">
            {info}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-text-secondary mb-1">
              OTP Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="input-field w-full tracking-widest text-center text-lg"
              autoComplete="one-time-code"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting || otp.length < 6}>
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="text-center">
          {cooldown > 0 ? (
            <p className="text-text-muted text-sm">Resend in {cooldown}s</p>
          ) : (
            <button
              onClick={handleResend}
              className="text-accent-blue hover:underline text-sm font-medium"
            >
              Resend OTP
            </button>
          )}
        </div>

        <p className="text-center text-text-muted text-2xs">
          <a href="/auth/login" className="text-accent-blue hover:underline font-medium">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
