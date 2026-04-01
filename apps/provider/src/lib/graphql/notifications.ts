import { gql, useQuery, useLazyQuery, useMutation, useSubscription } from '@apollo/client';

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

// ─── Queries ────────────────────────────────────────────

export const NOTIFICATION_LIST_QUERY = gql`
  query NotificationList(
    $category: NotificationCategory
    $status: String
    $channel: String
    $search: String
    $from: DateTime
    $to: DateTime
    $limit: Int
    $offset: Int
  ) {
    notifications(
      category: $category
      status: $status
      channel: $channel
      search: $search
      from: $from
      to: $to
      limit: $limit
      offset: $offset
    ) {
      nodes {
        id
        category
        title
        body
        priority
        status
        channel
        recipientVirtualId
        metadata
        serviceProvider {
          id
          name
        }
        createdAt
        deliveredAt
      }
      totalCount
    }
  }
`;

export const NOTIFICATION_DETAIL_QUERY = gql`
  query NotificationDetail($id: ID!) {
    notification(id: $id) {
      id
      category
      title
      body
      priority
      status
      channel
      recipientVirtualId
      metadata
      serviceProvider {
        id
        name
      }
      createdAt
      deliveredAt
      deliveryAttempts {
        attemptNumber
        status
        timestamp
        channel
        errorMessage
      }
      policyDecision {
        allowed
        decisionCode
        reason
        appliedRules
        evaluatedAt
      }
    }
  }
`;

export const NOTIFICATION_STATS_QUERY = gql`
  query NotificationStats($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
    notificationAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
      totalSent
      totalDelivered
      totalRead
      totalRejected
      deliveryRate
      readRate
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────

export const SEND_NOTIFICATION_MUTATION = gql`
  mutation SendNotification($input: SendNotificationInput!) {
    sendNotification(input: $input) {
      id
      category
      title
      status
      createdAt
    }
  }
`;

export const RETRY_NOTIFICATION_MUTATION = gql`
  mutation RetryNotification($id: ID!) {
    retryNotification(id: $id) {
      id
      status
      createdAt
    }
  }
`;

// ─── Subscriptions ──────────────────────────────────────

export const NOTIFICATION_DELIVERED_SUBSCRIPTION = gql`
  subscription ProviderNotificationDelivered($serviceProviderId: ID!) {
    providerNotificationDelivered(serviceProviderId: $serviceProviderId) {
      id
      status
      recipientVirtualId
      deliveredAt
      title
    }
  }
`;

// ─── Hooks ──────────────────────────────────────────────

function buildListVariables(options: NotificationListOptions) {
  return {
    category: Array.isArray(options.category)
      ? options.category.length === 1 ? options.category[0] : undefined
      : options.category || undefined,
    status: Array.isArray(options.status)
      ? options.status.length === 1 ? options.status[0] : undefined
      : options.status || undefined,
    channel: Array.isArray(options.channel)
      ? options.channel.length === 1 ? options.channel[0] : undefined
      : options.channel || undefined,
    search: options.search || undefined,
    from: options.dateRange?.from || undefined,
    to: options.dateRange?.to || undefined,
    limit: options.limit ?? 25,
    offset: options.offset ?? 0,
  };
}

export function useNotifications(options: NotificationListOptions) {
  return useQuery<{ notifications: NotificationConnection }>(NOTIFICATION_LIST_QUERY, {
    variables: buildListVariables(options),
    fetchPolicy: 'cache-and-network',
  });
}

export function useNotificationDetail(id: string | null) {
  return useQuery<{ notification: NotificationDetail }>(NOTIFICATION_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });
}

export function useNotificationStats(spId: string, dateRange: { from: string; to: string }) {
  return useQuery<{ notificationAnalytics: NotificationAnalytics }>(NOTIFICATION_STATS_QUERY, {
    variables: { serviceProviderId: spId, ...dateRange },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useSendNotification() {
  const [send, { data, loading, error }] = useMutation(SEND_NOTIFICATION_MUTATION);

  return {
    send: (input: SendNotificationInput) =>
      send({
        variables: { input },
        refetchQueries: ['NotificationList', 'NotificationStats'],
      }),
    data: data?.sendNotification ?? null,
    loading,
    error,
  };
}

export function useRetryNotification() {
  const [retry, { loading, error }] = useMutation(RETRY_NOTIFICATION_MUTATION);

  return {
    retry: (id: string) =>
      retry({
        variables: { id },
        optimisticResponse: {
          retryNotification: { id, status: 'PENDING', createdAt: new Date().toISOString(), __typename: 'Notification' },
        },
      }),
    loading,
    error,
  };
}

export function useNotificationLiveUpdates(spId: string) {
  const { data } = useSubscription(NOTIFICATION_DELIVERED_SUBSCRIPTION, {
    variables: { serviceProviderId: spId },
    skip: !spId,
  });
  return data?.providerNotificationDelivered ?? null;
}

// Re-export policy check from customers for notification-specific import
export { useCheckPolicy } from './customers';
