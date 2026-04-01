'use client';

import { useState, useEffect, useCallback, Suspense, Fragment } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PhoneCall, Search, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, Plus, ChevronDown, X, Loader2,
} from 'lucide-react';
import {
  CallbackRequestStatus,
  CallbackRequest,
  useCallbackRequests,
  useCallbackStats,
  useApproveCallbackRequest,
  useRejectCallbackRequest,
  useCallbackRequestCreated,
  getPriorityConfig,
} from '@/lib/graphql/callbacks';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import CallbackStatusBadge from '@/components/callbacks/CallbackStatusBadge';
import ExpiryIndicator from '@/components/callbacks/ExpiryIndicator';
import AgentAssignDropdown from '@/components/callbacks/AgentAssignDropdown';
import CallbackDetailExpansion from '@/components/callbacks/CallbackDetailExpansion';
import CompleteCallbackModal from '@/components/callbacks/CompleteCallbackModal';

const PAGE_SIZE = 25;

const statusChips: Array<{ value: CallbackRequestStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'EXPIRED', label: 'Expired' },
];

function CallbacksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = usePermission('callbacks:manage');
  const canAssign = usePermission('callbacks:assign');
  const { success, error: toastError } = useToast();

  const spId = user?.activeServiceProvider?.id ?? '';

  // Filters from URL
  const statusFilter = (searchParams.get('status') as CallbackRequestStatus) || undefined;
  const searchQuery = searchParams.get('q') ?? '';
  const agentFilter = searchParams.get('agent') ?? '';

  // Local state
  const [search, setSearch] = useState(searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveSlotStart, setApproveSlotStart] = useState('');
  const [approveSlotEnd, setApproveSlotEnd] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      updateURL('q', search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Data hooks
  const { data, loading, error, refetch } = useCallbackRequests({
    status: statusFilter,
    search: debouncedSearch || undefined,
    agentId: agentFilter || undefined,
    limit: PAGE_SIZE,
    offset: 0,
  });
  const { data: statsData } = useCallbackStats(spId);
  const { approve, loading: approving } = useApproveCallbackRequest();
  const { reject, loading: rejecting } = useRejectCallbackRequest();

  // Real-time
  useCallbackRequestCreated(spId);

  const callbacks = data?.callbackRequests?.nodes ?? [];
  const totalCount = data?.callbackRequests?.totalCount ?? 0;
  const stats = statsData?.callbackStats;

  function updateURL(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`/callbacks?${params.toString()}`, { scroll: false });
  }

  function handleStatusFilter(value: CallbackRequestStatus | 'ALL') {
    updateURL('status', value === 'ALL' ? '' : value);
    setSelected(new Set());
  }

  function clearFilters() {
    router.replace('/callbacks', { scroll: false });
    setSearch('');
    setDebouncedSearch('');
  }

  const hasFilters = statusFilter || debouncedSearch || agentFilter;

  // Actions
  async function handleApprove(id: string) {
    if (!approveSlotStart) {
      setApprovingId(id);
      return;
    }
    try {
      await approve({
        callbackRequestId: id,
        approvedSlotStart: new Date(approveSlotStart).toISOString(),
        approvedSlotEnd: approveSlotEnd ? new Date(approveSlotEnd).toISOString() : undefined,
      });
      success('Callback approved');
      setApprovingId(null);
      setApproveSlotStart('');
      setApproveSlotEnd('');
    } catch {
      toastError('Failed to approve callback');
    }
  }

  async function handleReject(id: string) {
    try {
      await reject({
        callbackRequestId: id, reason: rejectReason || undefined,
      });
      success('Callback rejected');
      setRejectingId(null);
      setRejectReason('');
    } catch {
      toastError('Failed to reject callback');
    }
  }

  // Selection
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === callbacks.length) setSelected(new Set());
    else setSelected(new Set(callbacks.map((c) => c.id)));
  }

  const selectedPending = Array.from(selected).every(
    (id) => callbacks.find((cb) => cb.id === id)?.status === 'PENDING'
  );

  async function handleBulkApprove() {
    if (!selectedPending || selected.size === 0) return;
    setBulkProcessing(true);
    let succeeded = 0;
    for (const id of Array.from(selected)) {
      try {
        await approve({
          callbackRequestId: id, approvedSlotStart: new Date().toISOString(), approvedSlotEnd: new Date(Date.now() + 3600000).toISOString(),
        });
        succeeded++;
      } catch { /* continue */ }
    }
    success(`${succeeded} of ${selected.size} callbacks approved`);
    setSelected(new Set());
    setBulkProcessing(false);
  }

  async function handleBulkReject() {
    if (!selectedPending || selected.size === 0) return;
    setBulkProcessing(true);
    let succeeded = 0;
    for (const id of Array.from(selected)) {
      try {
        await reject({
          callbackRequestId: id,
        });
        succeeded++;
      } catch { /* continue */ }
    }
    success(`${succeeded} of ${selected.size} callbacks rejected`);
    setSelected(new Set());
    setBulkProcessing(false);
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Callback Requests</h1>
          <p className="text-text-secondary mt-1">Manage and schedule callback requests from customers</p>
        </div>
        {canManage && (
          <Link
            href="/callbacks/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
          >
            <Plus size={16} /> New Request
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Approval', value: stats?.pending ?? 0, icon: Clock, color: 'text-status-warning' },
          { label: 'Scheduled Today', value: stats?.scheduledToday ?? 0, icon: Calendar, color: 'text-accent-blue' },
          { label: 'Completed This Week', value: stats?.completedThisWeek ?? 0, icon: CheckCircle2, color: 'text-status-success' },
          { label: 'Expired', value: stats?.expired ?? 0, icon: AlertCircle, color: 'text-text-muted' },
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {statusChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => handleStatusFilter(chip.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (statusFilter ?? 'ALL') === chip.value
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search callbacks…"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-text-muted" />
            </button>
          )}
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-text-muted hover:text-text-secondary">
            Clear all
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-text-muted">
        {loading ? 'Loading…' : `Showing ${callbacks.length} of ${totalCount} callbacks`}
      </div>

      {/* Table */}
      {error ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-8 text-center">
          <p className="text-status-error text-sm">Failed to load callbacks</p>
          <button onClick={() => refetch()} className="mt-2 text-xs text-accent-blue hover:underline">Retry</button>
        </div>
      ) : loading ? (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 w-8" /><th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th><th className="px-4 py-3 text-left font-medium">Priority</th>
                <th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-left font-medium">Requested</th>
                <th className="px-4 py-3 text-left font-medium">Agent</th><th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border-primary">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-bg-surface rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : callbacks.length === 0 ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-12 text-center">
          <PhoneCall size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary font-medium">No callback requests</p>
          <p className="text-text-muted text-sm mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'Callback requests from customers will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === callbacks.length && callbacks.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border-secondary"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Priority</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Requested</th>
                <th className="px-4 py-3 text-left font-medium">Scheduled</th>
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {callbacks.map((cb) => {
                const priorityCfg = getPriorityConfig(cb.priority);
                return (
                  <Fragment key={cb.id}>
                    <tr
                      className={`border-b border-border-primary hover:bg-bg-hover transition-colors cursor-pointer ${
                        expandedId === cb.id ? 'bg-bg-surface' : ''
                      }`}
                      onClick={() => setExpandedId(expandedId === cb.id ? null : cb.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(cb.id)}
                          onChange={() => toggleSelect(cb.id)}
                          className="rounded border-border-secondary"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{cb.customerVirtualId}</td>
                      <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{cb.reason}</td>
                      <td className={`px-4 py-3 font-medium ${priorityCfg.color}`}>{priorityCfg.label}</td>
                      <td className="px-4 py-3"><CallbackStatusBadge status={cb.status} /></td>
                      <td className="px-4 py-3 text-text-muted text-xs" title={new Date(cb.requestedAt).toLocaleString()}>
                        <div className="space-y-1">
                          <span>{formatRelativeTime(cb.requestedAt)}</span>
                          {cb.status === 'PENDING' && (
                            <ExpiryIndicator requestedAt={cb.requestedAt} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {cb.approvedSlotStart ? (
                          <span>{new Date(cb.approvedSlotStart).toLocaleDateString()} {new Date(cb.approvedSlotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {canAssign ? (
                          <AgentAssignDropdown
                            callbackId={cb.id}
                            currentAgentId={cb.assignedAgentId}
                            currentAgentName={cb.assignedAgentName}
                          />
                        ) : (
                          <span className="text-text-secondary text-xs">{cb.assignedAgentName || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          {cb.status === 'PENDING' && canManage && (
                            <>
                              <button
                                onClick={() => setApprovingId(cb.id)}
                                className="px-2 py-1 bg-status-success/10 text-status-success rounded text-xs font-medium hover:bg-status-success/20 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingId(cb.id)}
                                className="px-2 py-1 bg-status-error/10 text-status-error rounded text-xs font-medium hover:bg-status-error/20 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {cb.status === 'APPROVED' && canManage && (
                            <button
                              onClick={() => setCompleteModalId(cb.id)}
                              className="px-2 py-1 bg-accent-blue/10 text-accent-blue rounded text-xs font-medium hover:bg-accent-blue/20 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Detail Row */}
                    {expandedId === cb.id && (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 bg-bg-surface border-b border-border-primary">
                          <CallbackDetailExpansion
                            callbackRequest={cb}
                            onCollapse={() => setExpandedId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 bg-bg-elevated border border-border-primary rounded-lg px-4 py-3 flex items-center gap-4 shadow-lg">
          <span className="text-sm text-text-secondary font-medium">{selected.size} selected</span>
          {canManage && (
            <>
              <button
                disabled={!selectedPending || bulkProcessing}
                onClick={handleBulkApprove}
                className="px-3 py-1.5 bg-status-success/10 text-status-success rounded text-xs font-medium disabled:opacity-30 hover:bg-status-success/20 transition-colors"
              >
                {bulkProcessing ? 'Processing…' : 'Approve Selected'}
              </button>
              <button
                disabled={!selectedPending || bulkProcessing}
                onClick={handleBulkReject}
                className="px-3 py-1.5 bg-status-error/10 text-status-error rounded text-xs font-medium disabled:opacity-30 hover:bg-status-error/20 transition-colors"
              >
                Reject Selected
              </button>
            </>
          )}
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-text-muted hover:text-text-secondary ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Approve Modal */}
      {approvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold">Approve Callback</h3>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Slot Start *</label>
              <input
                type="datetime-local"
                value={approveSlotStart}
                onChange={(e) => setApproveSlotStart(e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm focus:outline-none focus:border-border-active"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Slot End</label>
              <input
                type="datetime-local"
                value={approveSlotEnd}
                onChange={(e) => setApproveSlotEnd(e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm focus:outline-none focus:border-border-active"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setApprovingId(null); setApproveSlotStart(''); setApproveSlotEnd(''); }}
                className="flex-1 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approvingId)}
                disabled={!approveSlotStart || approving}
                className="flex-1 py-2 bg-status-success text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {approving ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold">Reject Callback</h3>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm resize-none focus:outline-none focus:border-border-active"
                placeholder="Reason for rejection…"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                className="flex-1 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={rejecting}
                className="flex-1 py-2 bg-status-error text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {rejecting ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {completeModalId && (
        <CompleteCallbackModal
          callbackId={completeModalId}
          isOpen={true}
          onClose={() => setCompleteModalId(null)}
        />
      )}
    </div>
  );
}

export default function CallbacksPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-bg-card rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-bg-card rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-bg-card rounded-xl animate-pulse" />
      </div>
    }>
      <CallbacksContent />
    </Suspense>
  );
}
