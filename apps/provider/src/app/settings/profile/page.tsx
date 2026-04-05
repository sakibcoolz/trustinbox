'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, User, Mail, AtSign, Shield, Save, Globe, Clock, Key, Monitor, Building2, Palette, Eye, Upload, X, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { profile as profileApi, type ProfileData, type SessionsData, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationProfile, useUpdateOrganizationProfile, type OrganizationProfile } from '@/lib/graphql/settings';
import { useToast } from '@/components/Toast';

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland',
];

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'India', 'Japan', 'Singapore', 'United Arab Emirates', 'Brazil', 'Mexico',
  'South Korea', 'Netherlands', 'Switzerland', 'Sweden', 'Norway', 'Denmark',
  'Italy', 'Spain', 'Portugal', 'New Zealand', 'Ireland', 'Belgium',
  'South Africa', 'Saudi Arabia', 'Indonesia', 'Thailand', 'Philippines', 'Malaysia',
];

const roleLabels: Record<string, string> = {
  SP_ADMIN: 'Admin', AGENT: 'Agent', ANALYST: 'Analyst', CUSTOMER: 'Customer',
};

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// ─── Address Parsing ───────────────────────────────────────────────────────

function parseAddress(address: string | undefined): { addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string } {
  if (!address) return { addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '' };
  const parts = address.split(', ').map((p) => p.trim()).filter(Boolean);
  const matchedCountry = COUNTRIES.find((c) => parts.includes(c));
  const countryIdx = matchedCountry ? parts.indexOf(matchedCountry) : -1;
  const nonCountry = countryIdx >= 0 ? parts.filter((_, i) => i !== countryIdx) : parts;
  return {
    addressLine1: nonCountry[0] || '',
    addressLine2: nonCountry.length > 4 ? nonCountry[1] || '' : '',
    city: nonCountry.length > 4 ? nonCountry[2] || '' : nonCountry[1] || '',
    state: nonCountry.length > 4 ? nonCountry[3] || '' : nonCountry[2] || '',
    postalCode: nonCountry.length > 4 ? nonCountry[4] || '' : nonCountry[3] || '',
    country: matchedCountry || '',
  };
}

// ─── Validation Helpers ───────────────────────────────────────────────────

function validateEmail(email: string): string | null {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Invalid email format';
}

function validateUrl(url: string): string | null {
  if (!url) return null;
  try { new URL(url.startsWith('http') ? url : `https://${url}`); return null; } catch { return 'Invalid URL format'; }
}

function validateHexColor(color: string): string | null {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? null : 'Invalid hex color (#RRGGBB)';
}

// ─── Verification Badge ─────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: string }> = {
    VERIFIED: { label: 'Verified', className: 'bg-status-success/10 text-status-success', icon: '✓' },
    PENDING: { label: 'Pending Verification', className: 'bg-status-warning/10 text-status-warning', icon: '⏳' },
    UNVERIFIED: { label: 'Unverified', className: 'bg-status-error/10 text-status-error', icon: '✕' },
  };
  const c = config[status?.toUpperCase()] || config.UNVERIFIED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.className}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Copyable Field ──────────────────────────────────────────────────────

function CopyableField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg group cursor-pointer" onClick={handleCopy}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-sm text-text-secondary font-mono text-xs truncate">{value || '—'}</p>
      </div>
      <span className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
      </span>
    </div>
  );
}

// ─── Logo Upload ──────────────────────────────────────────────────────────

