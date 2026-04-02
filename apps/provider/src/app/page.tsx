import { Suspense } from 'react';
import { fetchDashboardAnalytics } from '@/lib/data/dashboard';
import DashboardClient from './DashboardClient';
import type { DashboardAnalytics } from '@/lib/graphql/dashboard';

export default async function DashboardPage() {
  let initialData: DashboardAnalytics | null = null;
  try {
    initialData = await fetchDashboardAnalytics() as unknown as DashboardAnalytics;
  } catch {
    // Render client with null — it will show empty state
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient initialData={initialData} />
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
