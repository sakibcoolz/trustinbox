'use client';

import { useState } from 'react';
import { Building2, Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle, Globe, FileText } from 'lucide-react';
import { auth, ApiError } from '@/lib/api';

const TOTAL_STEPS = 3;

const stepMeta = [
  { title: 'Personal Information', desc: 'Create your admin account' },
  { title: 'Organization Details', desc: 'Tell us about your organization' },
  { title: 'Review & Confirm', desc: 'Verify your details before submission' },
];

const industries = [
  'Banking & Finance', 'Healthcare', 'Insurance', 'Real Estate',
  'Education', 'Telecommunications', 'E-Commerce', 'Government', 'Other',
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    orgName: '', industry: '', legalName: '', website: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  function validateStep(): boolean {
    if (step === 1) {
      if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
        setError('All fields are required');
        return false;
      }
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }
    if (step === 2) {
      if (!form.orgName || !form.industry) {
        setError('Organization name and industry are required');
        return false;
      }
    }
    return true;
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const data = await auth.register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        username: form.email.split('@')[0],
        orgName: form.orgName,
        industry: form.industry,
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
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
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} className={`w-8 h-1 rounded-full transition-colors ${step >= i + 1 ? 'bg-accent-blue' : 'bg-border-secondary'}`} />
              ))}
            </div>
            <span className="text-xs text-text-muted">Step {step} of {TOTAL_STEPS}</span>
          </div>

          <h2 className="text-lg font-semibold mb-1">{stepMeta[step - 1].title}</h2>
          <p className="text-sm text-text-muted mb-6">{stepMeta[step - 1].desc}</p>

          {error && (
            <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
          )}

          {/* Step 1: Personal info */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
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
                <p className="text-[11px] text-text-muted mt-1">Minimum 8 characters</p>
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

              <button type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
                Continue <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Step 2: Organization */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-4">
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
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="text" value={form.legalName} onChange={(e) => update('legalName', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="Acme Corporation Ltd." />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Website (optional)</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                    placeholder="https://acme.com" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border-secondary divide-y divide-border-secondary">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Admin Account</p>
                  <p className="text-sm font-medium">{form.fullName}</p>
                  <p className="text-xs text-text-muted">{form.email}</p>
                  <p className="text-xs text-text-muted mt-0.5">Username: <span className="font-mono">o/{form.email.split('@')[0]}</span></p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Organization</p>
                  <p className="text-sm font-medium">{form.orgName}</p>
                  <p className="text-xs text-text-muted">{form.industry}</p>
                  {form.legalName && <p className="text-xs text-text-muted">Legal: {form.legalName}</p>}
                  {form.website && <p className="text-xs text-text-muted">{form.website}</p>}
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Role</p>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-purple/10 text-accent-purple">SP_ADMIN</span>
                  <p className="text-xs text-text-muted mt-1">You will be the founding admin of this organization.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                  {loading ? 'Creating…' : 'Create Account'}
                  <CheckCircle size={16} />
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-text-muted mt-6">
            Already have an account?{' '}
            <a href="/auth/login" className="text-accent-blue hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
