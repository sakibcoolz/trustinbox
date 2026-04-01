'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAnalytics, useDashboardLiveUpdates } from '@/lib/graphql/dashboard';
import { useDateRange } from '@/hooks/useDateRange';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { DashboardKPICards } from '@/components/dashboard/KPICards';
import { DeliveryChart } from '@/components/dashboard/DeliveryChart';
import { PolicyChart } from '@/components/dashboard/PolicyChart';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import { AutoRefresh } from '@/components/dashboard/AutoRefresh';

function DashboardContent() {
  const { activeServiceProvider } = useAuth();
  const { range, updateRange } = useDateRange();
  const spId = activeServiceProvider?.id ?? '';

  const { data, loading, refetch } = useDashboardAnalytics(spId, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });
  const analytics = data?.dashboardAnalytics;
  const { enabled: liveEnabled, setEnabled: setLiveEnabled, lastUpdated } = useAutoRefresh(refetch);

  // Real-time subscription — optimistic counter updates
  useDashboardLiveUpdates(spId);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">Overview of your communication metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={range} onChange={updateRange} />
          <AutoRefresh enabled={liveEnabled} onToggle={setLiveEnabled} lastUpdated={lastUpdated} />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* KPI Cards */}
      <DashboardKPICards data={analytics} loading={loading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeliveryChart data={analytics?.dailyDelivery ?? []} loading={loading} />
        <PolicyChart data={analytics?.policyBreakdown} loading={loading} />
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline activities={analytics?.recentActivity ?? []} loading={loading} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="h-7 w-32 bg-border-primary rounded animate-pulse" />
        <div className="h-4 w-64 bg-border-primary rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-5 animate-pulse">
            <div className="h-3 w-24 bg-border-primary rounded" />
            <div className="h-7 w-20 bg-border-primary rounded mt-3" />
            <div className="h-3 w-16 bg-border-primary rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
