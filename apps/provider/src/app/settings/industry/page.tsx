'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Building2, Save, AlertTriangle, Eye, Check, Loader2, Landmark, Heart, Home, Plane, Truck, ShoppingCart, GraduationCap, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import {
  useIndustryProfiles,
  useIndustryProfile,
  useOrganizationProfile,
  useApplyIndustryProfile,
  useSaveCommunicationOverrides,
  safeParseJson,
  type IndustryProfile,
} from '@/lib/graphql/settings';

// ─── Industry Icons ──────────────────────────────────────────────────────

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  banking: <Landmark size={20} />,
  healthcare: <Heart size={20} />,
  real_estate: <Home size={20} />,
  hospitality: <Plane size={20} />,
  logistics: <Truck size={20} />,
  retail: <ShoppingCart size={20} />,
  education: <GraduationCap size={20} />,
};

function getIndustryIcon(key: string) {
  return INDUSTRY_ICONS[key] || <Wrench size={20} />;
}

interface ComplianceHint { name: string; description: string; required: boolean; }
interface DocumentType { name: string; description: string; required: boolean; }
interface CallbackWorkflow { name: string; description: string; }
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

// ─── Apply Confirmation Dialog ──────────────────────────────────────────

function ApplyConfirmDialog({
  open, onClose, onConfirm, fromIndustry, toIndustry, loading,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  fromIndustry: string; toIndustry: string; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-status-warning/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-status-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Switch Industry Profile?</h3>
            <p className="text-xs text-text-muted mt-0.5">This will update your organization settings</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">What will change:</p>
          <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
            <li>Default notification categories will be updated</li>
            <li>Compliance requirements will change to match new industry</li>
            <li>Document type requirements will be updated</li>
          </ul>
          <p className="text-sm text-text-secondary mt-2">What will be preserved:</p>
          <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
            <li>Team members and their roles</li>
            <li>Existing data and conversations</li>
            <li>Custom branding settings</li>
          </ul>
        </div>
        {fromIndustry && (
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-xs">
            <span className="text-text-muted">From:</span> <span className="text-text-secondary font-medium">{fromIndustry}</span>
            <span className="text-text-muted mx-1">→</span>
            <span className="text-text-muted">To:</span> <span className="text-accent-blue font-medium">{toIndustry}</span>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Apply Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function IndustrySettingsPage() {
  const { activeServiceProvider } = useAuth();
  const toast = useToast();
  const spId = activeServiceProvider?.id || '';

  const { data: profilesData, loading: profilesLoading, error: profilesError, refetch: refetchProfiles } = useIndustryProfiles(true);
  const profiles = profilesData?.industryProfiles?.nodes || [];

  const [selectedKey, setSelectedKey] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const [commOverrides, setCommOverrides] = useState<CommOverrides>(DEFAULT_COMM);
  const [savedOverrides, setSavedOverrides] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Load current industry from org profile
  const { data: orgData } = useOrganizationProfile(spId);
  useEffect(() => {
    if (orgData?.serviceProvider?.industry) {
      const key = orgData.serviceProvider.industry;
      setCurrentKey(key);
      if (!selectedKey) setSelectedKey(key);
    }
  }, [orgData, selectedKey]);

  const { data: profileData, loading: profileLoading } = useIndustryProfile(selectedKey);
  const activeProfile = profileData?.industryProfile;

  const { applyProfile, loading: applying } = useApplyIndustryProfile(spId);
  const { saveOverrides, loading: savingOverrides } = useSaveCommunicationOverrides(spId);

  // Parsed JSON fields
  const complianceHints = useMemo(() => safeParseJson<ComplianceHint[]>(activeProfile?.complianceHintsJson, []), [activeProfile]);
  const documentTypes = useMemo(() => safeParseJson<DocumentType[]>(activeProfile?.documentTypesJson, []), [activeProfile]);
  const callbackWorkflows = useMemo(() => safeParseJson<CallbackWorkflow[]>(activeProfile?.callbackWorkflowsJson, []), [activeProfile]);
  const isSwitching = selectedKey !== currentKey && currentKey !== '';
  const overridesDirty = JSON.stringify(commOverrides) !== savedOverrides;

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

  async function handleApplyConfirm() {
    try {
      await applyProfile(selectedKey);
      setCurrentKey(selectedKey);
      toast.success(`Industry profile "${activeProfile?.displayName}" applied`);
      setShowConfirm(false);
    } catch {
      toast.error('Failed to apply industry profile');
    }
  }

  async function handleSave() {
    try {
      await saveOverrides({
        maxDailyNotifications: parseInt(commOverrides.maxDailyNotifications) || 5,
        quietHoursStart: commOverrides.quietHoursStart,
        quietHoursEnd: commOverrides.quietHoursEnd,
        callbackWindowStart: commOverrides.callbackWindowStart,
        callbackWindowEnd: commOverrides.callbackWindowEnd,
        preferredChannels: commOverrides.preferredChannels,
      });
      setSavedOverrides(JSON.stringify(commOverrides));
      toast.success('Communication overrides saved');
    } catch {
      toast.error('Failed to save overrides');
    }
  }

  if (profilesLoading) {
    return (
      <div className="p-8 space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-border-primary rounded animate-pulse" />
          <div className="h-6 w-48 bg-border-primary rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-24 bg-bg-card border border-border-primary rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (profilesError) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-status-error">Failed to load industry profiles</p>
        <button onClick={() => refetchProfiles()} className="text-xs text-accent-blue hover:underline">Retry</button>
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
        <button onClick={handleSave} disabled={savingOverrides || !overridesDirty}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
          {savingOverrides ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Overrides
        </button>
      </div>

      {/* Industry Classification + Grid */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 size={16} /> Industry Classification</h3>
          {currentKey && (
            <span className="text-xs text-text-muted">Current: <span className="text-accent-blue font-medium">{profiles.find((p) => p.industryKey === currentKey)?.displayName || currentKey}</span></span>
          )}
        </div>

        {/* Grid view */}
        {profiles.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {profiles.map((p) => {
              const isSelected = selectedKey === p.industryKey;
              const isCurrent = currentKey === p.industryKey;
              return (
                <button key={p.industryKey} onClick={() => setSelectedKey(p.industryKey)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    isSelected ? 'border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue/20' :
                    'border-border-secondary hover:border-border-active hover:bg-bg-hover'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-accent-blue/10 text-accent-blue' : 'bg-bg-input text-text-muted'
                    }`}>
                      {getIndustryIcon(p.industryKey)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.displayName}</p>
                      <p className="text-xs text-text-muted mt-0.5">{p.defaultCategories.length} categories</p>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-status-success/10 text-status-success">Active</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <Building2 size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No industry profiles available</p>
          </div>
        )}

        <div>
          <label className="block text-xs text-text-muted mb-1.5">Or select from dropdown</label>
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

            {/* Callback Workflows (read-only) */}
            {callbackWorkflows.length > 0 && (
              <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Callback Workflows</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium">Industry default</span>
                </div>
                <div className="space-y-2">
                  {callbackWorkflows.map((wf, i) => (
                    <div key={i} className="px-3 py-2.5 bg-bg-input border border-border-secondary rounded-lg">
                      <p className="text-sm font-medium">{wf.name}</p>
                      <p className="text-xs text-text-muted">{wf.description}</p>
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
              </div>

              <div className="border-t border-border-primary pt-4 space-y-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Communication Rules</p>
                <p className="text-xs text-text-secondary">Max {commOverrides.maxDailyNotifications} notifications/day</p>
                <p className="text-xs text-text-secondary">Quiet hours: {commOverrides.quietHoursStart} – {commOverrides.quietHoursEnd}</p>
                <p className="text-xs text-text-secondary">Callback window: {commOverrides.callbackWindowStart} – {commOverrides.callbackWindowEnd}</p>
                <p className="text-xs text-text-secondary">Channels: {commOverrides.preferredChannels.join(', ') || 'None'}</p>
              </div>

              <button
                onClick={() => isSwitching ? setShowConfirm(true) : handleApplyConfirm()}
                disabled={applying || !selectedKey || (selectedKey === currentKey)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
              >
                {applying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {selectedKey === currentKey ? 'Currently Active' : 'Apply Profile'}
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

      {/* Apply Confirmation Dialog */}
      <ApplyConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleApplyConfirm}
        fromIndustry={profiles.find((p) => p.industryKey === currentKey)?.displayName || currentKey}
        toIndustry={activeProfile?.displayName || selectedKey}
        loading={applying}
      />
    </div>
  );
}