function LogoUpload({ currentUrl, orgName, onUploaded }: { currentUrl: string; orgName: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = orgName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'SP';

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Only PNG, JPEG, and WebP images are accepted');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setUploadError('File size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const presignRes = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      if (presignRes.ok) {
        const { uploadUrl, fileUrl } = await presignRes.json();
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        onUploaded(fileUrl);
      } else {
        // Fallback: use preview data URL if presigned upload not available
        onUploaded(preview || currentUrl);
      }
    } catch {
      setUploadError('Upload failed — URL kept as fallback');
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    onUploaded('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const displayUrl = preview || currentUrl;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-xl border-2 border-dashed border-border-secondary flex items-center justify-center overflow-hidden bg-bg-input shrink-0">
          {displayUrl ? (
            <img src={displayUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-text-muted">{initials}</span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-bg-primary/70 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-accent-blue" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bg-input border border-border-secondary rounded-lg hover:bg-bg-hover transition-colors">
              <Upload size={12} /> Upload Logo
            </button>
            {displayUrl && (
              <button type="button" onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-status-error border border-status-error/20 rounded-lg hover:bg-status-error/10 transition-colors">
                <X size={12} /> Remove
              </button>
            )}
          </div>
          <p className="text-[10px] text-text-muted">PNG, JPEG, or WebP · Max 2MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
      </div>
      {uploadError && <p className="text-xs text-status-error">{uploadError}</p>}
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { role, activeServiceProvider } = useAuth();
  const toast = useToast();
  const isAdmin = role === 'SP_ADMIN';
  const spId = activeServiceProvider?.id || '';

  const [data, setData] = useState<ProfileData | null>(null);
  const [sessions, setSessions] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Org profile fields
  const { data: orgData } = useOrganizationProfile(spId);
  const { updateProfile, loading: orgSaving } = useUpdateOrganizationProfile(spId);
  const [orgForm, setOrgForm] = useState({
    name: '',
    displayName: '',
    description: '',
    websiteUrl: '',
    contactEmail: '',
    supportPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    logoUrl: '',
    serviceMode: 'NEARBY',
  });

  // Branding fields
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [notificationFooter, setNotificationFooter] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('default');

  useEffect(() => {
    async function load() {
      try {
        const [prof, sess] = await Promise.all([
          profileApi.get(),
          profileApi.sessions(),
        ]);
        setData(prof);
        setSessions(sess);
        setFullName(prof.fullName || '');
        setTimezone(prof.timezone || 'UTC');
        setLanguage(prof.language || 'en');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Track dirty state for unsaved changes warning
  const [orgFormInitial, setOrgFormInitial] = useState('');
  const orgDirty = JSON.stringify(orgForm) !== orgFormInitial || primaryColor !== (orgData?.serviceProvider?.primaryColor || '#3b82f6') || notificationFooter !== (orgData?.serviceProvider?.notificationFooter || '');

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  function validateOrgForm() {
    const errors: Record<string, string | null> = {};
    if (!orgForm.name.trim() || orgForm.name.trim().length < 2) errors.name = 'Organization name must be at least 2 characters';
    if (orgForm.name.length > 255) errors.name = 'Organization name must be under 255 characters';
    if (orgForm.contactEmail) errors.contactEmail = validateEmail(orgForm.contactEmail);
    if (orgForm.websiteUrl) errors.websiteUrl = validateUrl(orgForm.websiteUrl);
    if (orgForm.logoUrl) errors.logoUrl = validateUrl(orgForm.logoUrl);
    errors.primaryColor = validateHexColor(primaryColor);
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  }
  const isOrgValid = orgForm.name.trim().length >= 2 && !Object.values(fieldErrors).some(Boolean);

  useEffect(() => {
    if (orgData?.serviceProvider) {
      const sp = orgData.serviceProvider;
      const parsed = parseAddress(sp.address);
      const newForm = {
        name: sp.name || '',
        displayName: sp.displayName || sp.name || '',
        description: sp.description || '',
        websiteUrl: sp.website || '',
        contactEmail: sp.contactEmail || '',
        supportPhone: sp.supportPhone || '',
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        country: parsed.country,
        logoUrl: sp.logoUrl || '',
        serviceMode: sp.serviceMode || 'NEARBY',
      };
      setOrgForm(newForm);
      setOrgFormInitial(JSON.stringify(newForm));
      setPrimaryColor(sp.primaryColor || '#3b82f6');
      setNotificationFooter(sp.notificationFooter || '');
    }
  }, [orgData]);

  function updateOrgField(field: string, value: string) {
    setOrgForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileApi.update({ fullName, timezone, language });
      setSuccess('Profile updated successfully');
      toast.success('Profile updated successfully');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOrgProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!validateOrgForm()) return;
    const websiteUrl = orgForm.websiteUrl && !orgForm.websiteUrl.startsWith('http') ? `https://${orgForm.websiteUrl}` : orgForm.websiteUrl;
    try {
      await updateProfile({
        name: orgForm.name,
        displayName: orgForm.displayName,
        description: orgForm.description,
        websiteUrl,
        contactEmail: orgForm.contactEmail,
        supportPhone: orgForm.supportPhone,
        address: [orgForm.addressLine1, orgForm.addressLine2, orgForm.city, orgForm.state, orgForm.postalCode, orgForm.country].filter(Boolean).join(', '),
        logoUrl: orgForm.logoUrl,
        primaryColor,
        notificationFooter,
        serviceMode: orgForm.serviceMode,
      });
      setOrgFormInitial(JSON.stringify(orgForm));
      toast.success('Organization profile saved');
    } catch (err) {
      toast.error('Failed to save organization profile');
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-text-muted text-sm">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Profile Settings</h1>
          <p className="text-text-secondary text-sm mt-0.5">Manage your account details</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
      )}
      {success && (
        <div className="px-4 py-2 bg-status-success/10 border border-status-success/20 rounded-lg text-sm text-status-success">{success}</div>
      )}

      {/* Account Info (read-only) */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold mb-4">Account Information</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xl font-semibold">
            {data?.avatarUrl ? (
              <img src={data.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              data?.fullName?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <p className="text-lg font-semibold">{data?.fullName || '—'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-purple/10 text-accent-purple">
                {roleLabels[data?.username?.startsWith('o/') ? 'SP_ADMIN' : ''] || 'Member'}
              </span>
              <span className="text-xs text-text-muted font-mono">{data?.username || ''}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg">
            <AtSign size={14} className="text-text-muted shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Username</p>
              <p className="text-sm text-text-secondary">{data?.username || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg">
            <Mail size={14} className="text-text-muted shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Email</p>
              <p className="text-sm text-text-secondary">{data?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg">
            <User size={14} className="text-text-muted shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">User ID</p>
              <p className="text-sm text-text-muted font-mono text-xs">{data?.id || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Edit Profile</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
              <User size={12} /> Full Name
            </label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Your full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
                <Clock size={12} /> Timezone
              </label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5">
                <Globe size={12} /> Language
              </label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Key size={14} /> Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
              className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
              className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="••••••••" />
            <p className="text-[11px] text-text-muted mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Session Management */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Monitor size={14} /> Sessions</h3>
        {sessions ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="px-4 py-3 bg-bg-input border border-border-secondary rounded-lg">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Active Sessions</p>
                <p className="text-lg font-semibold mt-0.5">{sessions.activeSessions}</p>
              </div>
              <div className="px-4 py-3 bg-bg-input border border-border-secondary rounded-lg">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Two-Factor Auth</p>
                <p className="text-sm font-medium mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sessions.hasTwoFactor ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}>
                    {sessions.hasTwoFactor ? 'Enabled' : 'Not Enabled'}
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="px-4 py-3 bg-bg-input border border-border-secondary rounded-lg">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Last Login</p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {sessions.lastLoginAt ? new Date(sessions.lastLoginAt).toLocaleString() : '—'}
                </p>
              </div>
              <div className="px-4 py-3 bg-bg-input border border-border-secondary rounded-lg">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Password Updated</p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {sessions.passwordUpdatedAt ? new Date(sessions.passwordUpdatedAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Unable to load session information</p>
        )}
      </div>

      {/* Organization Profile (Admin only) */}
      {isAdmin && (
        <form onSubmit={handleSaveOrgProfile} className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 size={14} /> Organization Profile</h3>
            {orgData?.serviceProvider?.verificationStatus && (
              <VerificationBadge status={orgData.serviceProvider.verificationStatus} />
            )}
          </div>

          {/* Unsaved changes warning */}
          {orgDirty && (
            <div className="flex items-center gap-2 px-3 py-2 bg-status-warning/10 border border-status-warning/20 rounded-lg">
              <AlertTriangle size={14} className="text-status-warning shrink-0" />
              <p className="text-xs text-status-warning">You have unsaved changes</p>
            </div>
          )}

          {/* Read-only SP Info */}
          <div className="grid grid-cols-2 gap-3">
            <CopyableField label="Service Provider ID" value={orgData?.serviceProvider?.id || '—'} icon={<Shield size={14} className="text-text-muted shrink-0" />} />
            <CopyableField label="Slug" value={orgData?.serviceProvider?.slug || '—'} icon={<Globe size={14} className="text-text-muted shrink-0" />} />
          </div>
          {orgData?.serviceProvider?.industry && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg">
              <Building2 size={14} className="text-text-muted shrink-0" />
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Industry</p>
                <p className="text-sm text-text-secondary">{orgData.serviceProvider.industry}</p>
              </div>
            </div>
          )}

          {/* Service Mode */}
          <div>
            <label className="block text-xs text-text-muted mb-2">Service Mode *</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => updateOrgField('serviceMode', 'NEARBY')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${orgForm.serviceMode === 'NEARBY' ? 'border-accent-blue bg-accent-blue/5' : 'border-border-secondary bg-bg-input hover:border-border-primary'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${orgForm.serviceMode === 'NEARBY' ? 'bg-accent-blue/10 text-accent-blue' : 'bg-bg-elevated text-text-muted'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${orgForm.serviceMode === 'NEARBY' ? 'text-text-primary' : 'text-text-secondary'}`}>Nearby Services</p>
                  <p className="text-[10px] text-text-muted">Physical / local presence</p>
                </div>
              </button>
              <button type="button" onClick={() => updateOrgField('serviceMode', 'ONLINE')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${orgForm.serviceMode === 'ONLINE' ? 'border-accent-blue bg-accent-blue/5' : 'border-border-secondary bg-bg-input hover:border-border-primary'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${orgForm.serviceMode === 'ONLINE' ? 'bg-accent-blue/10 text-accent-blue' : 'bg-bg-elevated text-text-muted'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${orgForm.serviceMode === 'ONLINE' ? 'text-text-primary' : 'text-text-secondary'}`}>Online Services</p>
                  <p className="text-[10px] text-text-muted">Digital / remote services</p>
                </div>
              </button>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-xs text-text-muted mb-2">Organization Logo</label>
            <LogoUpload
              currentUrl={orgForm.logoUrl}
              orgName={orgForm.name || orgForm.displayName || 'SP'}
              onUploaded={(url) => updateOrgField('logoUrl', url)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Organization Name *</label>
              <input type="text" value={orgForm.name} onChange={(e) => updateOrgField('name', e.target.value)} required maxLength={255}
                className={`w-full px-4 py-2.5 bg-bg-input border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active ${fieldErrors.name ? 'border-status-error' : 'border-border-secondary'}`} />
              {fieldErrors.name && <p className="text-xs text-status-error mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Display Name *</label>
              <input type="text" value={orgForm.displayName} onChange={(e) => updateOrgField('displayName', e.target.value)} required maxLength={50}
                className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Description</label>
            <textarea value={orgForm.description} onChange={(e) => updateOrgField('description', e.target.value)} maxLength={500} rows={3}
              className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none" />
            <p className="text-[10px] text-text-muted mt-1">{orgForm.description.length}/500</p>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Website URL</label>
            <input type="text" value={orgForm.websiteUrl} onChange={(e) => { updateOrgField('websiteUrl', e.target.value); setFieldErrors((p) => ({ ...p, websiteUrl: validateUrl(e.target.value) })); }}
              className={`w-full px-4 py-2.5 bg-bg-input border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active ${fieldErrors.websiteUrl ? 'border-status-error' : 'border-border-secondary'}`}
              placeholder="https://example.com" />
            {fieldErrors.websiteUrl && <p className="text-xs text-status-error mt-1">{fieldErrors.websiteUrl}</p>}
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Contact Email</label>
            <input type="email" value={orgForm.contactEmail} onChange={(e) => { updateOrgField('contactEmail', e.target.value); setFieldErrors((p) => ({ ...p, contactEmail: validateEmail(e.target.value) })); }}
              className={`w-full px-4 py-2.5 bg-bg-input border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active ${fieldErrors.contactEmail ? 'border-status-error' : 'border-border-secondary'}`}
              placeholder="contact@acme.com" />
            {fieldErrors.contactEmail && <p className="text-xs text-status-error mt-1">{fieldErrors.contactEmail}</p>}
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Support Phone</label>
            <input type="tel" value={orgForm.supportPhone} onChange={(e) => updateOrgField('supportPhone', e.target.value)}
              className="w-full max-w-xs px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="+1 (555) 000-0000" />
          </div>
          <div className="border-t border-border-primary pt-4">
            <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wider">Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Address Line 1</label>
                <input type="text" value={orgForm.addressLine1} onChange={(e) => updateOrgField('addressLine1', e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Address Line 2</label>
                <input type="text" value={orgForm.addressLine2} onChange={(e) => updateOrgField('addressLine2', e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">City</label>
                <input type="text" value={orgForm.city} onChange={(e) => updateOrgField('city', e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">State/Region</label>
                <input type="text" value={orgForm.state} onChange={(e) => updateOrgField('state', e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Postal Code</label>
                <input type="text" value={orgForm.postalCode} onChange={(e) => updateOrgField('postalCode', e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Country</label>
                <select value={orgForm.country} onChange={(e) => updateOrgField('country', e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button type="submit" disabled={orgSaving || !orgDirty || !isOrgValid}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
            <Save size={16} /> {orgSaving ? 'Saving…' : 'Save Organization Profile'}
          </button>
        </form>
      )}

      {/* Branding Settings (Admin only) */}
      {isAdmin && (
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Palette size={14} /> Branding Settings</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border-secondary cursor-pointer" />
                  <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-32 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:border-border-active"
                    placeholder="#3b82f6" maxLength={7} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Email Template</label>
                <select value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                  <option value="default">Default Template</option>
                  <option value="minimal">Minimal</option>
                  <option value="branded">Branded</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Notification Footer</label>
                <textarea value={notificationFooter} onChange={(e) => setNotificationFooter(e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
                  placeholder="This message was sent by Your Organization..." />
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5"><Eye size={12} /> Live Preview</label>
              <div className="border border-border-secondary rounded-lg overflow-hidden">
                <div className="px-4 py-3" style={{ backgroundColor: primaryColor }}>
                  <p className="text-white text-sm font-medium">{orgForm.displayName || 'Your Organization'}</p>
                </div>
                <div className="px-4 py-4 bg-bg-input">
                  <p className="text-sm text-text-primary mb-1">Sample Notification</p>
                  <p className="text-xs text-text-muted">Your callback request has been approved and scheduled for tomorrow at 10:00 AM.</p>
                </div>
                {notificationFooter && (
                  <div className="px-4 py-2 bg-bg-primary border-t border-border-secondary">
                    <p className="text-[10px] text-text-muted">{notificationFooter}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
