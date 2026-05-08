'use client';

import Link from 'next/link';
import { Bell, CheckCircle, PhoneCall, MessageSquare, Megaphone, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatNumber, formatPercent } from '@/lib/format';
import type { DashboardAnalytics } from '@/lib/graphql/dashboard';

// ─── Config ─────────────────────────────────────────────

const KPI_CONFIG = [
  { key: 'notificationsSent', prevKey: 'previousNotificationsSent', label: 'Notifications Sent', icon: Bell, iconColor: 'text-accent-blue', iconBg: 'bg-accent-blue/10', href: '/notifications', format: 'number' as const },
  { key: 'deliveryRate', prevKey: 'previousDeliveryRate', label: 'Delivery Rate', icon: CheckCircle, iconColor: 'text-status-success', iconBg: 'bg-status-success/10', href: '/analytics', format: 'percent' as const },
  { key: 'activeCallbacks', prevKey: 'previousActiveCallbacks', label: 'Active Callbacks', icon: PhoneCall, iconColor: 'text-accent-orange', iconBg: 'bg-accent-orange/10', href: '/callbacks', format: 'number' as const },
  { key: 'openConversations', prevKey: 'previousOpenConversations', label: 'Open Conversations', icon: MessageSquare, iconColor: 'text-accent-purple', iconBg: 'bg-accent-purple/10', href: '/conversations', format: 'number' as const },
  { key: 'activeCampaigns', prevKey: 'previousActiveCampaigns', label: 'Active Campaigns', icon: Megaphone, iconColor: 'text-status-warning', iconBg: 'bg-status-warning/10', href: '/campaigns', format: 'number' as const },
] as const;

// ─── Trend helper ───────────────────────────────────────

function getTrend(current: number, previous: number) {
  if (previous === 0) return { label: '–', positive: true, Icon: Minus };
  const pct = ((current - previous) / previous) * 100;
  const positive = pct >= 0;
  return {
    label: `${positive ? '+' : ''}${pct.toFixed(1)}%`,
    positive,
    Icon: positive ? TrendingUp : TrendingDown,
  };
}

// ─── KPICard ────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: number;
  previousValue: number;
  format: 'number' | 'percent';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  iconBg: string;
  href: string;
  loading?: boolean;
}

function KPICard({ label, value, previousValue, format, icon: Icon, iconColor, iconBg, href, loading }: KPICardProps) {
  const trend = getTrend(value, previousValue);
  const formatted = format === 'percent' ? formatPercent(value) : formatNumber(value);

  if (loading) {
    return (
      <Card variant="default" padding="md" className="animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 w-24 bg-border-primary rounded" />
            <div className="h-7 w-20 bg-border-primary rounded" />
            <div className="h-3 w-16 bg-border-primary rounded" />
          </div>
          <div className="w-10 h-10 bg-border-primary rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Link href={href}>
      <Card variant="interactive" padding="md" className="h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-semibold mt-1">{formatted}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <trend.Icon size={12} className={trend.positive ? 'text-status-success' : 'text-status-error'} />
              <span className={`text-xs font-medium ${trend.positive ? 'text-status-success' : 'text-status-error'}`}>
                {trend.label}
              </span>
              <span className="text-[10px] text-text-muted ml-1">vs prev period</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon size={20} className={iconColor} />
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── DashboardKPICards ──────────────────────────────────

export function DashboardKPICards({ data, loading }: { data?: DashboardAnalytics; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {KPI_CONFIG.map((kpi) => (
        <KPICard
          key={kpi.key}
          label={kpi.label}
          value={(data?.[kpi.key as keyof DashboardAnalytics] as number) ?? 0}
          previousValue={(data?.[kpi.prevKey as keyof DashboardAnalytics] as number) ?? 0}
          format={kpi.format}
          icon={kpi.icon}
          iconColor={kpi.iconColor}
          iconBg={kpi.iconBg}
          href={kpi.href}
          loading={loading}
        />
      ))}
    </div>
  );
}
