'use client';

import { use } from 'react';
import { ArrowLeft, Users, BarChart3, Clock, CheckCircle2, Pause, Edit } from 'lucide-react';
import Link from 'next/link';

const mockCampaign = {
  id: 'camp-1',
  name: 'Spring Onboarding 2024',
  type: 'Organizational',
  status: 'Active',
  channel: 'Email + Push',
  createdAt: '2024-03-01',
  startedAt: '2024-03-05',
  targets: 5200,
  delivered: 4980,
  opened: 3200,
  clicked: 1850,
  optedOut: 24,
  failed: 220,
};

const timeline = [
  { time: '2024-03-01 10:00', event: 'Campaign created', actor: 'Admin' },
  { time: '2024-03-03 14:00', event: 'Content approved', actor: 'Compliance team' },
  { time: '2024-03-05 09:00', event: 'Campaign started', actor: 'System' },
  { time: '2024-03-05 09:05', event: 'First batch sent (2,600)', actor: 'System' },
  { time: '2024-03-05 15:00', event: 'Second batch sent (2,600)', actor: 'System' },
  { time: '2024-03-06 09:00', event: 'Open rate: 61.5%', actor: 'System' },
];

const statusColors: Record<string, string> = {
  Active: 'bg-status-success/10 text-status-success',
  Paused: 'bg-status-warning/10 text-status-warning',
  Completed: 'bg-accent-blue/10 text-accent-blue',
  Draft: 'bg-border-secondary text-text-muted',
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const c = mockCampaign;
  const deliveryRate = ((c.delivered / c.targets) * 100).toFixed(1);
  const openRate = ((c.opened / c.delivered) * 100).toFixed(1);
  const clickRate = ((c.clicked / c.delivered) * 100).toFixed(1);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{c.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>{c.status}</span>
            </div>
            <p className="text-text-secondary text-sm mt-0.5">{c.type} · {c.channel} · Started {c.startedAt}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Pause size={14} /> Pause
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Edit size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Targets', value: c.targets.toLocaleString(), icon: Users },
          { label: 'Delivered', value: c.delivered.toLocaleString(), sub: `${deliveryRate}%` },
          { label: 'Opened', value: c.opened.toLocaleString(), sub: `${openRate}%` },
          { label: 'Clicked', value: c.clicked.toLocaleString(), sub: `${clickRate}%` },
          { label: 'Opted Out', value: String(c.optedOut), color: 'text-accent-orange' },
          { label: 'Failed', value: String(c.failed), color: 'text-status-error' },
        ].map((m) => (
          <div key={m.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{m.label}</p>
            <p className={`text-xl font-semibold mt-1 ${(m as any).color || ''}`}>{m.value}</p>
            {(m as any).sub && <p className="text-xs text-text-muted mt-0.5">{(m as any).sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Funnel */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4">Delivery Funnel</h3>
          <div className="space-y-3">
            {[
              { label: 'Targeted', value: c.targets, pct: 100 },
              { label: 'Delivered', value: c.delivered, pct: parseFloat(deliveryRate) },
              { label: 'Opened', value: c.opened, pct: parseFloat(openRate) },
              { label: 'Clicked', value: c.clicked, pct: parseFloat(clickRate) },
            ].map((step) => (
              <div key={step.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{step.label}</span>
                  <span className="text-text-muted">{step.value.toLocaleString()} ({step.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-accent-blue rounded-full transition-all" style={{ width: `${step.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4">Timeline</h3>
          <div className="space-y-4">
            {timeline.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-accent-blue mt-1.5" />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border-secondary mt-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">{t.event}</p>
                  <p className="text-xs text-text-muted">{t.time} · {t.actor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
