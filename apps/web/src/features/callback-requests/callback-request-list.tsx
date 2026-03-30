'use client';

import { useState, useEffect } from 'react';

interface CallbackRequest {
  id: string;
  serviceProvider: { name: string };
  reason: string;
  status: string;
  requestedAt: string;
}

export function CallbackRequestList({ onSelect }: { onSelect?: (id: string) => void }) {
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Target: GraphQL query { callbackRequests { nodes { ... } } }
    // Current: mocked pending requests for dashboard widget
    setRequests([
      { id: '1', serviceProvider: { name: 'Acme Insurance' }, reason: 'Policy Renewal', status: 'PENDING', requestedAt: '2026-03-30T09:00:00Z' },
      { id: '2', serviceProvider: { name: 'MedHealth Clinic' }, reason: 'Appointment', status: 'PENDING', requestedAt: '2026-03-29T14:00:00Z' },
    ]);
    setLoading(false);
  }, []);

  if (loading) return <p className="text-sm text-text-muted py-4 text-center">Loading…</p>;
  if (requests.length === 0) return <p className="text-sm text-text-muted py-4 text-center">No callback requests</p>;

  return (
    <div className="space-y-1">
      {requests.map((r) => (
        <button key={r.id} onClick={() => onSelect?.(r.id)}
          className="w-full text-left flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-bg-hover transition-colors">
          <div className="w-8 h-8 rounded-lg bg-accent-orange/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary truncate">{r.serviceProvider.name}</p>
            <p className="text-2xs text-text-muted truncate">{r.reason}</p>
          </div>
          <span className="chip-orange text-2xs shrink-0">{r.status}</span>
        </button>
      ))}
    </div>
  );
}
