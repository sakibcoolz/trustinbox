'use client';

import { BarChart3, Users, Bell, PhoneCall, Bot, Megaphone, TrendingUp, TrendingDown } from 'lucide-react';

interface KPI {
  label: string;
  value: string;
  change: string;
  trending: 'up' | 'down';
  icon: typeof BarChart3;
}

interface DashboardSummaryProps {
  kpis?: KPI[];
}

const defaultKPIs: KPI[] = [
  { label: 'Active Customers', value: '12,480', change: '+8.2%', trending: 'up', icon: Users },
  { label: 'Notifications (24h)', value: '2,480', change: '+12.5%', trending: 'up', icon: Bell },
  { label: 'Callbacks Pending', value: '7', change: '-3', trending: 'down', icon: PhoneCall },
  { label: 'Bot Conversations', value: '156', change: '+22%', trending: 'up', icon: Bot },
  { label: 'Active Campaigns', value: '4', change: '0', trending: 'up', icon: Megaphone },
  { label: 'Delivery Rate', value: '96.2%', change: '+0.8%', trending: 'up', icon: BarChart3 },
];

export default function DashboardSummary({ kpis = defaultKPIs }: DashboardSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-bg-card border border-border-primary rounded-xl p-4 hover:border-border-secondary transition-colors">
          <div className="flex items-center justify-between mb-2">
            <kpi.icon size={16} className="text-text-muted" />
            <div className={`flex items-center gap-0.5 text-xs ${kpi.trending === 'up' ? 'text-status-success' : 'text-status-error'}`}>
              {kpi.trending === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {kpi.change}
            </div>
          </div>
          <p className="text-xl font-semibold">{kpi.value}</p>
          <p className="text-xs text-text-muted mt-0.5">{kpi.label}</p>
        </div>
      ))}
    </div>
  );
}
