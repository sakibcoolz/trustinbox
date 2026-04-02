import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';
import { useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────

export type CallbackRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESCHEDULED' | 'EXPIRED';

export type CallbackPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type CallbackOutcome = 'RESOLVED' | 'FOLLOW_UP' | 'NO_ANSWER' | 'RESCHEDULED';

export interface CallbackRequest {
  id: string;
  userId: string;
  customerVirtualId: string;
  serviceProviderId: string;
  reason: string;
  details?: string;
  status: CallbackRequestStatus;
  priority: CallbackPriority;
  requestedAt: string;
  respondedAt?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  approvedSlotStart?: string;
  approvedSlotEnd?: string;
  rejectionReason?: string;
  outcome?: CallbackOutcome;
  callDuration?: number;
  completionNotes?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallbackRequestConnection {
  nodes: CallbackRequest[];
  totalCount: number;
}

export interface CallbackStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  rescheduled: number;
  completedThisWeek: number;
  scheduledToday: number;
}

export interface CallbackRequestsVariables {
  status?: CallbackRequestStatus | 'ALL';
  search?: string;
  agentId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface ApproveCallbackInput {
  callbackRequestId: string;
  approvedSlotStart: string;
  approvedSlotEnd?: string;
}

export interface RejectCallbackInput {
  callbackRequestId: string;
  reason?: string;
}

export interface CreateCallbackInput {
  userId: string;
  reason: string;
  details?: string;
  priority?: CallbackPriority;
  preferredSlots?: { start: string; end: string }[];
}

export interface CompleteCallbackInput {
  callbackRequestId: string;
  outcome: CallbackOutcome;
  callDuration?: number;
  notes?: string;
  followUpDate?: string;
}

// ─── Status Helpers ─────────────────────────────────────

export function getCallbackStatusConfig(status: CallbackRequestStatus) {
  const map: Record<CallbackRequestStatus, { label: string; color: string; variant: string }> = {
    PENDING: { label: 'Pending', color: 'bg-status-warning/10 text-status-warning', variant: 'warning' },
    APPROVED: { label: 'Approved', color: 'bg-status-success/10 text-status-success', variant: 'success' },
    REJECTED: { label: 'Rejected', color: 'bg-status-error/10 text-status-error', variant: 'error' },
    RESCHEDULED: { label: 'Rescheduled', color: 'bg-accent-blue/10 text-accent-blue', variant: 'info' },
    EXPIRED: { label: 'Expired', color: 'bg-border-secondary text-text-muted', variant: 'neutral' },
  };
  return map[status] ?? { label: status, color: 'bg-border-secondary text-text-muted', variant: 'neutral' };
}

export function getPriorityConfig(priority: CallbackPriority) {
  const map: Record<CallbackPriority, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'text-text-muted' },
    NORMAL: { label: 'Normal', color: 'text-text-secondary' },
    HIGH: { label: 'High', color: 'text-accent-orange' },
    URGENT: { label: 'Urgent', color: 'text-status-error' },
  };
  return map[priority] ?? { label: priority, color: 'text-text-muted' };
}

// ─── Query Hooks ────────────────────────────────────────

export function useCallbackRequests(variables: CallbackRequestsVariables) {
  const { status, search, agentId, from, to, limit = 25, offset = 0 } = variables;
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.set('status', status);
  if (search) params.set('search', search);
  if (agentId) params.set('agentId', agentId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const url = `/api/callbacks?${params}`;
  const result = useData<CallbackRequestConnection>(url, { deps: [status, search, agentId, from, to, limit, offset] });
  return { ...result, data: result.data ? { callbackRequests: result.data } : undefined };
}

export function useCallbackRequest(id: string) {
  const url = id ? `/api/gateway/v1/callbacks/${id}` : null;
  const result = useData<CallbackRequest>(url, { skip: !id });
  return { ...result, data: result.data ? { callbackRequest: result.data } : undefined };
}

export function useCallbackStats(serviceProviderId: string) {
  const url = serviceProviderId ? `/api/analytics/callbacks?summary=true` : null;
  const result = useData<CallbackStats>(url, { skip: !serviceProviderId });
  return { ...result, data: result.data ? { callbackStats: result.data } : undefined };
}

// ─── Mutation Hooks ─────────────────────────────────────

export function useApproveCallbackRequest() {
  const { run, loading, error } = useMutationHelper();
  return {
    approve: (input: ApproveCallbackInput) => run(`/api/callbacks/${input.callbackRequestId}/approve`, 'POST', input),
    loading, error,
  };
}

export function useRejectCallbackRequest() {
  const { run, loading, error } = useMutationHelper();
  return {
    reject: (input: RejectCallbackInput) => run(`/api/callbacks/${input.callbackRequestId}/reject`, 'POST', input),
    loading, error,
  };
}

export function useCreateCallbackRequest() {
  const { run, loading, error } = useMutationHelper<CallbackRequest>();
  return {
    create: (input: CreateCallbackInput) => run('/api/callbacks', 'POST', input),
    loading, error,
  };
}

export function useCompleteCallbackRequest() {
  const { run, loading, error } = useMutationHelper();
  return {
    complete: (input: CompleteCallbackInput) => run(`/api/callbacks/${input.callbackRequestId}/complete`, 'POST', input),
    loading, error,
  };
}

export function useAssignCallbackRequest() {
  const { run, loading, error } = useMutationHelper();
  return {
    assign: (callbackRequestId: string, agentId: string) =>
      run(`/api/callbacks/${callbackRequestId}/assign`, 'POST', { agentId }),
    loading, error,
  };
}

// ─── Subscription (replaced by SSE in Phase 4) ─────────

export function useCallbackRequestCreated(_serviceProviderId: string) {
  return { data: undefined };
}

// ─── Policy Check ───────────────────────────────────────

export interface PolicyCheckResult {
  allowed: boolean;
  decisionCode: string;
  reason: string;
  appliedRules: string[];
}

export function useCheckCallbackPolicy() {
  const [result, setResult] = useState<PolicyCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const checkPolicy = useCallback(async (serviceProviderId: string, userId: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/gateway/v1/policy/check?category=PERSONAL&channel=CALLBACK&userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkPolicy, result, loading, error };
}
