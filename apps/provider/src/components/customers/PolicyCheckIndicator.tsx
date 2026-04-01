'use client';

import { useState } from 'react';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useCheckPolicy, type PolicyCheckResult } from '@/lib/graphql/customers';
import { useAuth } from '@/contexts/AuthContext';

interface PolicyCheckIndicatorProps {
  defaultCategory?: string;
  defaultChannel?: string;
}

const CATEGORIES = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'SERVICE_PROVIDER', label: 'Organizational' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
];

const CHANNELS = [
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
  { value: 'IN_APP', label: 'In-App' },
];

export function PolicyCheckIndicator({ defaultCategory, defaultChannel }: PolicyCheckIndicatorProps) {
  const { activeServiceProvider } = useAuth();
  const { checkPolicy, result, loading, error } = useCheckPolicy();
  const [category, setCategory] = useState(defaultCategory ?? '');
  const [channel, setChannel] = useState(defaultChannel ?? '');

  function handleCheck() {
    if (!activeServiceProvider?.id || !category || !channel) return;
    checkPolicy(activeServiceProvider.id, category, channel);
  }

  return (
    <Card>
      <CardHeader title="Policy Check" />
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-active"
              >
                <option value="">Select…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-active"
              >
                <option value="">Select…</option>
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCheck}
            disabled={!category || !channel || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
            Check
          </button>

          {/* Result */}
          {result && <PolicyResult result={result} />}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning/10 border border-status-warning/20">
              <AlertTriangle size={14} className="text-status-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-status-warning">Policy check unavailable</p>
                <p className="text-[10px] text-text-muted mt-0.5">{error.message}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyResult({ result }: { result: PolicyCheckResult }) {
  if (result.allowed) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-status-success/10 border border-status-success/20">
        <CheckCircle size={14} className="text-status-success mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-status-success">Communication Allowed</p>
          <p className="text-[10px] text-text-muted mt-0.5">{result.reason}</p>
          {result.appliedRules.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {result.appliedRules.map((rule) => (
                <span key={rule} className="text-[9px] px-1.5 py-0.5 rounded-full bg-status-success/10 text-status-success">
                  {rule}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isDND = result.decisionCode === 'DND';
  const bgClass = isDND ? 'bg-accent-orange/10 border-accent-orange/20' : 'bg-status-error/10 border-status-error/20';
  const textClass = isDND ? 'text-accent-orange' : 'text-status-error';
  const IconComp = isDND ? Clock : XCircle;
  const title = isDND ? 'Blocked: Do Not Disturb' : `Blocked: ${result.decisionCode}`;

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg ${bgClass} border`}>
      <IconComp size={14} className={`${textClass} mt-0.5 shrink-0`} />
      <div>
        <p className={`text-xs font-medium ${textClass}`}>{title}</p>
        <p className="text-[10px] text-text-muted mt-0.5">{result.reason}</p>
        {result.appliedRules.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {result.appliedRules.map((rule) => (
              <span key={rule} className="text-[9px] px-1.5 py-0.5 rounded-full bg-status-error/10 text-status-error">
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
