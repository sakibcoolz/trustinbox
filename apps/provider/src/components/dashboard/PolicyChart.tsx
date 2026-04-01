'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { PolicyBreakdown } from '@/lib/graphql/dashboard';

const SEGMENTS = [
  { key: 'allowed', label: 'Allowed', color: '#22c55e' },
  { key: 'blockedByDND', label: 'Blocked by DND', color: '#f59e0b' },
  { key: 'blockedByPreference', label: 'Blocked by Preference', color: '#ef4444' },
  { key: 'rateLimited', label: 'Rate Limited', color: '#06b6d4' },
] as const;

function PolicyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.[0]) return null;
  const entry = payload[0];
  return (
    <div className="bg-bg-elevated border border-border-secondary rounded-lg shadow-xl px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.payload.color }} />
        <span className="text-text-secondary">{entry.name}:</span>
        <span className="text-text-primary font-medium">{entry.value.toLocaleString()}</span>
      </div>
    </div>
  );
}

function SkeletonDonut() {
  return (
    <Card>
      <div className="px-6 py-4 border-b border-border-primary">
        <div className="h-4 w-32 bg-border-primary rounded animate-pulse" />
        <div className="h-3 w-48 bg-border-primary rounded animate-pulse mt-1.5" />
      </div>
      <div className="px-6 py-4 flex items-center gap-6">
        <div className="w-44 h-44 rounded-full bg-border-primary/30 animate-pulse shrink-0" />
        <div className="flex-1 space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-3 bg-border-primary rounded animate-pulse" />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function PolicyChart({ data, loading }: { data?: PolicyBreakdown; loading: boolean }) {
  if (loading) return <SkeletonDonut />;
  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader title="Policy Decisions" description="Communication approval breakdown" />
        <CardContent>
          <div className="h-44 flex items-center justify-center text-sm text-text-muted">No policy data for this period</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = SEGMENTS.map((s) => ({
    name: s.label,
    value: data[s.key as keyof PolicyBreakdown] as number,
    color: s.color,
  }));

  return (
    <Card>
      <CardHeader title="Policy Decisions" description="Communication approval breakdown" />
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-44 h-44 shrink-0 relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PolicyTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-lg font-semibold text-text-primary">{data.total.toLocaleString()}</p>
                <p className="text-[10px] text-text-muted">decisions</p>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex-1 space-y-3 w-full">
            {SEGMENTS.map((s) => {
              const val = data[s.key as keyof PolicyBreakdown] as number;
              const pct = data.total > 0 ? ((val / data.total) * 100).toFixed(1) : '0';
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-text-secondary flex-1">{s.label}</span>
                  <span className="text-xs text-text-primary font-medium">{val.toLocaleString()}</span>
                  <span className="text-[10px] text-text-muted w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
