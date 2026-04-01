'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import {
  Building2, Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle,
  Globe, FileText, Upload, X, Shield, MapPin, Phone, Hash, AlertTriangle, Loader2,
} from 'lucide-react';
import { REGISTER_MUTATION } from '@/lib/graphql/auth';
import { tokenManager } from '@/lib/token';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { auth, ApiError, type RegisterPayload } from '@/lib/api';

const TOTAL_STEPS = 5;

const stepMeta = [
  { title: 'Personal Information', desc: 'Create your admin account' },
  { title: 'Organization Details', desc: 'Tell us about your organization' },
  { title: 'Legal Compliance', desc: 'Mandatory identification & regulatory details' },
  { title: 'Identity Documents', desc: 'Upload required proof of identity & registration' },
  { title: 'Review & Confirm', desc: 'Verify all details before submission' },
];

const industries = [
  'Banking & Finance', 'Healthcare', 'Insurance', 'Real Estate',
  'Education', 'Telecommunications', 'E-Commerce', 'Government', 'Other',
];

const proofIdTypes = [
  { value: 'BUSINESS_REGISTRATION', label: 'Business Registration Certificate' },
  { value: 'TAX_CERTIFICATE', label: 'Tax Identification Certificate' },
  { value: 'TRADE_LICENSE', label: 'Trade License' },
  { value: 'GOVT_ISSUED_ID', label: 'Government-Issued Photo ID (Director/Owner)' },
  { value: 'INCORPORATION_CERT', label: 'Certificate of Incorporation' },
  { value: 'GST_REGISTRATION', label: 'GST / VAT Registration' },
  { value: 'PROFESSIONAL_LICENSE', label: 'Professional License (Healthcare / Finance)' },
];

