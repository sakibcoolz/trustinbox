'use client';

import { useState } from 'react';
import { Shield, Search, CheckCircle2, XCircle } from 'lucide-react';

interface PolicyLog {
  id: string;
  action: string;
  result: 'Allowed' | 'Blocked';
  category: string;
  target: string;
  reason: string;
  time: string;
}

interface ComplianceViewerProps {
  logs?: PolicyLog[];
}

const defaultLogs: PolicyLog[] = [
  { id: '1', action: 'Notification Sent', result: 'Allowed', category: 'Personal', target: 'VID-8a3f2b', reason: 'User consent active', time: '2024-03-10 14:30' },
  { id: '2', action: 'Notification Blocked', result: 'Blocked', category: 'Advertisement', target: 'VID-4c9e1d', reason: 'User opted out', time: '2024-03-10 14:15' },
  { id: '3', action: 'Callback Approved', result: 'Allowed', category: 'Personal', target: 'VID-7f2a8c', reason: 'Policy allows callbacks', time: '2024-03-10 13:45' },
  { id: '4', action: 'Rate Limited', result: 'Blocked', category: 'Personal', target: 'VID-9e6f4a', reason: 'Daily limit exceeded', time: '2024-03-10 12:30' },
];

const resultColors: Record<string, string> = {
  Allowed: 'bg-status-success/10 text-status-success',
  Blocked: 'bg-status-error/10 text-status-error',
};

export default function ComplianceViewer({ logs = defaultLogs }: ComplianceViewerProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Allowed' | 'Blocked'>('All');

  const filtered = logs.filter((l) =>
    (filter === 'All' || l.result === filter) &&
    (search === '' || l.target.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search logs…" />
        </div>
        <div className="flex gap-1">
          {(['All', 'Allowed', 'Blocked'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-bg-hover'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((l) => (
          <div key={l.id} className="flex items-center gap-3 bg-bg-card border border-border-primary rounded-lg px-4 py-3 hover:bg-bg-hover transition-colors">
            {l.result === 'Allowed' ? <CheckCircle2 size={16} className="text-status-success shrink-0" /> : <XCircle size={16} className="text-status-error shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{l.action}</p>
              <p className="text-xs text-text-muted">{l.target} · {l.category} · {l.reason}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${resultColors[l.result]}`}>{l.result}</span>
            <span className="text-xs text-text-muted shrink-0">{l.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
