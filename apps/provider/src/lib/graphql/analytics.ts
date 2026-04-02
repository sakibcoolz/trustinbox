import { useData } from '@/lib/hooks/useData';

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

// ─── Hooks ───────────────────────────────────────────────────────────────────

function analyticsUrl(path: string, vars: AnalyticsDateVars) {
  const params = new URLSearchParams({ from: vars.from, to: vars.to });
  return vars.serviceProviderId ? `/api/analytics/${path}?${params}` : null;
}

export function useAnalyticsOverview(vars: AnalyticsDateVars) {
  const result = useData<AnalyticsOverviewData>(analyticsUrl('overview', vars), { skip: !vars.serviceProviderId, deps: [vars.from, vars.to] });
  return { ...result, data: result.data ? { dashboardAnalytics: result.data } : undefined };
}

export function useDailyAnalytics(vars: AnalyticsDateVars) {
  const result = useData<DailyAnalyticsEntry[]>(analyticsUrl('daily', vars), { skip: !vars.serviceProviderId, deps: [vars.from, vars.to] });
  return { ...result, data: result.data ? { dailyAnalytics: result.data } : undefined };
}

export function useNotificationAnalytics(vars: AnalyticsDateVars) {
  const result = useData<NotificationAnalyticsData>(analyticsUrl('notifications', vars), { skip: !vars.serviceProviderId, deps: [vars.from, vars.to] });
  return { ...result, data: result.data ? { notificationAnalytics: result.data } : undefined };
}

export function useCallbackAnalytics(vars: AnalyticsDateVars) {
  const result = useData<CallbackAnalyticsData>(analyticsUrl('callbacks', vars), { skip: !vars.serviceProviderId, deps: [vars.from, vars.to] });
  return { ...result, data: result.data ? { callbackAnalytics: result.data } : undefined };
}

export function useBotPerformanceAnalytics(vars: { serviceProviderId: string; botId: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (vars.botId) params.set('botId', vars.botId);
  if (vars.from) params.set('from', vars.from);
  if (vars.to) params.set('to', vars.to);
  const url = vars.serviceProviderId && vars.botId ? `/api/analytics/bots?${params}` : null;
  const result = useData<BotPerformanceData>(url, { skip: !vars.serviceProviderId || !vars.botId, deps: [vars.from, vars.to] });
  return { ...result, data: result.data ? { botPerformanceAnalytics: result.data } : undefined };
}
