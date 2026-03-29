'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/inbox');
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-purple/5 rounded-full blur-3xl pointer-events-none" />

      <header className="border-b border-border-primary px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
          </div>
          <span className="text-base font-bold text-text-primary">TrustInbox</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost text-sm">
            Sign In
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="max-w-xl text-center space-y-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-glow">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-text-primary leading-tight">
              You decide who<br />contacts you.
            </h2>
            <p className="text-base text-text-secondary leading-relaxed max-w-md mx-auto">
              TrustInbox puts you in control of every call, message, and notification. Privacy-first. Consent-driven.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register" className="btn-primary px-8">
              Create Free Account
            </Link>
            <Link href="/auth/login" className="btn-secondary px-8">
              Sign In
            </Link>
          </div>
          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <span className="chip-blue text-2xs">End-to-End Encrypted</span>
            <span className="chip-green text-2xs">Verified Service Providers</span>
            <span className="chip-purple text-2xs">Policy Engine</span>
            <span className="chip-default text-2xs">RBAC</span>
          </div>
        </div>
      </main>
    </div>
  );
}
