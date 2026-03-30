'use client';

import { useState, useCallback } from 'react';

interface CallbackRequest {
  id: string;
  serviceProvider: { name: string; industry: string };
  reason: string;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  respondedAt: string | null;
  approvedSlotStart: string | null;
  approvedSlotEnd: string | null;
}

const mockCallbacks: CallbackRequest[] = [
  { id: '1', serviceProvider: { name: 'Acme Insurance', industry: 'Insurance' }, reason: 'Policy Renewal Discussion', details: 'Your auto policy expires in 2 weeks. We\'d like to discuss renewal options.', status: 'PENDING', requestedAt: '2026-03-30T09:00:00Z', respondedAt: null, approvedSlotStart: null, approvedSlotEnd: null },
  { id: '2', serviceProvider: { name: 'MedHealth Clinic', industry: 'Healthcare' }, reason: 'Appointment Confirmation', details: 'Confirming your upcoming check-up appointment details.', status: 'PENDING', requestedAt: '2026-03-29T14:00:00Z', respondedAt: null, approvedSlotStart: null, approvedSlotEnd: null },
  { id: '3', serviceProvider: { name: 'TechSupport Pro', industry: 'Technology' }, reason: 'Device Setup Assistance', details: 'Follow-up on your support ticket #4521.', status: 'APPROVED', requestedAt: '2026-03-28T10:00:00Z', respondedAt: '2026-03-28T11:00:00Z', approvedSlotStart: '2026-03-31T14:00:00Z', approvedSlotEnd: '2026-03-31T14:30:00Z' },
  { id: '4', serviceProvider: { name: 'Global Bank', industry: 'Finance' }, reason: 'Account Review', details: 'Annual account review discussion.', status: 'REJECTED', requestedAt: '2026-03-25T08:00:00Z', respondedAt: '2026-03-25T10:00:00Z', approvedSlotStart: null, approvedSlotEnd: null },
  { id: '5', serviceProvider: { name: 'Travel Agency', industry: 'Travel' }, reason: 'Booking Inquiry', details: 'Special offer available for your travel plans.', status: 'EXPIRED', requestedAt: '2026-03-20T16:00:00Z', respondedAt: null, approvedSlotStart: null, approvedSlotEnd: null },
];

const statusConfig: Record<string, { chip: string; label: string }> = {
  PENDING: { chip: 'chip-orange', label: 'Pending' },
  APPROVED: { chip: 'chip-green', label: 'Approved' },
  REJECTED: { chip: 'chip-red', label: 'Rejected' },
  EXPIRED: { chip: 'chip-default', label: 'Expired' },
};

const tabs = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;

