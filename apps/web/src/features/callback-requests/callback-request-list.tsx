'use client';

import { useState } from 'react';

const mockRequests = [
  { id: '1', org: 'Acme Bank', reason: 'Loan follow-up call', scheduledAt: '2024-03-15 10:00', status: 'pending' as const },
  { id: '2', org: 'City Hospital', reason: 'Lab results discussion', scheduledAt: '2024-03-15 14:00', status: 'pending' as const },
  { id: '3', org: 'Quick Realty', reason: 'Property viewing schedule', scheduledAt: '2024-03-14 11:00', status: 'approved' as const },
  { id: '4', org: 'Acme Bank', reason: 'Credit card renewal', scheduledAt: '2024-03-13 09:00', status: 'rejected' as const },
];

const statusStyles: Record<string, string> = {
  pending: 'chip-orange',
  approved: 'chip-green',
  rejected: 'chip-red',
  expired: 'chip-purple',
};

const filters = ['All', 'Pending', 'Approved', 'Rejected'] as const;

export function CallbackRequestList() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');

  const filtered = filter === 'All'
    ? mockRequests
    : mockRequests.filter((r) => r.status === filter.toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'chip-blue' : 'chip bg-bg-tertiary text-text-secondary hover:text-text-primary'}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((req) => (
          <div key={req.id} className="card flex items-center justify-between">
            <div>
              <p className="text-text-primary font-medium">{req.org}</p>
              <p className="text-text-secondary text-sm">{req.reason}</p>
              <p className="text-text-muted text-xs mt-1">Scheduled: {req.scheduledAt}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={statusStyles[req.status]}>{req.status}</span>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <button className="btn-primary text-sm">Approve</button>
                  <button className="btn-danger text-sm">Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
