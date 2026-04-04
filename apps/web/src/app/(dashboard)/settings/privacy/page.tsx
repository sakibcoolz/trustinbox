'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button onClick={onToggle} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-accent-blue' : 'bg-bg-tertiary'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

interface PrivacyState {
  allowPersonalNotifications: boolean;
  allowSPNotifications: boolean;
  allowAdvertisements: boolean;
  allowCallbackRequests: boolean;
  allowChat: boolean;
  allowDocumentShares: boolean;
  requireCallApproval: boolean;
}

const DEFAULTS: PrivacyState = {
  allowPersonalNotifications: true,
  allowSPNotifications: true,
  allowAdvertisements: false,
  allowCallbackRequests: true,
  allowChat: true,
  allowDocumentShares: true,
  requireCallApproval: true,
};

const toggles: { key: keyof PrivacyState; label: string; desc: string }[] = [
  { key: 'allowPersonalNotifications', label: 'Allow Personal Notifications', desc: 'Receive direct messages and personal alerts from contacts.' },
  { key: 'allowSPNotifications', label: 'Allow Service Provider Notifications', desc: 'Receive transactional and business notifications from verified providers.' },
  { key: 'allowAdvertisements', label: 'Allow Advertisements', desc: 'Receive promotional content from verified service providers.' },
  { key: 'allowCallbackRequests', label: 'Allow Callback Requests', desc: 'Let service providers request phone callbacks with you.' },
  { key: 'allowChat', label: 'Allow Chat Messages', desc: 'Let service providers initiate chat conversations with you.' },
  { key: 'allowDocumentShares', label: 'Allow Document Shares', desc: 'Receive documents shared by service providers.' },
  { key: 'requireCallApproval', label: 'Require Callback Approval', desc: 'Providers must get your approval before calling you.' },
];

export default function PrivacySettingsPage() {
  const { privacy, loading, error, updatePrivacy, saving } = usePrivacySettings();
  const [prefs, setPrefs] = useState<PrivacyState>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (privacy && !initialized) {
      setPrefs({
        allowPersonalNotifications: privacy.allowPersonalNotifications ?? DEFAULTS.allowPersonalNotifications,
        allowSPNotifications: privacy.allowSPNotifications ?? DEFAULTS.allowSPNotifications,
        allowAdvertisements: privacy.allowAdvertisements ?? DEFAULTS.allowAdvertisements,
        allowCallbackRequests: privacy.allowCallbackRequests ?? DEFAULTS.allowCallbackRequests,
        allowChat: privacy.allowChat ?? DEFAULTS.allowChat,
        allowDocumentShares: privacy.allowDocumentShares ?? DEFAULTS.allowDocumentShares,
        requireCallApproval: privacy.requireCallApproval ?? DEFAULTS.requireCallApproval,
      });
      setInitialized(true);
    }
  }, [privacy, initialized]);

  const handleToggle = useCallback((key: keyof PrivacyState) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updatePrivacy(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handled by Apollo
    }
  }, [prefs, updatePrivacy]);

  if (loading && !initialized) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-primary">Privacy</h1>
              <p className="text-2xs text-text-muted">Control what service providers can see and do.</p>
            </div>
          </div>
          <div className="card p-0 divide-y divide-border-primary">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-4">
                <div className="flex-1 mr-4 space-y-2">
                  <div className="h-4 w-48 bg-bg-tertiary rounded animate-pulse" />
                  <div className="h-3 w-64 bg-bg-tertiary rounded animate-pulse" />
                </div>
                <div className="w-11 h-6 bg-bg-tertiary rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-3">
          <p className="text-sm text-accent-red">Failed to load privacy preferences</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">Privacy</h1>
            <p className="text-2xs text-text-muted">Control what service providers can see and do.</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className={`btn-primary text-sm ${saved ? 'bg-status-success hover:bg-status-success' : ''}`}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

        <div className="card p-0">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border-primary">
            <div><p className="text-sm font-medium text-text-primary">Show Phone Number</p><p className="text-2xs text-text-muted mt-0.5">Your actual number is never revealed to service providers.</p></div>
            <span className="chip-red text-2xs">Always Hidden</span>
          </div>
        </div>

        <div className="card p-0 divide-y divide-border-primary">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between px-4 py-4">
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-text-primary">{t.label}</p>
                <p className="text-2xs text-text-muted mt-0.5">{t.desc}</p>
              </div>
              <Toggle on={prefs[t.key]} onToggle={() => handleToggle(t.key)} disabled={saving} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