export default function CallbackRequestsPage() {
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>(mockCallbacks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('All');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('14:00');
  const [slotEnd, setSlotEnd] = useState('14:30');

  const selected = callbacks.find((c) => c.id === selectedId);
  const filtered = tab === 'All' ? callbacks : callbacks.filter((c) => c.status === tab);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
    setShowSlotPicker(false);
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedId || !slotDate) return;
    const start = `${slotDate}T${slotStart}:00Z`;
    const end = `${slotDate}T${slotEnd}:00Z`;
    setCallbacks((prev) => prev.map((c) => c.id === selectedId
      ? { ...c, status: 'APPROVED' as const, respondedAt: new Date().toISOString(), approvedSlotStart: start, approvedSlotEnd: end }
      : c
    ));
    setShowSlotPicker(false);
  }, [selectedId, slotDate, slotStart, slotEnd]);

  const handleReject = useCallback(() => {
    if (!selectedId) return;
    setCallbacks((prev) => prev.map((c) => c.id === selectedId
      ? { ...c, status: 'REJECTED' as const, respondedAt: new Date().toISOString() }
      : c
    ));
  }, [selectedId]);

  const tabCounts = {
    All: callbacks.length,
    PENDING: callbacks.filter((c) => c.status === 'PENDING').length,
    APPROVED: callbacks.filter((c) => c.status === 'APPROVED').length,
    REJECTED: callbacks.filter((c) => c.status === 'REJECTED').length,
    EXPIRED: callbacks.filter((c) => c.status === 'EXPIRED').length,
  };

  return (
    <>
      {/* List panel */}
      <div className={`${mobileShowDetail ? 'hidden sm:flex' : 'flex'} w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0`}>
        <div className="px-4 pt-4 pb-2 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Callbacks</h2>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-2xs font-medium whitespace-nowrap transition-colors ${tab === t ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary'}`}>
                {t === 'All' ? 'All' : statusConfig[t].label} ({tabCounts[t]})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
              <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <p className="text-sm text-text-muted text-center">No callback requests</p>
            </div>
          ) : (
            filtered.map((cb) => (
              <button key={cb.id} onClick={() => handleSelect(cb.id)}
                className={`w-full text-left px-4 py-3 border-b border-border-primary hover:bg-bg-hover transition-colors ${selectedId === cb.id ? 'bg-bg-active border-l-2 border-l-accent-blue' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary truncate">{cb.serviceProvider.name}</span>
                  <span className={`${statusConfig[cb.status].chip} text-2xs ml-2 shrink-0`}>{statusConfig[cb.status].label}</span>
                </div>
                <p className="text-2xs text-text-secondary truncate">{cb.reason}</p>
                <p className="text-2xs text-text-muted mt-0.5">{new Date(cb.requestedAt).toLocaleDateString()}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className={`${mobileShowDetail ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-bg-primary`}>
        <div className="sm:hidden h-[60px] px-4 flex items-center border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
          <button onClick={() => setMobileShowDetail(false)} className="btn-icon mr-2" aria-label="Back">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h3 className="text-sm font-semibold text-text-primary">Callback Details</h3>
        </div>

        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <p className="text-sm text-text-muted">Select a callback request to view details</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">{selected.serviceProvider.name}</h2>
                <p className="text-sm text-text-muted">{selected.serviceProvider.industry}</p>
              </div>
              <span className={`${statusConfig[selected.status].chip} text-xs`}>{statusConfig[selected.status].label}</span>
            </div>

            <div className="card space-y-3">
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Reason</p>
                <p className="text-sm text-text-primary mt-1">{selected.reason}</p>
              </div>
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Details</p>
                <p className="text-sm text-text-secondary mt-1">{selected.details}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <p className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-3">Timeline</p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-blue mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary">Request received</p>
                    <p className="text-2xs text-text-muted">{new Date(selected.requestedAt).toLocaleString()}</p>
                  </div>
                </div>
                {selected.respondedAt && (
                  <div className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${selected.status === 'APPROVED' ? 'bg-status-success' : 'bg-accent-red'}`} />
                    <div>
                      <p className="text-sm text-text-primary">{selected.status === 'APPROVED' ? 'Approved' : 'Rejected'}</p>
                      <p className="text-2xs text-text-muted">{new Date(selected.respondedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {selected.approvedSlotStart && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent-green mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-text-primary">Scheduled Call</p>
                      <p className="text-2xs text-text-muted">
                        {new Date(selected.approvedSlotStart).toLocaleString()} – {new Date(selected.approvedSlotEnd!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
                {selected.status === 'EXPIRED' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-text-muted mt-1.5 shrink-0" />
                    <div><p className="text-sm text-text-muted">Request expired (no response within window)</p></div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions for pending */}
            {selected.status === 'PENDING' && (
              <div className="space-y-3">
                {showSlotPicker && (
                  <div className="card border-accent-blue/30 space-y-3">
                    <p className="text-sm font-medium text-text-primary">Choose a time slot</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">Date</label>
                        <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="input-field w-full" />
                      </div>
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">Start</label>
                        <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="input-field w-full" />
                      </div>
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">End</label>
                        <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="input-field w-full" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowSlotPicker(false)} className="btn-ghost text-sm">Cancel</button>
                      <button onClick={handleApprove} disabled={!slotDate} className="btn-primary text-sm">Confirm &amp; Approve</button>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setShowSlotPicker(true)} className="btn-primary flex-1">
                    <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Approve
                  </button>
                  <button onClick={handleReject} className="btn-danger flex-1">
                    <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
