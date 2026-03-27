'use client';

import { useState } from 'react';

const filters = ['All', 'Pending', 'Approved', 'Rejected'] as const;

interface CallbackRequest {
  id: string;
  org: string;
  orgSlug: string;
  reason: string;
  details: string;
  requestedAt: string;
  scheduledAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  agentName?: string;
}

const mockRequests: CallbackRequest[] = [
  { id: '1', org: 'Acme Bank', orgSlug: 'o/acmebank', reason: 'Loan follow-up call', details: 'Discussion about approved loan terms and disbursement timeline. Agent will explain EMI options and insurance add-ons.', requestedAt: '10 min ago', status: 'pending', agentName: 'Rahul Mehta' },
  { id: '2', org: 'City Hospital', orgSlug: 'o/cityhospital', reason: 'Lab results discussion', details: 'Dr. Sharma would like to discuss your recent blood work results and recommend follow-up tests if needed.', requestedAt: '1 hr ago', scheduledAt: 'Today, 3:00 PM', status: 'pending', agentName: 'Dr. Priya Sharma' },
  { id: '3', org: 'Quick Realty', orgSlug: 'o/quickrealty', reason: 'Property viewing schedule', details: 'Arrange viewings for 3 shortlisted properties in your preferred locations.', requestedAt: '3 hrs ago', scheduledAt: 'Tomorrow, 11:00 AM', status: 'approved', agentName: 'Neha Gupta' },
  { id: '4', org: 'Acme Bank', orgSlug: 'o/acmebank', reason: 'Credit card renewal', details: 'Annual renewal call for your premium credit card. Loyalty benefits discussion.', requestedAt: '1 day ago', status: 'rejected', agentName: 'Vikram Singh' },
  { id: '5', org: 'SecurePay', orgSlug: 'o/securepay', reason: 'Transaction verification', details: 'Verify recent high-value transaction flagged by our security system.', requestedAt: '2 days ago', status: 'approved', scheduledAt: 'Completed', agentName: 'Security Team' },
];

const statusStyle: Record<string, { chip: string; icon: React.ReactNode }> = {
  pending: {
    chip: 'chip-orange',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  approved: {
    chip: 'chip-green',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  rejected: {
    chip: 'chip-red',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
};

export default function CallbackRequestsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = filter === 'All'
    ? mockRequests
    : mockRequests.filter((r) => r.status === filter.toLowerCase());

  const selected = mockRequests.find((r) => r.id === selectedId) || null;
  const pendingCount = mockRequests.filter((r) => r.status === 'pending').length;

  return (
    <>
      {/* List panel */}
      <div className="w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Callbacks</h2>
              {pendingCount > 0 && <span className="badge-count">{pendingCount}</span>}
            </div>
          </div>
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                  filter === f
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((req) => (
            <div
              key={req.id}
              onClick={() => setSelectedId(req.id)}
              className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-l-2 ${
                selectedId === req.id
                  ? 'bg-bg-active border-l-accent-blue'
                  : 'border-l-transparent hover:bg-bg-hover'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-text-primary truncate">{req.org}</span>
                  <span className="text-2xs text-text-muted shrink-0 ml-2">{req.requestedAt}</span>
                </div>
                <p className="text-xs text-text-secondary truncate">{req.reason}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={statusStyle[req.status].chip}>
                    {statusStyle[req.status].icon}
                    <span className="ml-1 capitalize">{req.status}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-bg-primary min-w-0 overflow-hidden">
          <div className="h-[60px] px-6 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent-cyan/15 text-accent-cyan flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{selected.org}</h3>
                <p className="text-2xs text-text-muted">{selected.orgSlug} · Callback request</p>
              </div>
            </div>
            <span className={statusStyle[selected.status].chip}>
              {statusStyle[selected.status].icon}
              <span className="ml-1 capitalize">{selected.status}</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <h1 className="text-xl font-semibold text-text-primary">{selected.reason}</h1>

              <div className="grid grid-cols-2 gap-4">
                <div className="card">
                  <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Organization</p>
                  <p className="text-sm text-text-primary font-medium">{selected.org}</p>
                </div>
                <div className="card">
                  <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Agent</p>
                  <p className="text-sm text-text-primary font-medium">{selected.agentName || 'Not assigned'}</p>
                </div>
                <div className="card">
                  <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Requested</p>
                  <p className="text-sm text-text-primary font-medium">{selected.requestedAt}</p>
                </div>
                <div className="card">
                  <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Scheduled</p>
                  <p className="text-sm text-text-primary font-medium">{selected.scheduledAt || 'Not scheduled'}</p>
                </div>
              </div>

              <div className="card">
                <p className="text-2xs text-text-muted uppercase tracking-wider mb-2">Details</p>
                <p className="text-sm text-text-secondary leading-relaxed">{selected.details}</p>
              </div>

              {selected.status === 'pending' && (
                <div className="flex gap-3">
                  <button className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Approve
                  </button>
                  <button className="btn-danger flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Reject
                  </button>
                  <button className="btn-secondary">Reschedule</button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            </div>
            <p className="text-sm text-text-muted">Select a callback request to view details</p>
          </div>
        </div>
      )}
    </>
  );
}
