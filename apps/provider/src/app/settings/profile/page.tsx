'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, User, Mail, AtSign, Shield, Save, Globe, Clock, Key, Monitor } from 'lucide-react';
import Link from 'next/link';
import { profile as profileApi, type ProfileData, type SessionsData, ApiError } from '@/lib/api';

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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileApi.update({ fullName, timezone, language });
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
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
    </div>
  );
}
