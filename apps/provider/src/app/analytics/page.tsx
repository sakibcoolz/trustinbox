'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDateRange } from '@/hooks/useDateRange';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import {
  useAnalyticsOverview,
  useNotificationAnalytics,
  useCallbackAnalytics,
  useDailyAnalytics,
  type AnalyticsDateVars,
  type AnalyticsOverviewData,
  type NotificationAnalyticsData,
  type CallbackAnalyticsData,
  type DailyAnalyticsEntry,
} from '@/lib/graphql/analytics';
import { useBots, type Bot } from '@/lib/graphql/bots';
import { useCampaigns, type Campaign } from '@/lib/graphql/campaigns';
import { buildCsvString, downloadCsv, sanitizeCsvField } from '@/lib/utils/csv-export';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4 animate-pulse">
      <div className="h-4 w-40 bg-border-primary rounded" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-3 w-16 mx-auto bg-border-primary rounded" />
            <div className="h-5 w-12 mx-auto bg-border-primary rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 animate-pulse space-y-3">
      <div className="h-4 w-48 bg-border-primary rounded" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-8 bg-border-primary/50 rounded" />
      ))}
    </div>
  );
}

// ─── Summary KPI Cards ───────────────────────────────────────────────────────

function SummaryCards({ data, loading }: { data?: AnalyticsOverviewData; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-4 text-center animate-pulse">
            <div className="h-3 w-20 mx-auto bg-border-primary rounded" />
            <div className="h-6 w-14 mx-auto bg-border-primary rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Delivery Rate', value: data?.deliveryRate != null ? `${(data.deliveryRate * 100).toFixed(1)}%` : '—', color: 'text-status-success' },
    { label: 'Read Rate', value: data?.readRate != null ? `${(data.readRate * 100).toFixed(1)}%` : '—', color: 'text-accent-blue' },
    { label: 'Notifications', value: data?.notificationsSent?.toLocaleString() ?? '0', color: 'text-accent-blue' },
    { label: 'Callbacks', value: data?.callbacksRequested?.toLocaleString() ?? '0', color: 'text-accent-purple' },
    { label: 'Campaigns', value: data?.campaignsLaunched?.toLocaleString() ?? '0', color: 'text-status-warning' },
    { label: 'Bot Actions', value: data?.botActions?.toLocaleString() ?? '0', color: 'text-accent-teal' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-bg-card border border-border-primary rounded-xl p-4 text-center">
          <p className="text-xs text-text-muted">{card.label}</p>
          <p className={`text-xl font-semibold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Notification Panel (11.2) ───────────────────────────────────────────────

function NotificationAnalyticsPanel({ dateVars }: { dateVars: AnalyticsDateVars }) {
  const { data, loading, error, refetch } = useNotificationAnalytics(dateVars);

  if (loading) return <PanelSkeleton />;
  if (error) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 text-center">
        <p className="text-sm text-status-error mb-2">Failed to load notification analytics</p>
        <button onClick={() => refetch()} className="text-xs text-accent-blue hover:underline">Retry</button>
      </div>
    );
  }

  const stats = data?.notificationAnalytics;
  const kpis = [
    { label: 'Total Sent', value: stats?.totalSent?.toLocaleString() ?? '0', color: 'text-accent-blue' },
    { label: 'Delivered', value: stats?.totalDelivered?.toLocaleString() ?? '0', color: 'text-status-success' },
    { label: 'Read', value: stats?.totalRead?.toLocaleString() ?? '0', color: 'text-accent-purple' },
    { label: 'Rejected', value: stats?.totalRejected?.toLocaleString() ?? '0', color: 'text-status-error' },
    { label: 'Delivery Rate', value: stats?.deliveryRate != null ? `${(stats.deliveryRate * 100).toFixed(1)}%` : '—', color: 'text-status-success' },
    { label: 'Read Rate', value: stats?.readRate != null ? `${(stats.readRate * 100).toFixed(1)}%` : '—', color: 'text-accent-blue' },
  ];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Notification Analytics</h3>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="text-center">
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="h-40 border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted">
        Delivery rate trend chart — coming soon
      </div>
    </div>
  );
}

// ─── Callback Panel (11.3) ───────────────────────────────────────────────────

function CallbackAnalyticsPanel({ dateVars }: { dateVars: AnalyticsDateVars }) {
  const { data, loading, error, refetch } = useCallbackAnalytics(dateVars);

  if (loading) return <PanelSkeleton />;
  if (error) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 text-center">
        <p className="text-sm text-status-error mb-2">Failed to load callback analytics</p>
        <button onClick={() => refetch()} className="text-xs text-accent-blue hover:underline">Retry</button>
      </div>
    );
  }

  const stats = data?.callbackAnalytics;
  const kpis = [
    { label: 'Total Requested', value: stats?.totalRequested?.toLocaleString() ?? '0', color: 'text-accent-blue' },
    { label: 'Approved', value: stats?.totalApproved?.toLocaleString() ?? '0', color: 'text-status-success' },
    { label: 'Rejected', value: stats?.totalRejected?.toLocaleString() ?? '0', color: 'text-status-error' },
    { label: 'Expired', value: stats?.totalExpired?.toLocaleString() ?? '0', color: 'text-status-warning' },
    { label: 'Approval Rate', value: stats?.approvalRate != null ? `${(stats.approvalRate * 100).toFixed(1)}%` : '—', color: 'text-status-success' },
    { label: 'Avg Response', value: stats?.avgResponseTimeHours != null ? `${stats.avgResponseTimeHours.toFixed(1)}h` : '—', color: 'text-accent-purple' },
  ];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Callback Analytics</h3>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="text-center">
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="h-40 border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted">
        Approval rate trend chart — coming soon
      </div>
    </div>
  );
}

// ─── Campaign Panel (11.4) ───────────────────────────────────────────────────

function CampaignAnalyticsPanel({ dateVars, overview }: { dateVars: AnalyticsDateVars; overview?: AnalyticsOverviewData }) {
  const { data: campaignData, loading } = useCampaigns({ serviceProviderId: dateVars.serviceProviderId, limit: 10 });
  const campaigns = campaignData?.campaigns?.nodes ?? [];

  const campaignsLaunched = overview?.campaignsLaunched ?? 0;

  // Find best performing campaign by delivery rate
  const bestCampaign = campaigns.reduce<Campaign | null>((best, c) => {
    if (!best) return c;
    const bestRate = best.sentCount > 0 ? best.deliveredCount / best.sentCount : 0;
    const cRate = c.sentCount > 0 ? c.deliveredCount / c.sentCount : 0;
    return cRate > bestRate ? c : best;
  }, null);

  const totalTargets = campaigns.reduce((s, c) => s + c.targetCount, 0);
  const totalDelivered = campaigns.reduce((s, c) => s + c.deliveredCount, 0);
  const overallRate = totalTargets > 0 ? ((totalDelivered / totalTargets) * 100).toFixed(1) : '0';

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Campaign Analytics</h3>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="h-3 w-16 mx-auto bg-border-primary rounded" />
              <div className="h-5 w-12 mx-auto bg-border-primary rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xs text-text-muted">Campaigns Launched</p>
              <p className="text-lg font-semibold mt-0.5 text-status-warning">{campaignsLaunched.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Total Recipients</p>
              <p className="text-lg font-semibold mt-0.5 text-accent-blue">{totalTargets.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Delivered</p>
              <p className="text-lg font-semibold mt-0.5 text-status-success">{totalDelivered.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Delivery Rate</p>
              <p className="text-lg font-semibold mt-0.5 text-status-success">{overallRate}%</p>
            </div>
          </div>

          {/* Best performing campaign */}
          {bestCampaign && bestCampaign.sentCount > 0 && (
            <div className="border border-border-secondary rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">Best Performing</p>
              <a href={`/campaigns/${bestCampaign.id}`} className="text-sm font-medium text-accent-blue hover:underline">
                {bestCampaign.name}
              </a>
              <div className="flex gap-4 mt-1 text-xs text-text-secondary">
                <span>{bestCampaign.targetCount.toLocaleString()} targets</span>
                <span>{((bestCampaign.deliveredCount / bestCampaign.sentCount) * 100).toFixed(1)}% delivery</span>
              </div>
            </div>
          )}

          {campaigns.length === 0 && (
            <p className="text-xs text-text-muted text-center py-4">No campaigns found</p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Bot Panel (11.5) ────────────────────────────────────────────────────────

function BotAnalyticsPanel({ dateVars, overview }: { dateVars: AnalyticsDateVars; overview?: AnalyticsOverviewData }) {
  const { data: botsData, loading } = useBots({ serviceProviderId: dateVars.serviceProviderId, status: 'ACTIVE', limit: 5 });
  const bots = botsData?.bots?.nodes ?? [];

  const botActions = overview?.botActions ?? 0;
  const botEscalations = overview?.botEscalations ?? 0;
  const handoffRate = botActions > 0 ? ((botEscalations / botActions) * 100).toFixed(1) : '0';

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Bot Analytics</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs text-text-muted">Actions</p>
          <p className="text-lg font-semibold mt-0.5 text-accent-teal">{botActions.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Escalations</p>
          <p className="text-lg font-semibold mt-0.5 text-status-warning">{botEscalations.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Handoff Rate</p>
          <p className="text-lg font-semibold mt-0.5 text-accent-purple">{handoffRate}%</p>
        </div>
      </div>

      {/* Top bots ranking */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted">Top Performing Bots</p>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-8 bg-border-primary/50 rounded" />
            ))}
          </div>
        ) : (
          <>
            {bots.map((bot: Bot, i: number) => (
              <div key={bot.id} className="flex items-center gap-3 py-2">
                <span className="text-xs text-text-muted w-4">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center text-xs font-medium text-accent-purple">
                  {bot.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bot.name}</p>
                  <p className="text-xs text-text-muted">{bot.purpose}</p>
                </div>
                <a href={`/bots/${bot.id}`} className="text-xs text-accent-blue hover:underline shrink-0">View</a>
              </div>
            ))}
            {bots.length === 0 && (
              <p className="text-xs text-text-muted py-4 text-center">No active bots</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Policy Panel (11.6) ─────────────────────────────────────────────────────

function PolicyAnalyticsPanel({ overview }: { overview?: AnalyticsOverviewData }) {
  if (!overview) return <PanelSkeleton />;

  const { policyDenials, spamReports, notificationsSent } = overview;
  const total = notificationsSent + policyDenials;
  const allowed = notificationsSent;
  const blocked = policyDenials;
  const blockedPct = total > 0 ? ((blocked / total) * 100).toFixed(1) : '0';
  const allowedPct = total > 0 ? ((allowed / total) * 100).toFixed(1) : '0';

  // Build recommendations
  const recommendations: string[] = [];
  if (total > 0 && blocked > 0) {
    if (spamReports > 0 && (spamReports / blocked) > 0.2) {
      recommendations.push('High spam report ratio — review notification content quality');
    }
    if ((blocked / total) > 0.15) {
      recommendations.push('Review category targeting — significant portion being blocked');
    }
    if ((blocked / total) > 0.3) {
      recommendations.push('Reduce notification frequency — block rate exceeds 30%');
    }
  }

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Policy Analytics</h3>

      {/* Allowed vs Blocked visual */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 36 36" className="w-full h-full">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-border-secondary"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-status-success"
              strokeWidth="3"
              strokeDasharray={`${allowedPct}, 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-semibold">{total.toLocaleString()}</p>
              <p className="text-[10px] text-text-muted">total</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-status-success">Allowed</span>
            <span className="font-medium">{allowed.toLocaleString()} ({allowedPct}%)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-status-error">Blocked</span>
            <span className="font-medium">{blocked.toLocaleString()} ({blockedPct}%)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-status-error">Spam Reports</span>
            <span className="font-medium">{spamReports.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Block bar */}
      {total > 0 && (
        <div className="w-full h-2 bg-status-error/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-status-success rounded-full transition-all"
            style={{ width: `${allowedPct}%` }}
          />
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border-primary">
          <p className="text-xs text-text-muted">Recommendations</p>
          {recommendations.map((rec, i) => (
            <p key={i} className="text-xs text-status-warning flex gap-2">
              <span className="shrink-0">⚠</span>
              {rec}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Daily Table (11.7) ──────────────────────────────────────────────────────

type SortKey = keyof DailyAnalyticsEntry;

const DAILY_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'notificationsSent', label: 'Notif. Sent' },
  { key: 'notificationsDelivered', label: 'Delivered' },
  { key: 'notificationsRead', label: 'Read' },
  { key: 'callbacksRequested', label: 'Callbacks' },
  { key: 'callbacksApproved', label: 'CB Approved' },
  { key: 'messagesSent', label: 'Messages' },
  { key: 'botActions', label: 'Bot Actions' },
  { key: 'policyDenials', label: 'Denials' },
  { key: 'spamReports', label: 'Spam' },
];

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function DailyAnalyticsTable({ data, loading }: { data?: DailyAnalyticsEntry[]; loading: boolean }) {
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (loading) return <TableSkeleton />;

  const entries = data ?? [];

  if (entries.length === 0) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 text-center">
        <p className="text-sm text-text-muted">No data for selected range</p>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'date' ? 'desc' : 'desc');
    }
  };

  const sorted = [...entries].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const cmp = typeof aVal === 'number' ? (aVal as number) - (bVal as number) : String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const numKeys = DAILY_COLUMNS.filter((c) => c.key !== 'date').map((c) => c.key);
  const totals = entries.reduce((acc, e) => {
    for (const k of numKeys) acc[k] = (acc[k] ?? 0) + (e[k] as number);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Daily Breakdown</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-text-muted border-b border-border-primary">
              {DAILY_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`py-2 px-3 text-left cursor-pointer select-none hover:text-text-primary transition-colors ${col.key === 'date' ? 'sticky left-0 bg-bg-card z-10' : ''}`}
                >
                  {col.label} {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.date} className="border-b border-border-primary last:border-0 hover:bg-bg-hover/50">
                <td className="py-2 px-3 text-xs font-medium sticky left-0 bg-bg-card">{formatShortDate(entry.date)}</td>
                <td className="py-2 px-3 text-xs">{entry.notificationsSent.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs">{entry.notificationsDelivered.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs">{entry.notificationsRead.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs">{entry.callbacksRequested.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs">{entry.callbacksApproved.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs">{entry.messagesSent.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs">{entry.botActions.toLocaleString()}</td>
                <td className="py-2 px-3 text-xs">{entry.policyDenials.toLocaleString()}</td>
                <td className={`py-2 px-3 text-xs ${entry.spamReports > 0 ? 'text-status-error font-medium' : ''}`}>
                  {entry.spamReports.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-primary font-medium">
              <td className="py-2 px-3 text-xs sticky left-0 bg-bg-card">Total</td>
              {numKeys.map((k) => (
                <td key={k} className={`py-2 px-3 text-xs ${k === 'spamReports' && (totals[k] ?? 0) > 0 ? 'text-status-error' : ''}`}>
                  {(totals[k] ?? 0).toLocaleString()}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Export Button (11.8) ────────────────────────────────────────────────────

function ExportButton({ dateVars, dailyData }: { dateVars: AnalyticsDateVars; dailyData?: DailyAnalyticsEntry[] }) {
  const [showDropdown, setShowDropdown] = useState(false);

  function handleExportCsv() {
    const headers = [
      'Date', 'Notifications Sent', 'Delivered', 'Read',
      'Callbacks Requested', 'Callbacks Approved',
      'Messages Sent', 'Bot Actions', 'Policy Denials', 'Spam Reports',
    ];

    const rows = (dailyData ?? []).map((entry) => [
      sanitizeCsvField(entry.date),
      String(entry.notificationsSent),
      String(entry.notificationsDelivered),
      String(entry.notificationsRead),
      String(entry.callbacksRequested),
      String(entry.callbacksApproved),
      String(entry.messagesSent),
      String(entry.botActions),
      String(entry.policyDenials),
      String(entry.spamReports),
    ]);

    const csv = buildCsvString(headers, rows);
    const from = dateVars.from.split('T')[0];
    const to = dateVars.to.split('T')[0];
    downloadCsv(csv, `analytics_${from}_${to}.csv`);
    setShowDropdown(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        Export
      </button>
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-1 bg-bg-surface border border-border-primary rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
            <button
              onClick={handleExportCsv}
              className="w-full text-left px-3 py-2 text-xs hover:bg-bg-hover transition-colors"
            >
              Export CSV
            </button>
            <button
              disabled
              className="w-full text-left px-3 py-2 text-xs text-text-muted cursor-not-allowed"
              title="Coming soon"
            >
              Export PDF (coming soon)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page (11.1 + 11.10) ────────────────────────────────────────────────

function AnalyticsPageContent() {
  const { activeServiceProvider } = useAuth();
  const serviceProviderId = activeServiceProvider?.id ?? '';
  const { range, updateRange } = useDateRange();

  const dateVars: AnalyticsDateVars = {
    serviceProviderId,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const { data: overviewData, loading: overviewLoading } = useAnalyticsOverview(dateVars);
  const { data: dailyData, loading: dailyLoading } = useDailyAnalytics(dateVars);

  const overview = overviewData?.dashboardAnalytics;
  const daily = dailyData?.dailyAnalytics;

  if (!serviceProviderId) {
    return (
      <div className="p-8 text-center text-text-muted">
        Select a service provider to view analytics.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-text-secondary mt-1">Communication performance and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton dateVars={dateVars} dailyData={daily} />
          <DateRangeSelector value={range} onChange={updateRange} />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards data={overview} loading={overviewLoading} />

      {/* Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotificationAnalyticsPanel dateVars={dateVars} />
        <CallbackAnalyticsPanel dateVars={dateVars} />
        <CampaignAnalyticsPanel dateVars={dateVars} overview={overview} />
        <BotAnalyticsPanel dateVars={dateVars} overview={overview} />
      </div>

      {/* Policy Panel (full width) */}
      <PolicyAnalyticsPanel overview={overview} />

      {/* Daily Table (full width) */}
      <DailyAnalyticsTable data={daily} loading={dailyLoading} />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-6 animate-pulse"><div className="h-8 w-48 bg-border-primary rounded" /><div className="grid grid-cols-6 gap-4">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-20 bg-border-primary rounded-xl" />)}</div></div>}>
      <AnalyticsPageContent />
    </Suspense>
  );
}
