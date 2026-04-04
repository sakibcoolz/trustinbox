'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useCallbacks } from '@/hooks/useCallbacks';
import { useDetailParam } from '@/hooks/useDetailParam';
import { EmptyState } from '@/components/ui/EmptyState';
import { PhoneIncoming } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusConfig: Record<string, { chip: string; label: string }> = {
  PENDING: { chip: 'chip-orange', label: 'Pending' },
  APPROVED: { chip: 'chip-green', label: 'Approved' },
  REJECTED: { chip: 'chip-red', label: 'Rejected' },
  EXPIRED: { chip: 'chip-default', label: 'Expired' },
};

const tabs = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;

export default function CallbackRequestsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-sm text-text-muted">Loading…</p></div>}>
      <CallbacksContent />
    </Suspense>
  );
}

function CallbacksContent() {
  const [tab, setTab] = useState<string>('All');
  const { selectedId, setSelectedId, clearSelectedId } = useDetailParam();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('14:00');
  const [slotEnd, setSlotEnd] = useState('14:30');
  const [submitting, setSubmitting] = useState(false);

  const statusFilter = tab === 'All' ? undefined : tab;
  const { callbacks, totalCount, loading, error, approve, reject } = useCallbacks({ status: statusFilter });
  const router = useRouter();

  const selected = callbacks.find((c: any) => c.id === selectedId);

  // Auto-open mobile detail when deep-linked
  useEffect(() => {
    if (selectedId) setMobileShowDetail(true);
  }, [selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
    setShowSlotPicker(false);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selectedId || !slotDate) return;
    setSubmitting(true);
    try {
      const start = `${slotDate}T${slotStart}:00Z`;
      const end = `${slotDate}T${slotEnd}:00Z`;
      await approve({ callbackRequestId: selectedId, approvedSlotStart: start, approvedSlotEnd: end });
      setShowSlotPicker(false);
    } catch {
      // Error handled by Apollo
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, slotDate, slotStart, slotEnd, approve]);

  const handleReject = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await reject({ callbackRequestId: selectedId });
    } catch {
      // Error handled by Apollo
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, reject]);

  if (loading) {
    return (
      <>
        <div className="flex w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0">
          <div className="px-4 pt-4 pb-2 space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">Callbacks</h2>
          </div>
          <div className="flex-1 px-4 space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-bg-tertiary h-16" />
            ))}
          </div>
        </div>
        <div className="hidden sm:flex flex-1 items-center justify-center bg-bg-primary">
          <p className="text-sm text-text-muted">Loading callbacks…</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-3">
          <p className="text-sm text-accent-red">Failed to load callback requests</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

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
                {t === 'All' ? `All (${totalCount})` : statusConfig[t].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {callbacks.length === 0 ? (
            <EmptyState
              icon={PhoneIncoming}
              title="No callback requests"
              description="When a service provider wants to call you, it'll appear here. You stay in control of who can reach you."
              action={{ label: 'Manage availability', onClick: () => router.push('/settings/availability') }}
            />
          ) : (
            callbacks.map((cb: any) => (
              <button key={cb.id} onClick={() => handleSelect(cb.id)}
                className={`w-full text-left px-4 py-3 border-b border-border-primary hover:bg-bg-hover transition-colors ${selectedId === cb.id ? 'bg-bg-active border-l-2 border-l-accent-blue' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary truncate">{cb.serviceProvider?.name ?? 'Unknown'}</span>
                  <span className={`${statusConfig[cb.status]?.chip ?? 'chip-default'} text-2xs ml-2 shrink-0`}>{statusConfig[cb.status]?.label ?? cb.status}</span>
                </div>
                <p className="text-2xs text-text-secondary truncate">{cb.reason}</p>
                <p className="text-2xs text-text-muted mt-0.5">{cb.requestedAt ? new Date(cb.requestedAt).toLocaleDateString() : ''}</p>
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
            <EmptyState
              icon={PhoneIncoming}
              title="Select a callback"
              description="Choose a callback request from the list to view details and respond"
              size="lg"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">{selected.serviceProvider?.name ?? 'Unknown'}</h2>
                <p className="text-sm text-text-muted">{selected.serviceProvider?.industry ?? ''}</p>
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
                      <button onClick={handleApprove} disabled={!slotDate || submitting} className="btn-primary text-sm">{submitting ? 'Approving…' : 'Confirm & Approve'}</button>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setShowSlotPicker(true)} disabled={submitting} className="btn-primary flex-1">
                    <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Approve
                  </button>
                  <button onClick={handleReject} disabled={submitting} className="btn-danger flex-1">
                    <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    {submitting ? 'Rejecting…' : 'Reject'}
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
