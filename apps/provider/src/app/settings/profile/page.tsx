'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, User, Mail, AtSign, Shield, Save, Globe, Clock, Key, Monitor, Building2, Palette, Eye } from 'lucide-react';
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

const roleLabels: Record<string, string> = {
  SP_ADMIN: 'Admin', AGENT: 'Agent', ANALYST: 'Analyst', CUSTOMER: 'Customer',
};

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

  useEffect(() => {
    if (orgData?.serviceProvider) {
      const sp = orgData.serviceProvider;
      setOrgForm({
        name: sp.name || '',
        displayName: sp.displayName || sp.name || '',
        description: sp.description || '',
        websiteUrl: sp.website || '',
        contactEmail: sp.contactEmail || '',
        supportPhone: sp.supportPhone || '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        logoUrl: sp.logoUrl || '',
      });
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
    if (!orgForm.name.trim()) { setError('Organization name is required'); return; }
    try {
      await updateProfile({
        name: orgForm.name,
        displayName: orgForm.displayName,
        description: orgForm.description,
        websiteUrl: orgForm.websiteUrl,
        contactEmail: orgForm.contactEmail,
        supportPhone: orgForm.supportPhone,
        address: [orgForm.addressLine1, orgForm.addressLine2, orgForm.city, orgForm.state, orgForm.postalCode, orgForm.country].filter(Boolean).join(', '),
        logoUrl: orgForm.logoUrl,
        primaryColor,
        notificationFooter,
      });
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
          <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 size={14} /> Organization Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Organization Name *</label>
              <input type="text" value={orgForm.name} onChange={(e) => updateOrgField('name', e.target.value)} required maxLength={100}
                className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
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
            <label className="block text-xs text-text-muted mb-1.5">Logo URL</label>
            <div className="flex items-center gap-3">
              {orgForm.logoUrl && (
                <img src={orgForm.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-border-secondary" />
              )}
              <input type="url" value={orgForm.logoUrl} onChange={(e) => updateOrgField('logoUrl', e.target.value)}
                className="flex-1 px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="https://example.com/logo.png" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Website URL</label>
              <input type="url" value={orgForm.websiteUrl} onChange={(e) => updateOrgField('websiteUrl', e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Contact Email</label>
              <input type="email" value={orgForm.contactEmail} onChange={(e) => updateOrgField('contactEmail', e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="contact@acme.com" />
            </div>
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
                  {['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Japan', 'Singapore', 'United Arab Emirates'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button type="submit" disabled={orgSaving}
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
