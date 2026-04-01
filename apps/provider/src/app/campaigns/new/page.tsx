'use client';

import { useState, useEffect, Suspense } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Shield, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import {
  useCreateCampaign,
  usePreviewCampaignPolicy,
  NotificationCategory,
  CampaignPolicyPreview,
} from '@/lib/graphql/campaigns';
import LaunchConfirmationModal from '@/components/campaigns/LaunchConfirmationModal';

interface CampaignFormState {
  name: string;
  description: string;
  category: NotificationCategory;
  targetType: 'all' | 'segment' | 'manual';
  targetUserIds: string;
  segmentId: string;
  subject: string;
  body: string;
  scheduleType: 'now' | 'scheduled';
  scheduledAt: string;
}

const STEPS = ['Basics', 'Audience', 'Content', 'Schedule', 'Review'];

const CATEGORIES: { value: NotificationCategory; label: string; description: string }[] = [
  { value: 'PERSONAL', label: 'Personal', description: 'For individual customers' },
  { value: 'ORGANIZATIONAL', label: 'Organizational', description: 'Business communications' },
  { value: 'ADVERTISEMENT', label: 'Advertisement', description: 'Promotional content' },
];

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const canCreate = usePermission('campaigns:create');
  const { success, error: toastError } = useToast();

  const { create, loading: creating } = useCreateCampaign();
  const { preview, result: policyPreview, loading: previewLoading } = usePreviewCampaignPolicy();

  const [step, setStep] = useState(1);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignFormState>({
    name: '',
    description: '',
    category: 'ORGANIZATIONAL',
    targetType: 'all',
    targetUserIds: '',
    segmentId: '',
    subject: '',
    body: '',
    scheduleType: 'now',
    scheduledAt: '',
  });

  function update<K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Fetch policy preview on step 5
  useEffect(() => {
    if (step === 5 && spId) {
      const ids = form.targetType === 'manual' && form.targetUserIds
        ? form.targetUserIds.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      preview({ serviceProviderId: spId, category: form.category, targetUserIds: ids });
    }
  }, [step, spId, form.category, form.targetUserIds, form.targetType]);

  // Step validation
  function canAdvance(): boolean {
    switch (step) {
      case 1: return form.name.length >= 3 && !!form.category;
      case 2: return true;
      case 3: return form.subject.length >= 3 && form.body.length >= 10;
      case 4: return form.scheduleType === 'now' || (form.scheduleType === 'scheduled' && !!form.scheduledAt);
      default: return true;
    }
  }

  async function handleSaveAsDraft() {
    if (!form.name || !form.category) {
      toastError('Name and category are required to save a draft');
      return;
    }
    try {
      await create({
        serviceProviderId: spId,
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        scheduledAt: form.scheduleType === 'scheduled' && form.scheduledAt ? form.scheduledAt : null,
      });
      success('Campaign saved as draft');
      router.push('/campaigns');
    } catch {
      toastError('Failed to save campaign');
    }
  }

  async function handleLaunchClick() {
    try {
      const result = await create({
        serviceProviderId: spId,
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        scheduledAt: form.scheduleType === 'scheduled' && form.scheduledAt ? form.scheduledAt : null,
      });
      const id = result.data?.createCampaign?.id;
      if (id) {
        setCreatedCampaignId(id);
        setShowLaunchModal(true);
      }
    } catch {
      toastError('Failed to create campaign');
    }
  }

  if (!canCreate) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">You do not have permission to create campaigns.</p>
        <Link href="/campaigns" className="text-accent-blue text-sm hover:underline mt-2 inline-block">Back to campaigns</Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Campaign</h1>
          <p className="text-text-secondary text-sm mt-0.5">Create a new campaign in {STEPS.length} steps</p>
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i + 1 < step && setStep(i + 1)}
              disabled={i + 1 > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                step === i + 1 ? 'bg-accent-blue/10 text-accent-blue' :
                step > i + 1 ? 'text-status-success cursor-pointer hover:bg-bg-hover' :
                'text-text-muted'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                step === i + 1 ? 'bg-accent-blue text-white' :
                step > i + 1 ? 'bg-status-success/20 text-status-success' :
                'bg-border-secondary text-text-muted'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border-secondary" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        {/* Step 1: Basics */}
        {step === 1 && (
          <>
            <h3 className="text-sm font-semibold">Campaign Basics</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Campaign Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Q2 Customer Onboarding"
              />
              {form.name.length > 0 && form.name.length < 3 && (
                <p className="text-xs text-status-error mt-1">Name must be at least 3 characters</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary resize-none placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Brief description of this campaign…"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Category *</label>
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => update('category', cat.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      form.category === cat.value
                        ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                        : 'border-border-secondary text-text-secondary hover:border-border-active'
                    }`}
                  >
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 2: Audience */}
        {step === 2 && (
          <>
            <h3 className="text-sm font-semibold">Target Audience</h3>
            <div className="flex gap-2">
              {(['all', 'segment', 'manual'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update('targetType', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    form.targetType === t ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  {t === 'all' ? 'All Customers' : t === 'segment' ? 'Segment' : 'Manual List'}
                </button>
              ))}
            </div>
            {form.targetType === 'segment' && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Select Segment</label>
                <select
                  value={form.segmentId}
                  onChange={(e) => update('segmentId', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
                >
                  <option value="">Choose a segment…</option>
                  <option value="active">Active customers (last 30 days)</option>
                  <option value="new">New customers (last 7 days)</option>
                  <option value="premium">Premium subscribers</option>
                </select>
              </div>
            )}
            {form.targetType === 'manual' && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Customer Virtual IDs (comma-separated)</label>
                <textarea
                  value={form.targetUserIds}
                  onChange={(e) => update('targetUserIds', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono resize-none placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="VID-abc123, VID-def456, …"
                />
                {form.targetUserIds && (
                  <p className="text-xs text-text-muted mt-1">
                    {form.targetUserIds.split(',').filter((s) => s.trim()).length} recipients
                  </p>
                )}
              </div>
            )}
            {form.targetType === 'all' && (
              <div className="p-3 bg-bg-tertiary rounded-lg text-xs text-text-muted">
                All customers in your account will be targeted.
              </div>
            )}
          </>
        )}

        {/* Step 3: Content */}
        {step === 3 && (
          <>
            <h3 className="text-sm font-semibold">Campaign Content</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Subject *</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Important update from your provider"
              />
              {form.subject.length > 0 && form.subject.length < 3 && (
                <p className="text-xs text-status-error mt-1">Subject must be at least 3 characters</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Body *</label>
              <textarea
                value={form.body}
                onChange={(e) => update('body', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary resize-none placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Compose your campaign message…"
              />
              <p className="text-xs text-text-muted mt-1 text-right">{form.body.length} characters {form.body.length < 10 && '(min 10)'}</p>
            </div>
          </>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <>
            <h3 className="text-sm font-semibold">Schedule</h3>
            <div className="flex gap-2">
              {(['now', 'scheduled'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update('scheduleType', s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.scheduleType === s ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  {s === 'now' ? 'Send Immediately' : 'Schedule for Later'}
                </button>
              ))}
            </div>
            {form.scheduleType === 'scheduled' && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => update('scheduledAt', e.target.value)}
                  className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
                />
              </div>
            )}
          </>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <>
            <h3 className="text-sm font-semibold">Review Campaign</h3>
            <div className="space-y-3">
              {[
                { label: 'Name', value: form.name || '—' },
                { label: 'Category', value: CATEGORIES.find((c) => c.value === form.category)?.label ?? form.category },
                { label: 'Audience', value: form.targetType === 'all' ? 'All customers' : form.targetType === 'segment' ? `Segment: ${form.segmentId}` : `Manual: ${form.targetUserIds.split(',').filter((s) => s.trim()).length} recipients` },
                { label: 'Subject', value: form.subject || '—' },
                { label: 'Schedule', value: form.scheduleType === 'now' ? 'Immediately' : form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : '—' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-text-muted">{r.label}</span>
                  <span className="text-text-primary font-medium">{r.value}</span>
                </div>
              ))}
            </div>

            {/* Policy Preview */}
            <div className="mt-4 p-4 bg-bg-card border border-border-primary rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-text-muted" />
                <p className="text-xs font-semibold text-text-secondary">Policy Preview</p>
              </div>
              {previewLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={14} className="animate-spin text-text-muted" />
                  <span className="text-xs text-text-muted">Evaluating policies…</span>
                </div>
              ) : policyPreview ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-text-muted">Total Targets</p>
                      <p className="text-lg font-semibold">{policyPreview.totalTargets.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-status-success" />
                      <span className="text-sm text-status-success font-medium">{policyPreview.allowedCount.toLocaleString()}</span>
                      <span className="text-xs text-text-muted">({(policyPreview.totalTargets > 0 ? (policyPreview.allowedCount / policyPreview.totalTargets * 100).toFixed(1) : 0)}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle size={14} className="text-status-error" />
                      <span className="text-sm text-status-error font-medium">{policyPreview.blockedCount.toLocaleString()}</span>
                      <span className="text-xs text-text-muted">({(policyPreview.totalTargets > 0 ? (policyPreview.blockedCount / policyPreview.totalTargets * 100).toFixed(1) : 0)}%)</span>
                    </div>
                  </div>
                  {policyPreview.blockedReasons.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-border-primary">
                      <p className="text-xs text-text-muted font-medium">Block Reasons:</p>
                      {policyPreview.blockedReasons.map((br) => (
                        <div key={br.decisionCode} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">{br.reason}</span>
                          <span className="text-text-muted">{br.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Policy preview unavailable</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
        >
          Back
        </button>
        <div className="flex gap-3">
          {step === 5 && (
            <button
              onClick={handleSaveAsDraft}
              disabled={creating}
              className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : null}
              Save as Draft
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleLaunchClick}
              disabled={creating}
              className="px-6 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : null}
              Launch Campaign
            </button>
          )}
        </div>
      </div>

      {/* Launch Modal */}
      {createdCampaignId && (
        <LaunchConfirmationModal
          isOpen={showLaunchModal}
          onClose={() => { setShowLaunchModal(false); router.push('/campaigns'); }}
          campaignId={createdCampaignId}
          campaignName={form.name}
          category={form.category}
          scheduledAt={form.scheduleType === 'scheduled' ? form.scheduledAt : null}
          policyPreview={policyPreview}
          serviceProviderId={spId}
          onLaunched={() => router.push(`/campaigns/${createdCampaignId}`)}
        />
      )}
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6 max-w-3xl">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="h-64 bg-bg-tertiary rounded-xl animate-pulse" />
      </div>
    }>
      <NewCampaignContent />
    </Suspense>
  );
}
