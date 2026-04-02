'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDateRange } from '@/hooks/useDateRange';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { DashboardKPICards } from '@/components/dashboard/KPICards';
import { DeliveryChart } from '@/components/dashboard/DeliveryChart';
import { PolicyChart } from '@/components/dashboard/PolicyChart';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import { AutoRefresh } from '@/components/dashboard/AutoRefresh';
import type { DashboardAnalytics } from '@/lib/graphql/dashboard';

interface DashboardClientProps {
  initialData: DashboardAnalytics | null;
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const { range, updateRange } = useDateRange();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(initialData);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      const res = await fetch(`/api/analytics/dashboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { enabled: liveEnabled, setEnabled: setLiveEnabled, lastUpdated } = useAutoRefresh(fetchData);

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
      <DashboardKPICards data={analytics ?? undefined} loading={loading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeliveryChart data={(analytics as any)?.dailyDelivery ?? []} loading={loading} />
        <PolicyChart data={(analytics as any)?.policyBreakdown} loading={loading} />
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline activities={(analytics as any)?.recentActivity ?? []} loading={loading} />
    </div>
  );
}
