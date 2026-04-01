import { gql, useQuery } from '@apollo/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalyticsDateVars {
  serviceProviderId: string;
  from: string;
  to: string;
}

export interface AnalyticsOverviewData {
  notificationsSent: number;
  notificationsDelivered: number;
  notificationsRead: number;
  notificationsRejected: number;
  callbacksRequested: number;
  callbacksApproved: number;
  callbacksRejected: number;
  messagesSent: number;
  messagesReceived: number;
  documentsShared: number;
  campaignsLaunched: number;
  botActions: number;
  botEscalations: number;
  spamReports: number;
  policyDenials: number;
  webhookDeliveries: number;
  webhookFailures: number;
  activeConversations: number;
  deliveryRate: number;
  readRate: number;
}

export interface DailyAnalyticsEntry {
  date: string;
  notificationsSent: number;
  notificationsDelivered: number;
  notificationsRead: number;
  callbacksRequested: number;
  callbacksApproved: number;
  messagesSent: number;
  documentsShared: number;
  botActions: number;
  spamReports: number;
  policyDenials: number;
}

export interface NotificationAnalyticsData {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalRejected: number;
  deliveryRate: number;
  readRate: number;
}

export interface CallbackAnalyticsData {
  totalRequested: number;
  totalApproved: number;
  totalRejected: number;
  totalExpired: number;
  approvalRate: number;
  avgResponseTimeHours: number;
}

export interface BotPerformanceData {
  totalConversations: number;
  totalMessages: number;
  totalActions: number;
  totalEscalations: number;
  escalationRate: number;
  avgResponseTimeMs: number;
  resolutionRate: number;
  satisfactionScore: number;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const GET_ANALYTICS_OVERVIEW = gql`
  query GetAnalyticsOverview($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
    dashboardAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
      notificationsSent
      notificationsDelivered
      notificationsRead
      notificationsRejected
      callbacksRequested
      callbacksApproved
      callbacksRejected
      messagesSent
      messagesReceived
      documentsShared
      campaignsLaunched
      botActions
      botEscalations
      spamReports
      policyDenials
      webhookDeliveries
      webhookFailures
      activeConversations
      deliveryRate
      readRate
    }
  }
`;

export const GET_DAILY_ANALYTICS = gql`
  query GetDailyAnalytics($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
    dailyAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
      date
      notificationsSent
      notificationsDelivered
      notificationsRead
      callbacksRequested
      callbacksApproved
      messagesSent
      documentsShared
      botActions
      spamReports
      policyDenials
    }
  }
`;

export const GET_NOTIFICATION_ANALYTICS = gql`
  query GetNotificationAnalytics($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
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

export const GET_CALLBACK_ANALYTICS = gql`
  query GetCallbackAnalytics($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
    callbackAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
      totalRequested
      totalApproved
      totalRejected
      totalExpired
      approvalRate
      avgResponseTimeHours
    }
  }
`;

export const GET_BOT_PERFORMANCE_ANALYTICS = gql`
  query GetBotPerformanceAnalytics($serviceProviderId: ID!, $botId: ID!, $from: DateTime, $to: DateTime) {
    botPerformanceAnalytics(serviceProviderId: $serviceProviderId, botId: $botId, from: $from, to: $to) {
      totalConversations
      totalMessages
      totalActions
      totalEscalations
      escalationRate
      avgResponseTimeMs
      resolutionRate
      satisfactionScore
    }
  }
`;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAnalyticsOverview(vars: AnalyticsDateVars) {
  return useQuery<{ dashboardAnalytics: AnalyticsOverviewData }>(GET_ANALYTICS_OVERVIEW, {
    variables: vars,
    skip: !vars.serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useDailyAnalytics(vars: AnalyticsDateVars) {
  return useQuery<{ dailyAnalytics: DailyAnalyticsEntry[] }>(GET_DAILY_ANALYTICS, {
    variables: vars,
    skip: !vars.serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useNotificationAnalytics(vars: AnalyticsDateVars) {
  return useQuery<{ notificationAnalytics: NotificationAnalyticsData }>(GET_NOTIFICATION_ANALYTICS, {
    variables: vars,
    skip: !vars.serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useCallbackAnalytics(vars: AnalyticsDateVars) {
  return useQuery<{ callbackAnalytics: CallbackAnalyticsData }>(GET_CALLBACK_ANALYTICS, {
    variables: vars,
    skip: !vars.serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useBotPerformanceAnalytics(vars: { serviceProviderId: string; botId: string; from?: string; to?: string }) {
  return useQuery<{ botPerformanceAnalytics: BotPerformanceData }>(GET_BOT_PERFORMANCE_ANALYTICS, {
    variables: vars,
    skip: !vars.serviceProviderId || !vars.botId,
    fetchPolicy: 'cache-and-network',
  });
}
