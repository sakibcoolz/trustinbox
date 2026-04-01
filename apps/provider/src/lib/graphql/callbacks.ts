import { gql, useQuery, useLazyQuery, useMutation, useSubscription } from '@apollo/client';

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

// ─── Fragments ──────────────────────────────────────────

const CALLBACK_REQUEST_FRAGMENT = gql`
  fragment CallbackRequestFields on CallbackRequest {
    id
    userId
    customerVirtualId
    serviceProviderId
    reason
    details
    status
    priority
    requestedAt
    respondedAt
    assignedAgentId
    assignedAgentName
    approvedSlotStart
    approvedSlotEnd
    rejectionReason
    outcome
    callDuration
    completionNotes
    followUpDate
    createdAt
    updatedAt
  }
`;

// ─── Queries ────────────────────────────────────────────

export const CALLBACK_REQUESTS_QUERY = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  query CallbackRequests(
    $status: CallbackRequestStatus
    $search: String
    $agentId: ID
    $from: DateTime
    $to: DateTime
    $limit: Int
    $offset: Int
  ) {
    callbackRequests(
      status: $status
      search: $search
      agentId: $agentId
      from: $from
      to: $to
      limit: $limit
      offset: $offset
    ) {
      nodes {
        ...CallbackRequestFields
      }
      totalCount
    }
  }
`;

export const CALLBACK_REQUEST_QUERY = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  query CallbackRequest($id: ID!) {
    callbackRequest(id: $id) {
      ...CallbackRequestFields
    }
  }
`;

export const CALLBACK_STATS_QUERY = gql`
  query CallbackStats($serviceProviderId: ID!) {
    callbackStats(serviceProviderId: $serviceProviderId) {
      pending
      approved
      rejected
      expired
      rescheduled
      completedThisWeek
      scheduledToday
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────

export const APPROVE_CALLBACK_REQUEST = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  mutation ApproveCallbackRequest($input: ApproveCallbackRequestInput!) {
    approveCallbackRequest(input: $input) {
      ...CallbackRequestFields
    }
  }
`;

export const REJECT_CALLBACK_REQUEST = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  mutation RejectCallbackRequest($input: RejectCallbackRequestInput!) {
    rejectCallbackRequest(input: $input) {
      ...CallbackRequestFields
    }
  }
`;

export const CREATE_CALLBACK_REQUEST = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  mutation CreateCallbackRequest($input: CreateCallbackRequestInput!) {
    createCallbackRequest(input: $input) {
      ...CallbackRequestFields
    }
  }
`;

export const COMPLETE_CALLBACK_REQUEST = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  mutation CompleteCallbackRequest($input: CompleteCallbackRequestInput!) {
    completeCallbackRequest(input: $input) {
      ...CallbackRequestFields
    }
  }
`;

export const ASSIGN_CALLBACK_REQUEST = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  mutation AssignCallbackRequest($callbackRequestId: ID!, $agentId: ID!) {
    assignCallbackRequest(callbackRequestId: $callbackRequestId, agentId: $agentId) {
      ...CallbackRequestFields
    }
  }
`;

// ─── Subscriptions ──────────────────────────────────────

export const PROVIDER_CALLBACK_REQUEST_CREATED = gql`
  ${CALLBACK_REQUEST_FRAGMENT}
  subscription ProviderCallbackRequestCreated($serviceProviderId: ID!) {
    providerCallbackRequestCreated(serviceProviderId: $serviceProviderId) {
      ...CallbackRequestFields
    }
  }
`;

// ─── Hooks ──────────────────────────────────────────────

export function useCallbackRequests(variables: CallbackRequestsVariables) {
  const { status, search, agentId, from, to, limit = 25, offset = 0 } = variables;
  return useQuery<{ callbackRequests: CallbackRequestConnection }>(CALLBACK_REQUESTS_QUERY, {
    variables: {
      status: status === 'ALL' ? undefined : status,
      search: search || undefined,
      agentId: agentId || undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });
}

export function useCallbackRequest(id: string) {
  return useQuery<{ callbackRequest: CallbackRequest }>(CALLBACK_REQUEST_QUERY, {
    variables: { id },
    skip: !id,
  });
}

export function useCallbackStats(serviceProviderId: string) {
  return useQuery<{ callbackStats: CallbackStats }>(CALLBACK_STATS_QUERY, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useApproveCallbackRequest() {
  const [approve, result] = useMutation(APPROVE_CALLBACK_REQUEST, {
    refetchQueries: ['CallbackRequests', 'CallbackStats'],
  });
  return {
    approve: (input: ApproveCallbackInput) => approve({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useRejectCallbackRequest() {
  const [reject, result] = useMutation(REJECT_CALLBACK_REQUEST, {
    refetchQueries: ['CallbackRequests', 'CallbackStats'],
  });
  return {
    reject: (input: RejectCallbackInput) => reject({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useCreateCallbackRequest() {
  const [create, result] = useMutation(CREATE_CALLBACK_REQUEST, {
    refetchQueries: ['CallbackRequests', 'CallbackStats'],
  });
  return {
    create: (input: CreateCallbackInput) => create({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useCompleteCallbackRequest() {
  const [complete, result] = useMutation(COMPLETE_CALLBACK_REQUEST, {
    refetchQueries: ['CallbackRequests', 'CallbackStats'],
  });
  return {
    complete: (input: CompleteCallbackInput) => complete({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useAssignCallbackRequest() {
  const [assign, result] = useMutation(ASSIGN_CALLBACK_REQUEST, {
    refetchQueries: ['CallbackRequests'],
  });
  return {
    assign: (callbackRequestId: string, agentId: string) =>
      assign({ variables: { callbackRequestId, agentId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useCallbackRequestCreated(serviceProviderId: string) {
  return useSubscription<{ providerCallbackRequestCreated: CallbackRequest }>(
    PROVIDER_CALLBACK_REQUEST_CREATED,
    {
      variables: { serviceProviderId },
      skip: !serviceProviderId,
    },
  );
}

// ─── Policy Check for Callbacks (reuse from customers) ──

export const CHECK_CALLBACK_POLICY = gql`
  query CheckCallbackPolicy(
    $serviceProviderId: ID!
    $userId: ID!
  ) {
    checkCommunicationPolicy(
      serviceProviderId: $serviceProviderId
      category: PERSONAL
      channel: "CALLBACK"
    ) {
      allowed
      decisionCode
      reason
      appliedRules
    }
  }
`;

export interface PolicyCheckResult {
  allowed: boolean;
  decisionCode: string;
  reason: string;
  appliedRules: string[];
}

export function useCheckCallbackPolicy() {
  const [check, { data, loading, error }] = useLazyQuery<{
    checkCommunicationPolicy: PolicyCheckResult;
  }>(CHECK_CALLBACK_POLICY);

  return {
    checkPolicy: (serviceProviderId: string, userId: string) =>
      check({ variables: { serviceProviderId, userId } }),
    result: data?.checkCommunicationPolicy ?? null,
    loading,
    error,
  };
}
