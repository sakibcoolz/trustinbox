'use client';

import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WebhookSubscriptionStatus = 'ACTIVE_SUBSCRIPTION' | 'PAUSED_SUBSCRIPTION' | 'DISABLED';
export type WebhookDeliveryStatus = 'PENDING_DELIVERY' | 'DELIVERING' | 'DELIVERED' | 'FAILED_DELIVERY' | 'EXPIRED';

export interface WebhookSubscription {
  id: string;
  serviceProviderId: string;
  url: string;
  description?: string;
  events: string[];
  status: WebhookSubscriptionStatus;
  failureCount: number;
  maxRetries: number;
  lastDeliveryAt?: string;
  lastFailureAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSubscriptionConnection {
  nodes: WebhookSubscription[];
  totalCount: number;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  eventId: string;
  responseStatus?: number;
  attemptCount: number;
  status: WebhookDeliveryStatus;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface WebhookDeliveryConnection {
  nodes: WebhookDelivery[];
  totalCount: number;
}

export interface TestWebhookResult {
  success: boolean;
  responseStatus?: number;
  responseBody?: string;
  durationMs?: number;
}

export interface CreateWebhookSubscriptionInput {
  serviceProviderId: string;
  url: string;
  description?: string;
  events: string[];
  secret?: string;
}

export interface UpdateWebhookSubscriptionInput {
  subscriptionId: string;
  serviceProviderId: string;
  url?: string;
  description?: string;
  events?: string[];
  status?: WebhookSubscriptionStatus;
  newSecret?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getSubscriptionStatusConfig(status: WebhookSubscriptionStatus) {
  const map: Record<WebhookSubscriptionStatus, { label: string; className: string }> = {
    ACTIVE_SUBSCRIPTION: { label: 'Active', className: 'bg-status-success/10 text-status-success' },
    PAUSED_SUBSCRIPTION: { label: 'Paused', className: 'bg-status-warning/10 text-status-warning' },
    DISABLED: { label: 'Disabled', className: 'bg-status-error/10 text-status-error' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

export function getDeliveryStatusConfig(status: WebhookDeliveryStatus) {
  const map: Record<WebhookDeliveryStatus, { label: string; className: string }> = {
    PENDING_DELIVERY: { label: 'Pending', className: 'bg-border-secondary text-text-muted' },
    DELIVERING: { label: 'Delivering', className: 'bg-accent-blue/10 text-accent-blue' },
    DELIVERED: { label: 'Success', className: 'bg-status-success/10 text-status-success' },
    FAILED_DELIVERY: { label: 'Failed', className: 'bg-status-error/10 text-status-error' },
    EXPIRED: { label: 'Expired', className: 'bg-status-warning/10 text-status-warning' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

export function getHealthStatus(wh: WebhookSubscription): { label: string; color: string; tooltip: string } {
  const now = Date.now();
  const lastDelivery = wh.lastDeliveryAt ? new Date(wh.lastDeliveryAt).getTime() : 0;
  const lastFailure = wh.lastFailureAt ? new Date(wh.lastFailureAt).getTime() : 0;
  const recentDelivery = lastDelivery > 0 && (now - lastDelivery) < 24 * 60 * 60 * 1000;

  if (wh.failureCount >= 5 || (lastFailure > lastDelivery && lastFailure > 0)) {
    return { label: 'Unhealthy', color: 'bg-status-error', tooltip: `Failures: ${wh.failureCount}` };
  }
  if (wh.failureCount > 0 && wh.failureCount < 5) {
    return { label: 'Degraded', color: 'bg-status-warning', tooltip: `Failures: ${wh.failureCount}` };
  }
  if (recentDelivery) {
    return { label: 'Healthy', color: 'bg-status-success', tooltip: 'All deliveries successful' };
  }
  return { label: 'No data', color: 'bg-border-secondary', tooltip: 'No recent deliveries' };
}

export const WEBHOOK_EVENTS = [
  'NotificationDelivered', 'NotificationFailed', 'NotificationBlocked',
  'CallbackCreated', 'CallbackApproved', 'CallbackRejected', 'CallbackCompleted',
  'MessageReceived', 'MessageSent',
  'CampaignLaunched', 'CampaignCompleted',
  'BotActionExecuted', 'BotEscalated',
] as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useWebhookSubscriptions(serviceProviderId: string, status?: WebhookSubscriptionStatus | null) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', '50');
  params.set('offset', '0');
  const qs = params.toString();

  const result = useData<WebhookSubscriptionConnection>(
    serviceProviderId ? `/api/webhooks?${qs}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { webhookSubscriptions: result.data } : undefined };
}

export function useWebhookSubscription(id: string, serviceProviderId: string) {
  const result = useData<WebhookSubscription>(
    id && serviceProviderId ? `/api/webhooks/${id}` : null,
    { skip: !id || !serviceProviderId },
  );
  return { ...result, data: result.data ? { webhookSubscription: result.data } : undefined };
}

export function useWebhookDeliveries(subscriptionId: string, serviceProviderId: string, status?: WebhookDeliveryStatus | null, limit = 25, offset = 0) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const qs = params.toString();

  const result = useData<WebhookDeliveryConnection>(
    subscriptionId && serviceProviderId ? `/api/gateway/v1/webhooks/${subscriptionId}/deliveries?${qs}` : null,
    { skip: !subscriptionId || !serviceProviderId },
  );
  return { ...result, data: result.data ? { webhookDeliveries: result.data } : undefined };
}

export function useCreateWebhookSubscription() {
  const { run, loading, error } = useMutationHelper<WebhookSubscription>();
  return {
    create: (input: CreateWebhookSubscriptionInput) => run('/api/webhooks', 'POST', input),
    loading,
    error,
  };
}

export function useUpdateWebhookSubscription() {
  const { run, loading, error } = useMutationHelper<WebhookSubscription>();
  return {
    update: (input: UpdateWebhookSubscriptionInput) =>
      run(`/api/webhooks/${input.subscriptionId}`, 'PUT', input),
    loading,
    error,
  };
}

export function useDeleteWebhookSubscription() {
  const { run, loading, error } = useMutationHelper();
  return {
    deleteWebhook: (subscriptionId: string, serviceProviderId: string) =>
      run(`/api/webhooks/${subscriptionId}`, 'DELETE', { serviceProviderId }),
    loading,
    error,
  };
}

export function useTestWebhookSubscription() {
  const { run, loading, error } = useMutationHelper<TestWebhookResult>();
  return {
    test: (subscriptionId: string, serviceProviderId: string) =>
      run(`/api/webhooks/${subscriptionId}/test`, 'POST', { serviceProviderId }),
    result: null as TestWebhookResult | null,
    loading,
    error,
  };
}

export function useRetryWebhookDelivery() {
  const { run, loading, error } = useMutationHelper();
  return {
    retry: (deliveryId: string, serviceProviderId: string) =>
      run(`/api/gateway/v1/webhooks/deliveries/${deliveryId}/retry`, 'POST', { serviceProviderId }),
    loading,
    error,
  };
}

// Subscription stub — will be replaced with SSE in Phase 4
export function useWebhookDeliveryUpdates(_serviceProviderId: string, _onDelivery?: (d: WebhookDelivery) => void) {
  return { data: undefined as { providerWebhookDeliveryCompleted: WebhookDelivery } | undefined };
}
