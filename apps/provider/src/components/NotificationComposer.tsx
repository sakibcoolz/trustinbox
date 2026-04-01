'use client';

import { useEffect } from 'react';
import { Eye, AlertTriangle, CheckCircle, Shield, Loader2 } from 'lucide-react';
import CustomerLookup from '@/components/CustomerLookup';
import { useCheckPolicy, type PolicyCheckResult } from '@/lib/graphql/customers';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────

export interface ComposeForm {
  recipients: string[];
  category: string;
  priority: string;
  channel: string;
  subject: string;
  body: string;
  scheduleType: 'now' | 'scheduled';
  scheduledAt: string;
}

export const DEFAULT_COMPOSE_FORM: ComposeForm = {
  recipients: [],
  category: 'PERSONAL',
  priority: 'Normal',
  channel: 'SMS',
  subject: '',
  body: '',
  scheduleType: 'now',
  scheduledAt: '',
};

interface NotificationComposerProps {
  form: ComposeForm;
  setForm: React.Dispatch<React.SetStateAction<ComposeForm>>;
  policyResult: PolicyCheckResult | null;
  policyLoading: boolean;
  onPolicyCheck: () => void;
  disabled?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'SERVICE_PROVIDER', label: 'Organizational' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
];

const CHANNEL_OPTIONS = [
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
  { value: 'IN_APP', label: 'In-App' },
];

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'];

// ─── Main Component ─────────────────────────────────────

export default function NotificationComposer({
  form,
  setForm,
  policyResult,
  policyLoading,
  onPolicyCheck,
  disabled,
}: NotificationComposerProps) {
  function update<K extends keyof ComposeForm>(field: K, value: ComposeForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Classification */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Classification</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active disabled:opacity-50"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => update('priority', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active disabled:opacity-50"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Channel</label>
            <select
              value={form.channel}
              onChange={(e) => update('channel', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active disabled:opacity-50"
            >
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Recipients</h3>
        <CustomerLookup
          mode="multi"
          selected={form.recipients}
          onSelectionChange={(ids) => update('recipients', ids)}
          placeholder="Search customers by name or Virtual ID…"
          maxSelections={50}
          disabled={disabled}
        />
      </div>

      {/* Content */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Content</h3>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Subject</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => update('subject', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active disabled:opacity-50"
            placeholder="Notification subject"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Body</label>
          <textarea
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            disabled={disabled}
            rows={5}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none disabled:opacity-50"
            placeholder="Notification message…"
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Schedule</h3>
        <div className="flex gap-2">
          {(['now', 'scheduled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update('scheduleType', s)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                form.scheduleType === s
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              } disabled:opacity-50`}
            >
              {s === 'now' ? 'Send Now' : 'Schedule'}
            </button>
          ))}
        </div>
        {form.scheduleType === 'scheduled' && (
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => update('scheduledAt', e.target.value)}
            disabled={disabled}
            className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active disabled:opacity-50"
          />
        )}
      </div>

      {/* Policy Pre-Check (5.8) */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Policy Check</h3>
          <button
            type="button"
            onClick={onPolicyCheck}
            disabled={disabled || policyLoading || form.recipients.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {policyLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            {policyLoading ? 'Checking…' : 'Check Policy'}
          </button>
        </div>

        {form.recipients.length === 0 && (
          <p className="text-xs text-text-muted">Add at least one recipient to check policy.</p>
        )}

        {policyResult && <PolicyResultDisplay result={policyResult} />}
      </div>
    </div>
  );
}

// ─── Policy Result Display ──────────────────────────────

export function PolicyResultDisplay({ result }: { result: PolicyCheckResult }) {
  const isAllowed = result.allowed;
  const Icon = isAllowed ? CheckCircle : result.decisionCode === 'DND_ACTIVE' ? Shield : AlertTriangle;
  const colorClass = isAllowed ? 'status-success' : 'status-error';

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg ${
        isAllowed ? 'bg-status-success/10 border border-status-success/20' : 'bg-status-error/10 border border-status-error/20'
      }`}
    >
      <Icon size={16} className={`text-${colorClass} mt-0.5`} />
      <div className="flex-1">
        <p className={`text-sm font-medium text-${colorClass}`}>
          {isAllowed ? 'Policy Passed' : 'Policy Blocked'}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{result.reason}</p>
        {result.appliedRules.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {result.appliedRules.map((rule) => (
              <span key={rule} className="px-2 py-0.5 bg-bg-hover rounded text-xs text-text-secondary">
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
