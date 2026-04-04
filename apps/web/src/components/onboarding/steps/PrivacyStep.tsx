'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_PRIVACY } from '@/lib/graphql/settings';

interface PrivacyStepProps {
  onNext: () => void;
  onSkip: () => void;
  onConfigured: () => void;
}

export function PrivacyStep({ onNext, onSkip, onConfigured }: PrivacyStepProps) {
  const [personal, setPersonal] = useState(true);
  const [sp, setSp] = useState(true);
  const [ads, setAds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatePrivacy] = useMutation(UPDATE_PRIVACY);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrivacy({
        variables: {
          input: {
            allowPersonalNotifications: personal,
            allowSPNotifications: sp,
            allowAdvertisements: ads,
          },
        },
      });
      onConfigured();
      onNext();
    } catch {
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-text-primary mb-1">Set Your Privacy Preferences</h2>
      <p className="text-sm text-text-secondary mb-5">Choose which types of communications you want to receive.</p>

      <div className="space-y-3 mb-6">
        <Toggle label="Personal" description="Messages from friends and contacts" enabled={personal} onChange={setPersonal} />
        <Toggle label="Service Provider" description="Updates from organizations you work with" enabled={sp} onChange={setSp} />
        <Toggle label="Advertisements" description="Promotional content from service providers" enabled={ads} onChange={setAds} />
      </div>

      <div className="flex gap-3">
        <button onClick={onSkip} className="btn-ghost flex-1 text-sm">Skip</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">
          {saving ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, description, enabled, onChange }: { label: string; description: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-accent-blue' : 'bg-bg-tertiary'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  );
}
