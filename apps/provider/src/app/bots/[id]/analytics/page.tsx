'use client';

import { use } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, MessageSquare, ThumbsUp, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

const metrics = {
  totalConversations: 1240,
  avgSessionDuration: '4m 32s',
  avgRating: 4.6,
  totalRatings: 890,
  escalationRate: 8.2,
  resolutionRate: 91.8,
  avgResponseTime: '1.2s',
  messagesPerSession: 6.4,
};

const dailyStats = [
  { date: 'Mar 4', conversations: 42, rating: 4.5, escalations: 4 },
  { date: 'Mar 5', conversations: 56, rating: 4.7, escalations: 3 },
  { date: 'Mar 6', conversations: 48, rating: 4.4, escalations: 5 },
  { date: 'Mar 7', conversations: 61, rating: 4.8, escalations: 2 },
  { date: 'Mar 8', conversations: 53, rating: 4.6, escalations: 4 },
  { date: 'Mar 9', conversations: 38, rating: 4.5, escalations: 3 },
  { date: 'Mar 10', conversations: 45, rating: 4.7, escalations: 2 },
];

const topTopics = [
  { topic: 'Account Settings', count: 245, pct: 19.8 },
  { topic: 'Billing Questions', count: 198, pct: 16.0 },
  { topic: 'Technical Support', count: 176, pct: 14.2 },
  { topic: 'Feature Requests', count: 134, pct: 10.8 },
  { topic: 'Password Reset', count: 112, pct: 9.0 },
  { topic: 'Other', count: 375, pct: 30.2 },
];

const escalationReasons = [
  { reason: 'Billing dispute', count: 32, pct: 31.4 },
  { reason: 'Complex technical issue', count: 28, pct: 27.5 },
  { reason: 'Customer request', count: 22, pct: 21.6 },
  { reason: 'Account deletion', count: 12, pct: 11.8 },
  { reason: 'Legal inquiry', count: 8, pct: 7.8 },
];

export default function BotAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/bots/${id}`} className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Bot Analytics</h1>
          <p className="text-text-secondary text-sm mt-0.5">Performance dashboard for the last 30 days</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Conversations', value: metrics.totalConversations.toLocaleString(), icon: MessageSquare, change: '+12%', up: true },
          { label: 'Avg Rating', value: `${metrics.avgRating}/5`, icon: ThumbsUp, change: '+0.2', up: true },
          { label: 'Escalation Rate', value: `${metrics.escalationRate}%`, icon: AlertTriangle, change: '-1.3%', up: false },
          { label: 'Avg Response Time', value: metrics.avgResponseTime, icon: Clock, change: '-0.3s', up: false },
        ].map((m) => (
          <div key={m.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">{m.label}</p>
              <m.icon size={16} className="text-text-muted" />
            </div>
            <p className="text-xl font-semibold mt-1">{m.value}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs ${m.label === 'Escalation Rate' || m.label === 'Avg Response Time' ? (m.up ? 'text-status-error' : 'text-status-success') : (m.up ? 'text-status-success' : 'text-status-error')}`}>
              {((m.label === 'Escalation Rate' || m.label === 'Avg Response Time') ? !m.up : m.up)
                ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {m.change} vs last period
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Resolution Rate', value: `${metrics.resolutionRate}%` },
          { label: 'Total Ratings', value: metrics.totalRatings.toLocaleString() },
          { label: 'Avg Session Duration', value: metrics.avgSessionDuration },
          { label: 'Msgs per Session', value: String(metrics.messagesPerSession) },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Table */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4">Daily Overview</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted border-b border-border-primary">
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-left font-medium">Conversations</th>
                <th className="pb-2 text-left font-medium">Rating</th>
                <th className="pb-2 text-left font-medium">Escalations</th>
              </tr>
            </thead>
            <tbody>
              {dailyStats.map((d) => (
                <tr key={d.date} className="border-b border-border-primary last:border-0">
                  <td className="py-2 text-text-secondary">{d.date}</td>
                  <td className="py-2">{d.conversations}</td>
                  <td className="py-2">{d.rating}</td>
                  <td className="py-2 text-accent-orange">{d.escalations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Topics */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4">Top Topics</h3>
          <div className="space-y-3">
            {topTopics.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">{t.topic}</span>
                  <span className="text-text-muted">{t.count} ({t.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-accent-purple rounded-full" style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Escalation Reasons */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Top Escalation Reasons</h3>
          <div className="grid grid-cols-5 gap-4">
            {escalationReasons.map((e) => (
              <div key={e.reason} className="bg-bg-tertiary rounded-lg p-3 text-center">
                <p className="text-lg font-semibold text-accent-orange">{e.count}</p>
                <p className="text-xs text-text-muted mt-1">{e.reason}</p>
                <p className="text-xs text-text-muted">{e.pct}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
