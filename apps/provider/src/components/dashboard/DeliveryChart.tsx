'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { DailyDeliveryEntry } from '@/lib/graphql/dashboard';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-bg-elevated border border-border-secondary rounded-lg shadow-xl p-3">
      <p className="text-xs text-text-muted mb-2">
        {new Date(label ?? '').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="text-text-primary font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <Card>
      <div className="px-6 py-4 border-b border-border-primary">
        <div className="h-4 w-40 bg-border-primary rounded animate-pulse" />
        <div className="h-3 w-56 bg-border-primary rounded animate-pulse mt-1.5" />
      </div>
      <div className="px-6 py-4">
        <div className="h-64 bg-border-primary/30 rounded animate-pulse" />
      </div>
    </Card>
  );
}

export function DeliveryChart({ data, loading }: { data: DailyDeliveryEntry[]; loading: boolean }) {
  if (loading) return <SkeletonChart />;

  return (
    <Card>
      <CardHeader title="Notification Delivery" description="Sent vs Delivered vs Failed" />
      <CardContent className="pr-0">
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2228" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#8b929a"
              fontSize={10}
              tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke="#8b929a" fontSize={10} tickFormatter={(v: number) => v.toLocaleString()} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#8b929a' }} />
            <Area type="monotone" dataKey="sent" stroke="#3b82f6" fill="url(#sentGrad)" strokeWidth={2} name="Sent" />
            <Area type="monotone" dataKey="delivered" stroke="#22c55e" fill="url(#deliveredGrad)" strokeWidth={2} name="Delivered" />
            <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#failedGrad)" strokeWidth={2} name="Failed" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
