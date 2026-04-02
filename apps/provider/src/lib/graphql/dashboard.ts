import { useData } from '@/lib/hooks/useData';

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

// ─── Hooks ──────────────────────────────────────────────

export function useDashboardAnalytics(spId: string, dateRange: DateRangeInput) {
  const params = new URLSearchParams();
  if (dateRange.from) params.set('from', dateRange.from);
  if (dateRange.to) params.set('to', dateRange.to);
  const url = spId ? `/api/analytics/dashboard?${params}` : null;
  const result = useData<DashboardAnalytics>(url, { skip: !spId, deps: [dateRange.from, dateRange.to] });
  return { ...result, data: result.data ? { dashboardAnalytics: result.data } : undefined };
}

export function useDashboardLiveUpdates(
  _spId: string,
  _onUpdate?: (event: DashboardLiveUpdate) => void,
) {
  // Subscription replaced by SSE in Phase 4
  return { data: undefined };
}
