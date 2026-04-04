'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrendSeries {
  dataKey: string;
  name: string;
  color: string;
}

interface TrendChartProps {
  data: Array<Record<string, unknown>>;
  series: TrendSeries[];
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
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

// ─── TrendChart ──────────────────────────────────────────────────────────────

export function TrendChart({ data, series, height = 200, loading, emptyMessage = 'No data for selected range' }: TrendChartProps) {
  if (loading) {
    return <div className="bg-border-primary/30 rounded animate-pulse" style={{ height }} />;
  }

  if (!data.length) {
    return (
      <div className="border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2228" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#8b929a"
          fontSize={10}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#8b929a" fontSize={10} tickFormatter={(v: number) => v.toLocaleString()} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: '11px', color: '#8b929a' }} />
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            stroke={s.color}
            fill={`url(#grad-${s.dataKey})`}
            strokeWidth={2}
            name={s.name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