const countries = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'Singapore', 'UAE', 'Other',
];

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const { login: authLogin } = useAuth();
  const [registerMutation] = useMutation(REGISTER_MUTATION);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', username: '', password: '', confirmPassword: '',
    orgName: '', industry: '', legalName: '', website: '',
    registrationNumber: '', proofIdType: '', taxId: '',
    address: '', city: '', state: '', country: '', postalCode: '',
    phone: '', authorizedSignatory: '',
    termsAccepted: false,
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist form state in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('register-form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed }));
        if (parsed._step) setStep(parsed._step);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('register-form', JSON.stringify({ ...form, _step: step }));
  }, [form, step]);

  // Auto-generate username from email
  useEffect(() => {
    if (form.email && !form.username) {
      setForm((prev) => ({ ...prev, username: form.email.split('@')[0] }));
    }
  }, [form.email]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!ALLOWED_FILE_TYPES.includes(f.type)) {
        setError(`"${f.name}" is not a supported format. Use PDF, JPG, PNG, or WebP.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" exceeds 10 MB limit.`);
        return;
      }
      newFiles.push(f);
    }
    setDocuments((prev) => [...prev, ...newFiles]);
    setError('');
  }

  function removeFile(idx: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  }

  function validateStep(): boolean {
    if (step === 1) {
      if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
        setError('All fields are required');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        setError('Enter a valid email address');
        return false;
      }
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters');
        return false;
      }
      if (!/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
        setError('Password must include an uppercase letter, a number, and a special character');
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
    if (step === 3) {
      if (!form.registrationNumber) {
        setError('Business registration number is mandatory');
        return false;
      }
      if (!form.proofIdType) {
        setError('Select a proof of identity type');
        return false;
      }
      if (!form.country) {
        setError('Country is required');
        return false;
      }
      if (!form.address || !form.city) {
        setError('Registered address and city are required');
        return false;
      }
      if (!form.phone) {
        setError('Business phone number is required');
        return false;
      }
      if (!form.authorizedSignatory) {
        setError('Authorized signatory name is required');
        return false;
      }
    }
    if (step === 4) {
      if (documents.length === 0) {
        setError('At least one identity document is required by law');
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

  function friendlyError(raw: string): string {
    // Strip common backend prefixes like "[INVALID_INPUT]", "[NOT_FOUND]", etc.
    const cleaned = raw.replace(/^\[[\w_]+\]\s*/, '');

    const patterns: [RegExp, string][] = [
      [/username.*must match pattern/i, 'Username can only contain lowercase letters, numbers, dots, hyphens, and underscores (2–50 characters).'],
      [/email.*already.*exist/i, 'An account with this email already exists. Try signing in instead.'],
      [/username.*already.*exist/i, 'This username is already taken. Please choose a different one.'],
      [/password.*too short|password.*at least/i, 'Password must be at least 8 characters long.'],
      [/invalid.*email/i, 'Please enter a valid email address.'],
      [/organization.*already.*exist/i, 'An organization with this name already exists.'],
      [/invalid.*phone/i, 'Please enter a valid phone number.'],
      [/registration.*number.*invalid/i, 'The business registration number is invalid.'],
      [/document.*required/i, 'Please upload the required identity document.'],
      [/terms.*accepted/i, 'You must accept the Terms of Service to continue.'],
    ];

    for (const [regex, friendly] of patterns) {
      if (regex.test(cleaned)) return friendly;
    }

    // Fallback: return the cleaned version (without the code prefix) with first letter capitalized
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  async function handleSubmit() {
    if (!form.termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: RegisterPayload = {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        username: form.username || form.email.split('@')[0],
        orgName: form.orgName,
        industry: form.industry,
        legalName: form.legalName || undefined,
        website: form.website || undefined,
        registrationNumber: form.registrationNumber,
        proofIdType: form.proofIdType,
        taxId: form.taxId || undefined,
        address: form.address,
        city: form.city,
        state: form.state || undefined,
        country: form.country,
        postalCode: form.postalCode || undefined,
        phone: form.phone,
        authorizedSignatory: form.authorizedSignatory,
        termsAccepted: form.termsAccepted,
      };

      let data;
      if (documents.length > 0) {
        // Document upload requires multipart — use REST fallback
        data = await auth.registerWithDocuments(payload, documents);
      } else {
        // Use GraphQL for non-document registration
        try {
          const result = await registerMutation({ variables: { input: payload } });
          data = result.data?.register;
        } catch {
          // Fallback to REST if GraphQL fails
          data = await auth.register(payload);
        }
      }

      if (data?.accessToken) {
        authLogin(data.accessToken, data.refreshToken);
        sessionStorage.removeItem('register-form');
        toast.success('Organization registered successfully', 'Welcome to TrustInbox!');
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? friendlyError(err.message) : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active';
  const inputNoPadCls = 'w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-accent-blue">TrustInbox</h1>
          <p className="text-text-muted text-sm mt-1">Provider Portal — Organization Registration</p>
        </div>

        <Card variant="default" padding="lg">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} className={`flex-1 h-1 rounded-full transition-colors ${step > i + 1 ? 'bg-status-success' : step === i + 1 ? 'bg-accent-blue' : 'bg-border-secondary'}`} />
              ))}
            </div>
            <span className="text-xs text-text-muted whitespace-nowrap">Step {step}/{TOTAL_STEPS}</span>
          </div>

          <h2 className="text-lg font-semibold mb-1">{stepMeta[step - 1].title}</h2>
          <p className="text-sm text-text-muted mb-6">{stepMeta[step - 1].desc}</p>

          {error && (
            <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {/* ─── Step 1: Personal info ─── */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              <Field label="Full Name" icon={User}>
                <input type="text" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required className={inputCls} placeholder="Jane Smith" />
              </Field>
              <Field label="Work Email" icon={Mail}>
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required className={inputCls} placeholder="jane@acme.com" />
              </Field>
              <Field label="Username" icon={User}>
                <input type="text" value={form.username} onChange={(e) => update('username', e.target.value)} required className={inputCls} placeholder="jane.smith" />
              </Field>
              <div>
                <Field label="Password" icon={Lock}>
                  <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required className={inputCls} placeholder="••••••••" />
                </Field>
                <PasswordStrength password={form.password} />
                <p className="text-[11px] text-text-muted mt-1">Min 8 chars, 1 uppercase, 1 number, 1 special character</p>
              </div>
              <Field label="Confirm Password" icon={Lock}>
                <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required className={inputCls} placeholder="••••••••" />
              </Field>
              <NextButton />
            </form>
          )}

          {/* ─── Step 2: Organization ─── */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-4">
              <Field label="Organization Name *" icon={Building2}>
                <input type="text" value={form.orgName} onChange={(e) => update('orgName', e.target.value)} required className={inputCls} placeholder="Acme Corp" />
              </Field>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Industry *</label>
                <select value={form.industry} onChange={(e) => update('industry', e.target.value)} required className={inputNoPadCls}>
                  <option value="">Select industry…</option>
                  {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <Field label="Legal Entity Name" icon={FileText}>
                <input type="text" value={form.legalName} onChange={(e) => update('legalName', e.target.value)} className={inputCls} placeholder="Acme Corporation Ltd." />
              </Field>
              <Field label="Website" icon={Globe}>
                <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)} className={inputCls} placeholder="https://acme.com" />
              </Field>
              <StepNav onBack={() => setStep(1)} />
            </form>
          )}

          {/* ─── Step 3: Legal Compliance ─── */}
          {step === 3 && (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="px-3 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-lg mb-2">
                <p className="text-xs text-accent-blue flex items-center gap-1.5"><Shield size={12} /> All fields marked * are mandatory as per regulatory requirements.</p>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1.5">Proof of Identity Type *</label>
                <select value={form.proofIdType} onChange={(e) => update('proofIdType', e.target.value)} required className={inputNoPadCls}>
                  <option value="">Select ID proof type…</option>
                  {proofIdTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <Field label="Business Registration Number *" icon={Hash}>
                <input type="text" value={form.registrationNumber} onChange={(e) => update('registrationNumber', e.target.value)} required className={inputCls} placeholder="e.g. CIN, EIN, Company No." />
              </Field>
              <Field label="Tax ID / GST / VAT Number" icon={Hash}>
                <input type="text" value={form.taxId} onChange={(e) => update('taxId', e.target.value)} className={inputCls} placeholder="e.g. GSTIN, TIN, VAT" />
              </Field>
              <Field label="Authorized Signatory Name *" icon={User}>
                <input type="text" value={form.authorizedSignatory} onChange={(e) => update('authorizedSignatory', e.target.value)} required className={inputCls} placeholder="Legal representative's full name" />
              </Field>
              <Field label="Business Phone *" icon={Phone}>
                <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} required className={inputCls} placeholder="+1 555-123-4567" />
              </Field>

              <div className="border-t border-border-secondary pt-4 mt-2">
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-3">Registered Address *</p>
                <div className="space-y-3">
                  <Field label="Street Address *" icon={MapPin}>
                    <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} required className={inputCls} placeholder="123 Business Ave, Suite 100" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1.5">City *</label>
                      <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} required className={inputNoPadCls} placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1.5">State / Province</label>
                      <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)} className={inputNoPadCls} placeholder="State" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1.5">Country *</label>
                      <select value={form.country} onChange={(e) => update('country', e.target.value)} required className={inputNoPadCls}>
                        <option value="">Select…</option>
                        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1.5">Postal Code</label>
                      <input type="text" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} className={inputNoPadCls} placeholder="Zip / Pin" />
                    </div>
                  </div>
                </div>
              </div>

              <StepNav onBack={() => setStep(2)} />
            </form>
          )}

          {/* ─── Step 4: Document Upload ─── */}
          {step === 4 && (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="px-3 py-2 bg-status-warning/5 border border-status-warning/20 rounded-lg">
                <p className="text-xs text-status-warning flex items-center gap-1.5">
                  <AlertTriangle size={12} /> At least one identity/proof document is required by law.
                </p>
              </div>

              <p className="text-xs text-text-muted">
                Upload a scanned copy or photo of your <strong>{proofIdTypes.find((t) => t.value === form.proofIdType)?.label || 'proof document'}</strong>.
                Accepted formats: PDF, JPG, PNG, WebP. Max 10 MB per file.
              </p>

              {/* Upload area */}
              <div
                className="border-2 border-dashed border-border-secondary rounded-lg p-6 text-center hover:border-accent-blue/40 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              >
                <Upload size={28} className="mx-auto text-text-muted mb-2" />
                <p className="text-sm text-text-secondary">Drag & drop files here or click to browse</p>
                <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG, WebP — up to 10 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-bg-secondary border border-border-secondary rounded-lg">
                      <FileText size={14} className="text-text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={() => removeFile(i)} className="p-1 hover:bg-bg-hover rounded">
                        <X size={14} className="text-text-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <StepNav onBack={() => setStep(3)} />
            </form>
          )}

          {/* ─── Step 5: Review & Confirm ─── */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border-secondary divide-y divide-border-secondary">
                <ReviewSection title="Admin Account">
                  <p className="text-sm font-medium">{form.fullName}</p>
                  <p className="text-xs text-text-muted">{form.email}</p>
                  <p className="text-xs text-text-muted mt-0.5">Username: <span className="font-mono">o/{form.username || form.email.split('@')[0]}</span></p>
                </ReviewSection>
                <ReviewSection title="Organization">
                  <p className="text-sm font-medium">{form.orgName}</p>
                  <p className="text-xs text-text-muted">{form.industry}</p>
                  {form.legalName && <p className="text-xs text-text-muted">Legal: {form.legalName}</p>}
                  {form.website && <p className="text-xs text-text-muted">{form.website}</p>}
                </ReviewSection>
                <ReviewSection title="Legal & Compliance">
                  <p className="text-xs text-text-muted">ID Type: <span className="text-text-secondary">{proofIdTypes.find((t) => t.value === form.proofIdType)?.label}</span></p>
                  <p className="text-xs text-text-muted">Reg #: <span className="font-mono text-text-secondary">{form.registrationNumber}</span></p>
                  {form.taxId && <p className="text-xs text-text-muted">Tax ID: <span className="font-mono text-text-secondary">{form.taxId}</span></p>}
                  <p className="text-xs text-text-muted">Signatory: <span className="text-text-secondary">{form.authorizedSignatory}</span></p>
                  <p className="text-xs text-text-muted">Phone: {form.phone}</p>
                  <p className="text-xs text-text-muted mt-1">{form.address}, {form.city}{form.state ? `, ${form.state}` : ''}, {form.country} {form.postalCode}</p>
                </ReviewSection>
                <ReviewSection title="Documents">
                  <div className="space-y-1">
                    {documents.map((f, i) => (
                      <p key={i} className="text-xs text-text-secondary flex items-center gap-1.5">
                        <FileText size={12} className="text-text-muted" /> {f.name} <span className="text-text-muted">({(f.size / 1024).toFixed(0)} KB)</span>
                      </p>
                    ))}
                  </div>
                </ReviewSection>
                <ReviewSection title="Role">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-purple/10 text-accent-purple">SP_ADMIN</span>
                  <p className="text-xs text-text-muted mt-1">You will be the founding admin of this organization.</p>
                </ReviewSection>
              </div>

              {/* Terms acceptance */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)}
                  className="mt-0.5 rounded border-border-secondary accent-accent-blue" />
                <span className="text-xs text-text-muted leading-relaxed">
                  I confirm that the information provided is accurate and complete. I agree to the{' '}
                  <span className="text-accent-blue">Terms of Service</span>,{' '}
                  <span className="text-accent-blue">Privacy Policy</span>, and consent to identity verification as required by applicable law.
                </span>
              </label>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(4)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading || !form.termsAccepted}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <>Create Account <CheckCircle size={16} /></>}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-text-muted mt-6">
            Already have an account?{' '}
            <a href="/auth/login" className="text-accent-blue hover:underline">Sign in</a>
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ──────────────────────────── */

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ size: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        {children}
      </div>
    </div>
  );
}

function NextButton() {
  return (
    <button type="submit"
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
      Continue <ArrowRight size={16} />
    </button>
  );
}

function StepNav({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onBack}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft size={16} /> Back
      </button>
      <button type="submit"
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
        Continue <ArrowRight size={16} />
      </button>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{title}</p>
      {children}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-status-error', 'bg-status-warning', 'bg-accent-blue', 'bg-status-success'];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score - 1] : 'bg-border-secondary'}`} />
        ))}
      </div>
      <p className={`text-[11px] mt-1 ${score <= 1 ? 'text-status-error' : score === 2 ? 'text-status-warning' : score === 3 ? 'text-accent-blue' : 'text-status-success'}`}>
        {labels[score - 1] || ''}
      </p>
    </div>
  );
}
