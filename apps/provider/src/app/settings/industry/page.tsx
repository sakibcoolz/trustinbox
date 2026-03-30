'use client';

import { useState } from 'react';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import Link from 'next/link';

const industries = [
  'Banking & Finance',
  'Healthcare',
  'Insurance',
  'Real Estate',
  'Education',
  'Telecommunications',
  'E-Commerce',
  'Government',
  'Other',
];

const mockProfile = {
  industry: 'Banking & Finance',
  subIndustry: 'Retail Banking',
  regulatoryBody: 'RBI / Central Bank',
  complianceFrameworks: ['PCI DSS', 'GDPR', 'SOC 2'],
  communicationDefaults: {
    maxDailyNotifications: 5,
    preferredChannels: ['Email', 'Push'],
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    callbackWindowStart: '09:00',
    callbackWindowEnd: '18:00',
  },
  templates: {
    notificationFooter: 'This message was sent by Acme Bank. If you did not request this, please contact support.',
    callbackGreeting: 'Hello, this is a callback from Acme Bank regarding your request.',
  },
};

export default function IndustrySettingsPage() {
  const [profile, setProfile] = useState(mockProfile);
  const [saved, setSaved] = useState(false);

  function updateComm(field: string, value: string) {
    setProfile((prev) => ({
      ...prev,
      communicationDefaults: { ...prev.communicationDefaults, [field]: value },
    }));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Industry Profile</h1>
            <p className="text-text-secondary text-sm mt-0.5">Configure industry-specific settings and compliance</p>
          </div>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <Save size={16} /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Industry Details */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 size={16} /> Industry Classification</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Industry</label>
            <select value={profile.industry} onChange={(e) => { setProfile((p) => ({ ...p, industry: e.target.value })); setSaved(false); }}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
              {industries.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Sub-Industry</label>
            <input type="text" value={profile.subIndustry} onChange={(e) => { setProfile((p) => ({ ...p, subIndustry: e.target.value })); setSaved(false); }}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Regulatory Body</label>
            <input type="text" value={profile.regulatoryBody} onChange={(e) => { setProfile((p) => ({ ...p, regulatoryBody: e.target.value })); setSaved(false); }}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Compliance Frameworks</label>
            <div className="flex gap-2 flex-wrap">
              {profile.complianceFrameworks.map((f) => (
                <span key={f} className="px-2 py-1 bg-accent-blue/10 text-accent-blue rounded text-xs font-medium">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Communication Defaults */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Communication Defaults</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Max Daily Notifications per User</label>
            <input type="number" value={profile.communicationDefaults.maxDailyNotifications}
              onChange={(e) => updateComm('maxDailyNotifications', e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Preferred Channels</label>
            <div className="flex gap-2">
              {['Email', 'SMS', 'Push', 'In-App'].map((ch) => (
                <label key={ch} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <input type="checkbox" defaultChecked={profile.communicationDefaults.preferredChannels.includes(ch)} className="accent-accent-blue" />
                  {ch}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Quiet Hours Start</label>
            <input type="time" value={profile.communicationDefaults.quietHoursStart}
              onChange={(e) => updateComm('quietHoursStart', e.target.value)}
              className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Quiet Hours End</label>
            <input type="time" value={profile.communicationDefaults.quietHoursEnd}
              onChange={(e) => updateComm('quietHoursEnd', e.target.value)}
              className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Callback Window Start</label>
            <input type="time" value={profile.communicationDefaults.callbackWindowStart}
              onChange={(e) => updateComm('callbackWindowStart', e.target.value)}
              className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Callback Window End</label>
            <input type="time" value={profile.communicationDefaults.callbackWindowEnd}
              onChange={(e) => updateComm('callbackWindowEnd', e.target.value)}
              className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Default Templates</h3>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Notification Footer</label>
          <textarea defaultValue={profile.templates.notificationFooter} rows={3}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active resize-none" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Callback Greeting</label>
          <textarea defaultValue={profile.templates.callbackGreeting} rows={2}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active resize-none" />
        </div>
      </div>
    </div>
  );
}
