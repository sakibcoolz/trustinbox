import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';

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

// ─── Fragments ───────────────────────────────────────────────────────────────

export const WEBHOOK_SUBSCRIPTION_FIELDS = gql`
  fragment WebhookSubscriptionFields on WebhookSubscription {
    id
    serviceProviderId
    url
    description
    events
    status
    failureCount
    maxRetries
    lastDeliveryAt
    lastFailureAt
    createdAt
    updatedAt
  }
`;

export const WEBHOOK_DELIVERY_FIELDS = gql`
  fragment WebhookDeliveryFields on WebhookDelivery {
    id
    subscriptionId
    eventType
    eventId
    responseStatus
    attemptCount
    status
    durationMs
    createdAt
    completedAt
  }
`;

// ─── Queries (12.10) ────────────────────────────────────────────────────────

export const GET_WEBHOOK_SUBSCRIPTIONS = gql`
  ${WEBHOOK_SUBSCRIPTION_FIELDS}
  query GetWebhookSubscriptions($serviceProviderId: ID!, $status: WebhookSubscriptionStatus, $limit: Int, $offset: Int) {
    webhookSubscriptions(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        ...WebhookSubscriptionFields
      }
      totalCount
    }
  }
`;

export const GET_WEBHOOK_SUBSCRIPTION = gql`
  ${WEBHOOK_SUBSCRIPTION_FIELDS}
  query GetWebhookSubscription($id: ID!, $serviceProviderId: ID!) {
    webhookSubscription(id: $id, serviceProviderId: $serviceProviderId) {
      ...WebhookSubscriptionFields
    }
  }
`;

export const GET_WEBHOOK_DELIVERIES = gql`
  ${WEBHOOK_DELIVERY_FIELDS}
  query GetWebhookDeliveries($subscriptionId: ID!, $serviceProviderId: ID!, $status: WebhookDeliveryStatus, $limit: Int, $offset: Int) {
    webhookDeliveries(subscriptionId: $subscriptionId, serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        ...WebhookDeliveryFields
      }
      totalCount
    }
  }
`;

// ─── Mutations (12.9) ───────────────────────────────────────────────────────

export const CREATE_WEBHOOK_SUBSCRIPTION = gql`
  ${WEBHOOK_SUBSCRIPTION_FIELDS}
  mutation CreateWebhookSubscription($input: CreateWebhookSubscriptionInput!) {
    createWebhookSubscription(input: $input) {
      ...WebhookSubscriptionFields
    }
  }
`;

export const UPDATE_WEBHOOK_SUBSCRIPTION = gql`
  ${WEBHOOK_SUBSCRIPTION_FIELDS}
  mutation UpdateWebhookSubscription($input: UpdateWebhookSubscriptionInput!) {
    updateWebhookSubscription(input: $input) {
      ...WebhookSubscriptionFields
    }
  }
`;

export const DELETE_WEBHOOK_SUBSCRIPTION = gql`
  mutation DeleteWebhookSubscription($subscriptionId: ID!, $serviceProviderId: ID!) {
    deleteWebhookSubscription(subscriptionId: $subscriptionId, serviceProviderId: $serviceProviderId)
  }
`;

export const TEST_WEBHOOK_SUBSCRIPTION = gql`
  mutation TestWebhookSubscription($subscriptionId: ID!, $serviceProviderId: ID!) {
    testWebhookSubscription(subscriptionId: $subscriptionId, serviceProviderId: $serviceProviderId) {
      success
      responseStatus
      responseBody
      durationMs
    }
  }
`;

export const RETRY_WEBHOOK_DELIVERY = gql`
  mutation RetryWebhookDelivery($deliveryId: ID!, $serviceProviderId: ID!) {
    retryWebhookDelivery(deliveryId: $deliveryId, serviceProviderId: $serviceProviderId)
  }
`;

// ─── Subscription (12.11) ───────────────────────────────────────────────────

export const WEBHOOK_DELIVERY_COMPLETED = gql`
  ${WEBHOOK_DELIVERY_FIELDS}
  subscription WebhookDeliveryCompleted($serviceProviderId: ID!) {
    providerWebhookDeliveryCompleted(serviceProviderId: $serviceProviderId) {
      ...WebhookDeliveryFields
    }
  }
`;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useWebhookSubscriptions(serviceProviderId: string, status?: WebhookSubscriptionStatus | null) {
  return useQuery<{ webhookSubscriptions: WebhookSubscriptionConnection }>(GET_WEBHOOK_SUBSCRIPTIONS, {
    variables: { serviceProviderId, status, limit: 50, offset: 0 },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useWebhookSubscription(id: string, serviceProviderId: string) {
  return useQuery<{ webhookSubscription: WebhookSubscription }>(GET_WEBHOOK_SUBSCRIPTION, {
    variables: { id, serviceProviderId },
    skip: !id || !serviceProviderId,
  });
}

export function useWebhookDeliveries(subscriptionId: string, serviceProviderId: string, status?: WebhookDeliveryStatus | null, limit = 25, offset = 0) {
  return useQuery<{ webhookDeliveries: WebhookDeliveryConnection }>(GET_WEBHOOK_DELIVERIES, {
    variables: { subscriptionId, serviceProviderId, status, limit, offset },
    skip: !subscriptionId || !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useCreateWebhookSubscription() {
  const [create, result] = useMutation(CREATE_WEBHOOK_SUBSCRIPTION, {
    refetchQueries: ['GetWebhookSubscriptions'],
  });
  return {
    create: (input: CreateWebhookSubscriptionInput) => create({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useUpdateWebhookSubscription() {
  const [update, result] = useMutation(UPDATE_WEBHOOK_SUBSCRIPTION, {
    refetchQueries: ['GetWebhookSubscriptions'],
  });
  return {
    update: (input: UpdateWebhookSubscriptionInput) => update({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useDeleteWebhookSubscription() {
  const [del, result] = useMutation(DELETE_WEBHOOK_SUBSCRIPTION, {
    refetchQueries: ['GetWebhookSubscriptions'],
  });
  return {
    deleteWebhook: (subscriptionId: string, serviceProviderId: string) =>
      del({ variables: { subscriptionId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useTestWebhookSubscription() {
  const [test, result] = useMutation<{ testWebhookSubscription: TestWebhookResult }>(TEST_WEBHOOK_SUBSCRIPTION);
  return {
    test: (subscriptionId: string, serviceProviderId: string) =>
      test({ variables: { subscriptionId, serviceProviderId } }),
    result: result.data?.testWebhookSubscription ?? null,
    loading: result.loading,
    error: result.error,
  };
}

export function useRetryWebhookDelivery() {
  const [retry, result] = useMutation(RETRY_WEBHOOK_DELIVERY, {
    refetchQueries: ['GetWebhookDeliveries'],
  });
  return {
    retry: (deliveryId: string, serviceProviderId: string) =>
      retry({ variables: { deliveryId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useWebhookDeliveryUpdates(serviceProviderId: string, onDelivery?: (d: WebhookDelivery) => void) {
  return useSubscription<{ providerWebhookDeliveryCompleted: WebhookDelivery }>(WEBHOOK_DELIVERY_COMPLETED, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    onData: ({ data }) => {
      const event = data.data?.providerWebhookDeliveryCompleted;
      if (event && onDelivery) onDelivery(event);
    },
  });
}
