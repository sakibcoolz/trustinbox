'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '@/lib/sounds';
import { MY_PRIVACY_PREFERENCES, UPDATE_PRIVACY } from '@/lib/graphql/settings';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isPushEnabled,
} from '@/lib/push-notifications';

const categories = [
  { name: 'Personal', desc: 'Direct messages and personal notifications.', status: 'Active', chip: 'chip-green', icon: '💬', bg: 'bg-accent-blue/10' },
  { name: 'Service Provider', desc: 'Transactional and business communications.', status: 'Active', chip: 'chip-green', icon: '🏢', bg: 'bg-accent-purple/10' },
  { name: 'Advertisement', desc: 'Promotional content from verified service providers.', status: 'Opt-in', chip: 'chip-orange', icon: '📢', bg: 'bg-accent-orange/10' },
];

function SoundToggle() {
  const [enabled, setEnabled] = useState(true);
  const { data } = useQuery(MY_PRIVACY_PREFERENCES);
  const [updatePrivacy] = useMutation(UPDATE_PRIVACY);

  useEffect(() => {
    if (data?.myPrivacyPreferences?.notificationSoundEnabled !== undefined) {
      const serverVal = data.myPrivacyPreferences.notificationSoundEnabled;
      setEnabled(serverVal);
      setSoundEnabled(serverVal);
    } else {
      setEnabled(isSoundEnabled());
    }
  }, [data]);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setSoundEnabled(newValue);
    if (newValue) {
      playNotificationSound();
    }
    updatePrivacy({ variables: { input: { notificationSoundEnabled: newValue } } });
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">Notification Sounds</p>
        <p className="text-xs text-text-muted mt-0.5">Play a sound when new notifications arrive</p>
      </div>
      <button
        onClick={handleToggle}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          enabled ? 'bg-accent-blue' : 'bg-bg-tertiary'
        }`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-5' : 'left-1'
        }`} />
      </button>
    </div>
  );
}

function PushToggle() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  if (!isNotificationSupported()) {
    return (
      <div className="py-3">
        <p className="text-xs text-text-muted">Push notifications are not supported in this browser.</p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="py-3">
        <p className="text-sm font-medium text-text-primary">Notifications Blocked</p>
        <p className="text-xs text-text-muted mt-0.5">
          Push notifications are blocked. Please enable them in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">Browser Notifications</p>
        <p className="text-xs text-text-muted mt-0.5">
          {permission === 'granted'
            ? 'You will receive notifications when the tab is in the background.'
            : 'Get notified even when the browser tab is not active.'}
        </p>
      </div>
      {permission === 'granted' ? (
        <span className="text-xs font-medium text-status-success bg-status-success/10 px-2.5 py-1 rounded-full">Enabled</span>
      ) : (
        <button
          onClick={handleEnable}
          className="text-xs font-medium text-accent-blue bg-accent-blue/10 px-3 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-colors"
        >
          Enable
        </button>
      )}
    </div>
  );
}

export default function PreferencesSettingsPage() {
  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Category Preferences</h1>
            <p className="text-2xs text-text-muted">Control how each notification category is handled.</p>
          </div>
        </div>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.name} className="card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${cat.bg} flex items-center justify-center text-lg shrink-0`}>{cat.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{cat.name}</p>
                <p className="text-2xs text-text-muted mt-0.5">{cat.desc}</p>
              </div>
              <span className={cat.chip + ' text-2xs'}>{cat.status}</span>
            </div>
          ))}
        </div>

        {/* Notification Sound */}
        <div className="card">
          <h2 className="text-base font-semibold text-text-primary mb-2">Sound</h2>
          <SoundToggle />
        </div>

        {/* Push Notifications */}
        <div className="card">
          <h2 className="text-base font-semibold text-text-primary mb-2">Push Notifications</h2>
          <PushToggle />
        </div>
      </div>
    </div>
  );
}
