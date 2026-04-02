'use client';

import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

// ─── Types ──────────────────────────────────────────────

export interface NotificationNode {
  id: string;
  category: 'PERSONAL' | 'SERVICE_PROVIDER' | 'ADVERTISEMENT';
  title: string;
  body: string;
  priority: string;
  status: string;
  channel: string;
  recipientVirtualId: string;
  metadata?: Record<string, unknown>;
  serviceProvider: { id: string; name: string };
  createdAt: string;
  deliveredAt?: string;
}

export interface NotificationConnection {
  nodes: NotificationNode[];
  totalCount: number;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalRejected: number;
  deliveryRate: number;
  readRate: number;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  status: string;
  timestamp: string;
  channel: string;
  errorMessage?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  decisionCode: string;
  reason: string;
  appliedRules: string[];
  evaluatedAt: string;
}

export interface NotificationDetail extends NotificationNode {
  deliveryAttempts: DeliveryAttempt[];
  policyDecision: PolicyDecision;
}

export interface NotificationListOptions {
  category?: string | string[];
  status?: string | string[];
  channel?: string | string[];
  search?: string;
  dateRange?: { from: string; to: string };
  limit?: number;
  offset?: number;
}

export interface SendNotificationInput {
  recipientIds: string[];
  category: string;
  channel: string;
  title: string;
  body: string;
  priority: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: string;
}

// ─── Status Helpers ─────────────────────────────────────

export type NotificationStatus = 'DELIVERED' | 'PENDING' | 'FAILED' | 'BLOCKED' | 'RATE_LIMITED' | 'PARTIAL';

export function getNotificationStatusVariant(status: string) {
  const map: Record<string, string> = {
    DELIVERED: 'success',
    PENDING: 'warning',
    FAILED: 'error',
    BLOCKED: 'neutral',
    RATE_LIMITED: 'cyan',
    PARTIAL: 'info',
  };
  return (map[status.toUpperCase()] ?? 'neutral') as 'success' | 'warning' | 'error' | 'neutral' | 'cyan' | 'info';
}

export function getNotificationStatusIcon(status: string) {
  const map: Record<string, string> = {
    DELIVERED: 'CheckCircle',
    PENDING: 'Clock',
    FAILED: 'XCircle',
    BLOCKED: 'Shield',
    RATE_LIMITED: 'AlertTriangle',
    PARTIAL: 'AlertCircle',
  };
  return map[status.toUpperCase()] ?? 'Circle';
}

export function getCategoryVariant(category: string) {
  const map: Record<string, string> = {
    PERSONAL: 'info',
    SERVICE_PROVIDER: 'purple',
    ADVERTISEMENT: 'warning',
  };
  return (map[category.toUpperCase()] ?? 'neutral') as 'info' | 'purple' | 'warning' | 'neutral';
}

export function getCategoryLabel(category: string) {
  const map: Record<string, string> = {
    PERSONAL: 'Personal',
    SERVICE_PROVIDER: 'Organizational',
    ADVERTISEMENT: 'Advertisement',
  };
  return map[category.toUpperCase()] ?? category;
}

// ─── Helper ─────────────────────────────────────────────

function buildListParams(options: NotificationListOptions): string {
  const params = new URLSearchParams();
  const cat = Array.isArray(options.category) ? (options.category.length === 1 ? options.category[0] : undefined) : options.category;
  const stat = Array.isArray(options.status) ? (options.status.length === 1 ? options.status[0] : undefined) : options.status;
  const ch = Array.isArray(options.channel) ? (options.channel.length === 1 ? options.channel[0] : undefined) : options.channel;
  if (cat) params.set('category', cat);
  if (stat) params.set('status', stat);
  if (ch) params.set('channel', ch);
  if (options.search) params.set('search', options.search);
  if (options.dateRange?.from) params.set('from', options.dateRange.from);
  if (options.dateRange?.to) params.set('to', options.dateRange.to);
  params.set('limit', String(options.limit ?? 25));
  params.set('offset', String(options.offset ?? 0));
  return params.toString();
}

// ─── Hooks ──────────────────────────────────────────────

export function useNotifications(options: NotificationListOptions) {
  const qs = buildListParams(options);
  const result = useData<NotificationConnection>(`/api/notifications?${qs}`);
  return { ...result, data: result.data ? { notifications: result.data } : undefined };
}

export function useNotificationDetail(id: string | null) {
  const result = useData<NotificationDetail>(
    id ? `/api/gateway/v1/notifications/${id}` : null,
    { skip: !id },
  );
  return { ...result, data: result.data ? { notification: result.data } : undefined };
}

export function useNotificationStats(spId: string, dateRange: { from: string; to: string }) {
  const params = new URLSearchParams({ serviceProviderId: spId, ...dateRange });
  const result = useData<NotificationAnalytics>(
    spId ? `/api/analytics/notifications?${params}` : null,
    { skip: !spId },
  );
  return { ...result, data: result.data ? { notificationAnalytics: result.data } : undefined };
}

export function useSendNotification() {
  const { run, loading, error } = useMutationHelper<NotificationNode>();
  return {
    send: (input: SendNotificationInput) => run('/api/notifications', 'POST', input),
    data: null as NotificationNode | null,
    loading,
    error,
  };
}

export function useRetryNotification() {
  const { run, loading, error } = useMutationHelper();
  return {
    retry: (id: string) => run(`/api/gateway/v1/notifications/${id}/retry`, 'POST'),
    loading,
    error,
  };
}

// Subscription stub — will be replaced with SSE in Phase 4
export function useNotificationLiveUpdates(_spId: string) {
  return null;
}

// Re-export policy check from customers for notification-specific import
export { useCheckPolicy } from './customers';
