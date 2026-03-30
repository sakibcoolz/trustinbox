'use client';

import { useState } from 'react';
import { Bell, Plus, Search, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const mockNotifications = [
  { id: '1', subject: 'Account verification reminder', type: 'Personal', category: 'Transactional', channel: 'SMS', status: 'Delivered', recipients: 1, sentAt: '2024-03-10 14:30' },
  { id: '2', subject: 'Monthly statement available', type: 'Organizational', category: 'Informational', channel: 'Email', status: 'Delivered', recipients: 2480, sentAt: '2024-03-09 09:00' },
  { id: '3', subject: 'Service maintenance window', type: 'Organizational', category: 'Operational', channel: 'Push', status: 'Delivered', recipients: 5200, sentAt: '2024-03-08 16:00' },
  { id: '4', subject: 'New feature announcement', type: 'Advertisement', category: 'Promotional', channel: 'Email', status: 'Partial', recipients: 3100, sentAt: '2024-03-07 10:30' },
  { id: '5', subject: 'Payment confirmation', type: 'Personal', category: 'Transactional', channel: 'SMS', status: 'Failed', recipients: 1, sentAt: '2024-03-06 13:15' },
  { id: '6', subject: 'Security alert', type: 'Personal', category: 'Security', channel: 'Push', status: 'Delivered', recipients: 1, sentAt: '2024-03-05 08:45' },
];

const typeColors: Record<string, string> = {
  Personal: 'bg-accent-blue/10 text-accent-blue',
  Organizational: 'bg-accent-purple/10 text-accent-purple',
  Advertisement: 'bg-accent-orange/10 text-accent-orange',
};

const statusColors: Record<string, string> = {
  Delivered: 'bg-status-success/10 text-status-success',
  Failed: 'bg-status-error/10 text-status-error',
  Partial: 'bg-status-warning/10 text-status-warning',
  Pending: 'bg-accent-cyan/10 text-accent-cyan',
};

export default function NotificationsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const types = ['All', 'Personal', 'Organizational', 'Advertisement'];

  const filtered = mockNotifications.filter((n) =>
    (typeFilter === 'All' || n.type === typeFilter) &&
    (search === '' || n.subject.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-text-secondary mt-1">Send and track notifications to your customers</p>
        </div>
        <Link href="/notifications/compose"
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <Plus size={16} /> Compose
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search notifications…" />
        </div>
        <div className="flex gap-1">
          {types.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: '12,480', sub: 'Last 30 days' },
          { label: 'Delivery Rate', value: '96.2%', sub: '+0.8% vs last month' },
          { label: 'Failed', value: '48', sub: '0.4% failure rate' },
          { label: 'Policy Blocked', value: '312', sub: 'Blocked by user policy' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-xl font-semibold mt-1">{s.value}</p>
            <p className="text-xs text-text-muted mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Subject</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Channel</th>
              <th className="px-4 py-3 text-left font-medium">Recipients</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Sent</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => (
              <tr key={n.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium">{n.subject}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[n.type]}`}>{n.type}</span></td>
                <td className="px-4 py-3 text-text-secondary">{n.channel}</td>
                <td className="px-4 py-3 text-text-secondary">{n.recipients.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[n.status]}`}>{n.status}</span></td>
                <td className="px-4 py-3 text-text-muted">{n.sentAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
