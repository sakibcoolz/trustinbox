'use client';

import { useState } from 'react';
import { PhoneCall, Search, Clock, CheckCircle2, XCircle, PhoneMissed, Phone, Calendar } from 'lucide-react';

const mockCallbacks = [
  { id: '1', customerVid: 'VID-8a3f2b', topic: 'Account inquiry', status: 'Pending', priority: 'High', requestedAt: '2024-03-10 11:30', scheduledAt: null, agent: null },
  { id: '2', customerVid: 'VID-4c9e1d', topic: 'Billing dispute', status: 'Pending', priority: 'Urgent', requestedAt: '2024-03-10 10:15', scheduledAt: null, agent: null },
  { id: '3', customerVid: 'VID-7f2a8c', topic: 'Service upgrade', status: 'Approved', priority: 'Normal', requestedAt: '2024-03-09 16:00', scheduledAt: '2024-03-11 10:00', agent: 'Sarah K.' },
  { id: '4', customerVid: 'VID-1b5d3e', topic: 'Technical support', status: 'Approved', priority: 'High', requestedAt: '2024-03-09 14:30', scheduledAt: '2024-03-10 15:00', agent: 'Mike T.' },
  { id: '5', customerVid: 'VID-9e6f4a', topic: 'Cancellation request', status: 'Completed', priority: 'Normal', requestedAt: '2024-03-08 09:00', scheduledAt: '2024-03-08 14:00', agent: 'Sarah K.' },
  { id: '6', customerVid: 'VID-2d7c5b', topic: 'Product feedback', status: 'Missed', priority: 'Low', requestedAt: '2024-03-07 11:00', scheduledAt: '2024-03-07 16:00', agent: 'Mike T.' },
  { id: '7', customerVid: 'VID-6a1e9f', topic: 'Feature request', status: 'Rejected', priority: 'Low', requestedAt: '2024-03-06 13:00', scheduledAt: null, agent: null },
];

const statusColors: Record<string, string> = {
  Pending: 'bg-status-warning/10 text-status-warning',
  Approved: 'bg-accent-blue/10 text-accent-blue',
  Completed: 'bg-status-success/10 text-status-success',
  Missed: 'bg-status-error/10 text-status-error',
  Rejected: 'bg-border-secondary text-text-muted',
};

const priorityColors: Record<string, string> = {
  Low: 'text-text-muted',
  Normal: 'text-text-secondary',
  High: 'text-accent-orange',
  Urgent: 'text-status-error',
};

export default function CallbacksPage() {
  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const tabs = ['Pending', 'Approved', 'Completed', 'Missed', 'Rejected'];

  const filtered = mockCallbacks.filter((c) =>
    c.status === tab &&
    (search === '' || c.customerVid.toLowerCase().includes(search.toLowerCase()) || c.topic.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = tabs.reduce((acc, t) => {
    acc[t] = mockCallbacks.filter((c) => c.status === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Callback Requests</h1>
        <p className="text-text-secondary mt-1">Manage and schedule callback requests from customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pending Approval', value: String(counts['Pending']), icon: Clock, color: 'text-status-warning' },
          { label: 'Scheduled Today', value: '3', icon: Calendar, color: 'text-accent-blue' },
          { label: 'Completed This Week', value: '14', icon: CheckCircle2, color: 'text-status-success' },
          { label: 'Missed This Week', value: '2', icon: PhoneMissed, color: 'text-status-error' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">{s.label}</p>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
              {t} ({counts[t]})
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search callbacks…" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Topic</th>
              <th className="px-4 py-3 text-left font-medium">Priority</th>
              <th className="px-4 py-3 text-left font-medium">Requested</th>
              <th className="px-4 py-3 text-left font-medium">Scheduled</th>
              <th className="px-4 py-3 text-left font-medium">Agent</th>
              {tab === 'Pending' && <th className="px-4 py-3 text-left font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3 font-medium">{c.customerVid}</td>
                <td className="px-4 py-3 text-text-secondary">{c.topic}</td>
                <td className={`px-4 py-3 font-medium ${priorityColors[c.priority]}`}>{c.priority}</td>
                <td className="px-4 py-3 text-text-muted">{c.requestedAt}</td>
                <td className="px-4 py-3 text-text-muted">{c.scheduledAt || '—'}</td>
                <td className="px-4 py-3 text-text-secondary">{c.agent || '—'}</td>
                {tab === 'Pending' && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="px-2.5 py-1 bg-status-success/10 text-status-success rounded text-xs font-medium hover:bg-status-success/20 transition-colors">
                        Approve
                      </button>
                      <button className="px-2.5 py-1 bg-status-error/10 text-status-error rounded text-xs font-medium hover:bg-status-error/20 transition-colors">
                        Reject
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No {tab.toLowerCase()} callbacks</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
