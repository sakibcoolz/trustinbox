'use client';

import { useState, useCallback } from 'react';
import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CampaignStatus = 'DRAFT_CAMPAIGN' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
export type NotificationCategory = 'PERSONAL' | 'ORGANIZATIONAL' | 'ADVERTISEMENT';

export interface Campaign {
  id: string;
  serviceProviderId: string;
  name: string;
  description?: string;
  category: NotificationCategory;
  status: CampaignStatus;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignConnection {
  nodes: Campaign[];
  totalCount: number;
}

export interface CreateCampaignInput {
  serviceProviderId: string;
  name: string;
  description?: string;
  category: NotificationCategory;
  subject: string;
  body: string;
  scheduledAt?: string | null;
}

export interface UpdateCampaignInput {
  campaignId: string;
  serviceProviderId: string;
  name?: string;
  description?: string;
  scheduledAt?: string | null;
}

export interface CampaignAnalytics {
  totalTargets: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalSkipped: number;
  deliveryRate: number;
  readRate: number;
}

export interface PolicyBlockReason {
  decisionCode: string;
  reason: string;
  count: number;
}

export interface CampaignPolicyPreview {
  totalTargets: number;
  allowedCount: number;
  blockedCount: number;
  blockedReasons: PolicyBlockReason[];
}

export type CampaignTargetStatus = 'PENDING' | 'POLICY_CHECKING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED';

export interface CampaignTarget {
  id: string;
  userId: string;
  status: CampaignTargetStatus;
  policyDecision?: string;
  policyReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedReason?: string;
}

export interface CampaignTargetConnection {
  nodes: CampaignTarget[];
  totalCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getStatusConfig(status: CampaignStatus) {
  const map: Record<CampaignStatus, { label: string; className: string }> = {
    DRAFT_CAMPAIGN: { label: 'Draft', className: 'bg-border-secondary text-text-muted' },
    SCHEDULED: { label: 'Scheduled', className: 'bg-accent-blue/10 text-accent-blue' },
    RUNNING: { label: 'Active', className: 'bg-status-success/10 text-status-success' },
    COMPLETED: { label: 'Completed', className: 'bg-accent-purple/10 text-accent-purple' },
    CANCELLED: { label: 'Cancelled', className: 'bg-status-error/10 text-status-error' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

export function getCategoryConfig(category: NotificationCategory) {
  const map: Record<NotificationCategory, { label: string; className: string }> = {
    PERSONAL: { label: 'Personal', className: 'bg-accent-blue/10 text-accent-blue' },
    ORGANIZATIONAL: { label: 'Organizational', className: 'bg-accent-purple/10 text-accent-purple' },
    ADVERTISEMENT: { label: 'Advertisement', className: 'bg-accent-orange/10 text-accent-orange' },
  };
  return map[category] ?? { label: category, className: 'bg-border-secondary text-text-muted' };
}

export function getTargetStatusConfig(status: CampaignTargetStatus) {
  const map: Record<CampaignTargetStatus, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-border-secondary text-text-muted' },
    POLICY_CHECKING: { label: 'Checking', className: 'bg-accent-orange/10 text-accent-orange' },
    SENT: { label: 'Sent', className: 'bg-accent-blue/10 text-accent-blue' },
    DELIVERED: { label: 'Delivered', className: 'bg-status-success/10 text-status-success' },
    READ: { label: 'Read', className: 'bg-accent-purple/10 text-accent-purple' },
    FAILED: { label: 'Failed', className: 'bg-status-error/10 text-status-error' },
    SKIPPED: { label: 'Skipped', className: 'bg-border-secondary text-text-muted' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCampaigns(variables: { serviceProviderId: string; status?: CampaignStatus | null; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (variables.status) params.set('status', variables.status);
  params.set('limit', String(variables.limit ?? 25));
  params.set('offset', String(variables.offset ?? 0));
  const qs = params.toString();

  const result = useData<CampaignConnection>(
    variables.serviceProviderId ? `/api/campaigns?${qs}` : null,
    { skip: !variables.serviceProviderId },
  );
  return { ...result, data: result.data ? { campaigns: result.data } : undefined };
}

export function useCampaign(id: string, serviceProviderId: string) {
  const result = useData<Campaign>(
    id && serviceProviderId ? `/api/campaigns/${id}` : null,
    { skip: !id || !serviceProviderId },
  );
  return { ...result, data: result.data ? { campaign: result.data } : undefined };
}

export function useCampaignAnalytics(variables: { serviceProviderId: string; campaignId: string; from: string; to: string }, skip?: boolean) {
  const params = new URLSearchParams({ from: variables.from, to: variables.to });
  const result = useData<CampaignAnalytics>(
    !skip && variables.campaignId ? `/api/gateway/v1/campaigns/${variables.campaignId}/analytics?${params}` : null,
    { skip: skip || !variables.campaignId },
  );
  return { ...result, data: result.data ? { campaignAnalytics: result.data } : undefined };
}

export function useCampaignTargets(variables: { campaignId: string; serviceProviderId: string; status?: CampaignTargetStatus | null; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (variables.status) params.set('status', variables.status);
  params.set('limit', String(variables.limit ?? 25));
  params.set('offset', String(variables.offset ?? 0));
  const qs = params.toString();

  const result = useData<CampaignTargetConnection>(
    variables.campaignId ? `/api/gateway/v1/campaigns/${variables.campaignId}/targets?${qs}` : null,
    { skip: !variables.campaignId },
  );
  return { ...result, data: result.data ? { campaignTargets: result.data } : undefined };
}

export function usePreviewCampaignPolicy() {
  const [result, setResult] = useState<CampaignPolicyPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const preview = useCallback(async (input: { serviceProviderId: string; category: NotificationCategory; targetUserIds: string[] }) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch('/api/gateway/v1/campaigns/policy-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Policy preview failed');
      const data = await res.json();
      setResult(data);
      return data;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { preview, result, loading, error };
}

export function useCreateCampaign() {
  const { run, loading, error } = useMutationHelper<Campaign>();
  return {
    create: (input: CreateCampaignInput) => run('/api/campaigns', 'POST', input),
    loading,
    error,
  };
}

export function useUpdateCampaign() {
  const { run, loading, error } = useMutationHelper<Campaign>();
  return {
    update: (input: UpdateCampaignInput) => run(`/api/campaigns/${input.campaignId}`, 'PUT', input),
    loading,
    error,
  };
}

export function useLaunchCampaign() {
  const { run, loading, error } = useMutationHelper<Campaign>();
  return {
    launch: (campaignId: string, serviceProviderId: string) =>
      run(`/api/campaigns/${campaignId}/launch`, 'POST', { serviceProviderId }),
    loading,
    error,
  };
}

export function useCancelCampaign() {
  const { run, loading, error } = useMutationHelper();
  return {
    cancel: (campaignId: string, serviceProviderId: string) =>
      run(`/api/campaigns/${campaignId}/cancel`, 'POST', { serviceProviderId }),
    loading,
    error,
  };
}

// Subscription stub — will be replaced with SSE in Phase 4
export function useCampaignProgressUpdated(_serviceProviderId: string) {
  return { data: undefined as { providerCampaignProgressUpdated: Campaign } | undefined };
}
