'use client';

import { useState, useCallback } from 'react';
import { useData } from '@/lib/hooks/useData';

// ─── Types ──────────────────────────────────────────────

export interface CustomerRow {
  virtualId: string;
  displayName: string;
  category: 'PERSONAL' | 'SERVICE_PROVIDER' | 'ADVERTISEMENT';
  lastContactAt: string;
  status: 'ACTIVE' | 'BLOCKED' | 'DND' | 'OPTED_OUT';
  interactionCount: number;
}

export interface CustomerConnection {
  nodes: CustomerRow[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

export interface PrivacyPreference {
  allowPersonalNotifications: boolean;
  allowSPNotifications: boolean;
  allowAdvertisements: boolean;
  allowCallbackRequests: boolean;
  allowChat: boolean;
  allowDocumentShares: boolean;
  requireCallApproval: boolean;
}

export interface DNDRule {
  id: string;
  scopeType: string;
  scopeRefId?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CustomerDetail {
  virtualId: string;
  displayName: string;
  userType: string;
  avatarUrl?: string;
  joinedAt: string;
  lastContactAt: string;
  privacyPreference: PrivacyPreference;
  dndRules: DNDRule[];
  availabilitySlots: AvailabilitySlot[];
  stats: {
    totalNotifications: number;
    deliveredCount: number;
    failedCount: number;
    callbackCount: number;
    documentsShared: number;
  };
}

export interface CustomerNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  channel: string;
  createdAt: string;
}

export interface CustomerCallback {
  id: string;
  reason: string;
  details: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface CustomerNote {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerTag {
  id: string;
  label: string;
  color?: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  decisionCode: string;
  reason: string;
  appliedRules: string[];
}

// ─── Hooks ──────────────────────────────────────────────

export interface CustomerListOptions {
  search?: string;
  category?: string[];
  status?: string[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  first?: number;
  after?: string;
}

export function useCustomers(options: CustomerListOptions) {
  const { search, category, status, sort, first = 25, after } = options;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category?.length === 1) params.set('category', category[0]);
  if (status?.length === 1) params.set('status', status[0]);
  if (sort) {
    params.set('orderByField', sort.field);
    params.set('orderByDirection', sort.direction.toUpperCase());
  }
  params.set('first', String(first));
  if (after) params.set('after', after);
  const qs = params.toString();

  const result = useData<CustomerConnection>(`/api/gateway/v1/customers?${qs}`);
  return { ...result, data: result.data ? { conversations: result.data } : undefined };
}

export function useCustomerDetail(virtualId: string) {
  const result = useData<{ notifications: { nodes: CustomerNotification[]; totalCount: number }; callbackRequests: { nodes: CustomerCallback[]; totalCount: number } }>(
    virtualId ? `/api/gateway/v1/customers/${virtualId}` : null,
    { skip: !virtualId },
  );
  return result;
}

export function useCustomerTimeline(virtualId: string, limit = 20, offset = 0) {
  const result = useData<{ nodes: TimelineEvent[]; totalCount: number }>(
    virtualId ? `/api/gateway/v1/customers/${virtualId}/timeline?limit=${limit}&offset=${offset}` : null,
    { skip: !virtualId },
  );
  return { ...result, data: result.data ? { customerTimeline: result.data } : undefined };
}

export function useCheckPolicy() {
  const [result, setResult] = useState<PolicyCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const checkPolicy = useCallback(async (serviceProviderId: string, category: string, channel: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams({ serviceProviderId, category, channel });
      const res = await fetch(`/api/gateway/v1/policy/check?${params}`);
      if (!res.ok) throw new Error('Policy check failed');
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

  return { checkPolicy, result, loading, error };
}

export function useCustomerNotes(virtualId: string) {
  const result = useData<CustomerNote[]>(
    virtualId ? `/api/gateway/v1/customers/${virtualId}/notes` : null,
    { skip: !virtualId },
  );
  return { ...result, data: result.data ? { customerNotes: result.data } : undefined };
}

export function useCustomerTags(virtualId: string) {
  const result = useData<CustomerTag[]>(
    virtualId ? `/api/gateway/v1/customers/${virtualId}/tags` : null,
    { skip: !virtualId },
  );
  return { ...result, data: result.data ? { customerTags: result.data } : undefined };
}
