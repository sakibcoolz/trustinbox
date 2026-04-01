import { gql, useQuery, useSubscription } from '@apollo/client';

// ─── Types ──────────────────────────────────────────────

export interface DateRangeInput {
  from: string; // ISO date
  to: string;   // ISO date
}

export interface DailyDeliveryEntry {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
}

export interface PolicyBreakdown {
  allowed: number;
  blockedByDND: number;
  blockedByPreference: number;
  rateLimited: number;
  total: number;
}

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  targetId: string;
  targetType: string;
  timestamp: string;
}

export interface DashboardAnalytics {
  notificationsSent: number;
  previousNotificationsSent: number;
  deliveryRate: number;
  previousDeliveryRate: number;
  activeCallbacks: number;
  previousActiveCallbacks: number;
  openConversations: number;
  previousOpenConversations: number;
  activeCampaigns: number;
  previousActiveCampaigns: number;
  botInteractions: number;
  previousBotInteractions: number;

  dailyDelivery: DailyDeliveryEntry[];
  policyBreakdown: PolicyBreakdown;
  recentActivity: ActivityEvent[];
}

export interface DashboardLiveUpdate {
  type: string;
  notificationId?: string;
  status?: string;
  timestamp: string;
  delta?: {
    notificationsSent?: number;
    deliveryRate?: number;
    activeCallbacks?: number;
    openConversations?: number;
  };
}

// ─── Queries ────────────────────────────────────────────

export const DASHBOARD_ANALYTICS_QUERY = gql`
  query DashboardAnalytics($spId: ID!, $dateRange: DateRangeInput!) {
    dashboardAnalytics(spId: $spId, dateRange: $dateRange) {
      notificationsSent
      previousNotificationsSent
      deliveryRate
      previousDeliveryRate
      activeCallbacks
      previousActiveCallbacks
      openConversations
      previousOpenConversations
      activeCampaigns
      previousActiveCampaigns
      botInteractions
      previousBotInteractions

      dailyDelivery {
        date
        sent
        delivered
        failed
      }

      policyBreakdown {
        allowed
        blockedByDND
        blockedByPreference
        rateLimited
        total
      }

      recentActivity {
        id
        type
        title
        description
        targetId
        targetType
        timestamp
      }
    }
  }
`;

// ─── Subscription ───────────────────────────────────────

export const DASHBOARD_LIVE_UPDATES_SUBSCRIPTION = gql`
  subscription DashboardLiveUpdates($spId: ID!) {
    providerNotificationDelivered(spId: $spId) {
      type
      notificationId
      status
      timestamp
      delta {
        notificationsSent
        deliveryRate
        activeCallbacks
        openConversations
      }
    }
  }
`;

// ─── Hooks ──────────────────────────────────────────────

export function useDashboardAnalytics(spId: string, dateRange: DateRangeInput) {
  return useQuery<{ dashboardAnalytics: DashboardAnalytics }>(DASHBOARD_ANALYTICS_QUERY, {
    variables: { spId, dateRange },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useDashboardLiveUpdates(
  spId: string,
  onUpdate?: (event: DashboardLiveUpdate) => void,
) {
  return useSubscription<{ providerNotificationDelivered: DashboardLiveUpdate }>(
    DASHBOARD_LIVE_UPDATES_SUBSCRIPTION,
    {
      variables: { spId },
      skip: !spId,
      onData: ({ data: subData }) => {
        const event = subData?.data?.providerNotificationDelivered;
        if (event && onUpdate) onUpdate(event);
      },
    },
  );
}
