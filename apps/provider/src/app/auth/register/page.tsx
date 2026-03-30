'use client';

import { useState } from 'react';
import { Building2, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    orgName: '', industry: '', legalName: '', website: '',
    fullName: '', email: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          username: form.email.split('@')[0],
          orgName: form.orgName,
          industry: form.industry,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Registration failed'); }
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/';
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  const industries = ['Banking & Finance', 'Healthcare', 'Insurance', 'Real Estate', 'Education', 'Telecommunications', 'E-Commerce', 'Government', 'Other'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-accent-blue">TrustInbox</h1>
          <p className="text-text-muted text-sm mt-1">Provider Portal</p>
        </div>

        <div className="bg-bg-card border border-border-primary rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex gap-1">
              <span className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-accent-blue' : 'bg-border-secondary'}`} />
              <span className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-accent-blue' : 'bg-border-secondary'}`} />
            </div>
            <span className="text-xs text-text-muted">Step {step} of 2</span>
          </div>

          <h2 className="text-lg font-semibold mb-1">{step === 1 ? 'Organization Details' : 'Admin Account'}</h2>
          <p className="text-sm text-text-muted mb-6">{step === 1 ? 'Tell us about your organization' : 'Create your admin account'}</p>

          {error && (
            <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Organization Name</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type="text" value={form.orgName} onChange={(e) => update('orgName', e.target.value)} required
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="Acme Corp" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Industry</label>
                  <select value={form.industry} onChange={(e) => update('industry', e.target.value)} required
                    className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                    <option value="">Select industry…</option>
                    {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Legal Name (optional)</label>
                  <input type="text" value={form.legalName} onChange={(e) => update('legalName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="Acme Corporation Ltd." />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Website (optional)</label>
                  <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="https://acme.com" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type="text" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="Jane Smith" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Work Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="jane@acme.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                      placeholder="••••••••" />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Back
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                {step === 1 ? 'Continue' : loading ? 'Creating…' : 'Create Account'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            Already have an account?{' '}
            <a href="/auth/login" className="text-accent-blue hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
