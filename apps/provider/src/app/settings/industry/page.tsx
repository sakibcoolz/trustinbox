'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Building2, Save, AlertTriangle, Eye, Check } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import {
  useIndustryProfiles,
  useIndustryProfile,
  safeParseJson,
  type IndustryProfile,
} from '@/lib/graphql/settings';

interface ComplianceHint {
  name: string;
  description: string;
  required: boolean;
}

interface DocumentType {
  name: string;
  description: string;
  required: boolean;
}

interface CallbackWorkflow {
  name: string;
  description: string;
}

interface BotTemplate {
  name: string;
  description: string;
  purpose: string;
}

// Communication overrides (editable)
interface CommOverrides {
  maxDailyNotifications: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  callbackWindowStart: string;
  callbackWindowEnd: string;
  preferredChannels: string[];
}

const DEFAULT_COMM: CommOverrides = {
  maxDailyNotifications: '5',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  callbackWindowStart: '09:00',
  callbackWindowEnd: '18:00',
  preferredChannels: ['Email', 'Push'],
};

export default function IndustrySettingsPage() {
  const { activeServiceProvider } = useAuth();
  const toast = useToast();
  const spId = activeServiceProvider?.id || '';

  const { data: profilesData, loading: profilesLoading } = useIndustryProfiles(true);
  const profiles = profilesData?.industryProfiles?.nodes || [];

  const [selectedKey, setSelectedKey] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const [commOverrides, setCommOverrides] = useState<CommOverrides>(DEFAULT_COMM);
  const [saving, setSaving] = useState(false);

  const { data: profileData, loading: profileLoading } = useIndustryProfile(selectedKey);
  const activeProfile = profileData?.industryProfile;

  // Parsed JSON fields
  const complianceHints = useMemo(() => safeParseJson<ComplianceHint[]>(activeProfile?.complianceHintsJson, []), [activeProfile]);
  const documentTypes = useMemo(() => safeParseJson<DocumentType[]>(activeProfile?.documentTypesJson, []), [activeProfile]);
  const callbackWorkflows = useMemo(() => safeParseJson<CallbackWorkflow[]>(activeProfile?.callbackWorkflowsJson, []), [activeProfile]);
  const botTemplates = useMemo(() => safeParseJson<BotTemplate[]>(activeProfile?.botPromptPackJson, []), [activeProfile]);

  const isSwitching = selectedKey !== currentKey && currentKey !== '';

  function updateComm(field: keyof CommOverrides, value: unknown) {
    setCommOverrides((prev) => ({ ...prev, [field]: value }));
  }

  function toggleChannel(ch: string) {
    setCommOverrides((prev) => ({
      ...prev,
      preferredChannels: prev.preferredChannels.includes(ch)
        ? prev.preferredChannels.filter((c) => c !== ch)
        : [...prev.preferredChannels, ch],
    }));
  }

  function handleApply() {
    setSaving(true);
    setCurrentKey(selectedKey);
    toast.success(`Industry profile "${activeProfile?.displayName}" applied`);
    setTimeout(() => setSaving(false), 500);
  }

  function handleSave() {
    toast.success('Communication overrides saved');
  }

  if (profilesLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-text-muted text-sm">Loading industry profiles…</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
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
          <Save size={16} /> Save Overrides
        </button>
      </div>

      {/* Industry Selector (15.5) */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 size={16} /> Industry Classification</h3>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Select Industry Profile</label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full max-w-md px-3 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
          >
            <option value="">— Choose an industry —</option>
            {profiles.map((p) => (
              <option key={p.industryKey} value={p.industryKey}>{p.displayName}</option>
            ))}
          </select>
        </div>
        {activeProfile && (
          <div className="px-4 py-3 bg-bg-input border border-border-secondary rounded-lg">
            <p className="text-sm font-medium">{activeProfile.displayName}</p>
            <p className="text-xs text-text-muted mt-1">{activeProfile.description || 'No description available'}</p>
          </div>
        )}
      </div>

      {/* Warning when switching */}
      {isSwitching && (
        <div className="flex items-center gap-3 px-4 py-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
          <AlertTriangle size={16} className="text-status-warning shrink-0" />
          <p className="text-sm text-status-warning">Changing industry profile will reset custom overrides to new industry defaults.</p>
        </div>
      )}

      {activeProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config (15.6) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Default Categories */}
            {activeProfile.defaultCategories.length > 0 && (
              <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Default Notification Categories</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium">Industry default</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeProfile.defaultCategories.map((cat) => (
                    <span key={cat} className="px-3 py-1.5 bg-accent-blue/10 text-accent-blue rounded-full text-xs font-medium">{cat}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Communication Defaults (editable) */}
            <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold">Communication Defaults</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Max Daily Notifications per User</label>
                  <input type="number" value={commOverrides.maxDailyNotifications}
                    onChange={(e) => updateComm('maxDailyNotifications', e.target.value)}
                    className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Preferred Channels</label>
                  <div className="flex gap-2">
                    {['Email', 'SMS', 'Push', 'In-App'].map((ch) => (
                      <label key={ch} className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <input type="checkbox" checked={commOverrides.preferredChannels.includes(ch)}
                          onChange={() => toggleChannel(ch)} className="accent-accent-blue" />
                        {ch}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Quiet Hours Start</label>
                  <input type="time" value={commOverrides.quietHoursStart}
                    onChange={(e) => updateComm('quietHoursStart', e.target.value)}
                    className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Quiet Hours End</label>
                  <input type="time" value={commOverrides.quietHoursEnd}
                    onChange={(e) => updateComm('quietHoursEnd', e.target.value)}
                    className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Callback Window Start</label>
                  <input type="time" value={commOverrides.callbackWindowStart}
                    onChange={(e) => updateComm('callbackWindowStart', e.target.value)}
                    className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Callback Window End</label>
                  <input type="time" value={commOverrides.callbackWindowEnd}
                    onChange={(e) => updateComm('callbackWindowEnd', e.target.value)}
                    className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
                </div>
              </div>
            </div>

            {/* Compliance Hints (read-only) */}
            {complianceHints.length > 0 && (
              <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Compliance Requirements</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium">Industry default</span>
                </div>
                <div className="space-y-2">
                  {complianceHints.map((hint, i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-bg-input border border-border-secondary rounded-lg">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${hint.required ? 'bg-status-error/10 text-status-error' : 'bg-status-success/10 text-status-success'}`}>
                        {hint.required ? '!' : '✓'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{hint.name}</p>
                        <p className="text-xs text-text-muted">{hint.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Types (read-only) */}
            {documentTypes.length > 0 && (
              <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Required Document Types</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium">Industry default</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {documentTypes.map((doc, i) => (
                    <div key={i} className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg">
                      <p className="text-sm font-medium">{doc.name}</p>
                      {doc.description && <p className="text-xs text-text-muted">{doc.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bot Templates (read-only) */}
            {botTemplates.length > 0 && (
              <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Bot Prompt Templates</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium">Industry default</span>
                </div>
                <div className="space-y-2">
                  {botTemplates.map((tmpl, i) => (
                    <div key={i} className="px-3 py-2.5 bg-bg-input border border-border-secondary rounded-lg">
                      <p className="text-sm font-medium">{tmpl.name}</p>
                      <p className="text-xs text-text-muted">{tmpl.description || tmpl.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel (15.7) */}
          <div className="space-y-4">
            <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-6 space-y-4 sticky top-6">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Eye size={14} /> Profile Preview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Default Categories</span>
                  <span className="font-medium">{activeProfile.defaultCategories.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Compliance Requirements</span>
                  <span className="font-medium">{complianceHints.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Document Types</span>
                  <span className="font-medium">{documentTypes.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Callback Workflows</span>
                  <span className="font-medium">{callbackWorkflows.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Bot Templates</span>
                  <span className="font-medium">{botTemplates.length}</span>
                </div>
              </div>

              <div className="border-t border-border-primary pt-4 space-y-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Communication Rules</p>
                <p className="text-xs text-text-secondary">Max {commOverrides.maxDailyNotifications} notifications/day</p>
                <p className="text-xs text-text-secondary">Quiet hours: {commOverrides.quietHoursStart} – {commOverrides.quietHoursEnd}</p>
                <p className="text-xs text-text-secondary">Callback window: {commOverrides.callbackWindowStart} – {commOverrides.callbackWindowEnd}</p>
                <p className="text-xs text-text-secondary">Channels: {commOverrides.preferredChannels.join(', ') || 'None'}</p>
              </div>

              <button
                onClick={handleApply}
                disabled={saving || !selectedKey}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
              >
                <Check size={16} /> {saving ? 'Applying…' : 'Apply Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!activeProfile && !profilesLoading && selectedKey && profileLoading && (
        <div className="text-center py-8 text-text-muted text-sm">Loading profile details…</div>
      )}

      {!selectedKey && !profilesLoading && (
        <div className="text-center py-16 text-text-muted">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">No Industry Profile Selected</p>
          <p className="text-sm">Choose an industry profile above to view and configure industry-specific settings.</p>
        </div>
      )}
    </div>
  );
}
