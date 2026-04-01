import { gql, useQuery, useMutation } from '@apollo/client';

// ─── Types (13.6) ───────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  timestamp: string;
}

export interface AuditLogConnection {
  nodes: AuditLogEntry[];
  totalCount: number;
}

// ─── Types (13.7) ───────────────────────────────────────────────────────────

export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'NOT_VERIFIED';

export interface ComplianceStatus {
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  complianceScore: number;
  documentsSubmitted: number;
  documentsRequired: number;
  pendingItems: string[];
}

export function getVerificationBadgeConfig(status: VerificationStatus) {
  const map: Record<VerificationStatus, { label: string; className: string; iconColor: string }> = {
    VERIFIED: { label: 'Verified', className: 'bg-status-success/10 text-status-success', iconColor: 'text-status-success' },
    PENDING: { label: 'Pending Review', className: 'bg-status-warning/10 text-status-warning', iconColor: 'text-status-warning' },
    NOT_VERIFIED: { label: 'Not Verified', className: 'bg-border-secondary text-text-muted', iconColor: 'text-text-muted' },
  };
  return map[status] ?? map.NOT_VERIFIED;
}

// ─── Types (13.8) ───────────────────────────────────────────────────────────

export type PolicyResult = 'ALLOWED' | 'BLOCKED';

export interface PolicyDecisionLog {
  id: string;
  action: string;
  result: PolicyResult;
  category: string;
  channel: string;
  targetVirtualId: string;
  reasonCode: string;
  reasonDescription: string;
  timestamp: string;
}

export interface PolicyDecisionLogConnection {
  nodes: PolicyDecisionLog[];
  totalCount: number;
}

export function getPolicyResultConfig(result: PolicyResult) {
  const map: Record<PolicyResult, { label: string; className: string }> = {
    ALLOWED: { label: 'Allowed', className: 'bg-status-success/10 text-status-success' },
    BLOCKED: { label: 'Blocked', className: 'bg-status-error/10 text-status-error' },
  };
  return map[result] ?? { label: result, className: 'bg-border-secondary text-text-muted' };
}

// ─── Types (13.5) ───────────────────────────────────────────────────────────

export type SpamReportStatus = 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface SpamReport {
  id: string;
  reportedByVirtualId: string;
  notificationId: string;
  reason: string;
  status: SpamReportStatus;
  reportedAt: string;
  resolvedAt?: string;
}

export interface SpamReportConnection {
  nodes: SpamReport[];
  totalCount: number;
}

export interface SpamReportSummary {
  totalReports: number;
  openCount: number;
  resolvedCount: number;
  dismissedCount: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  topCategories: string[];
}

export function getSpamStatusConfig(status: SpamReportStatus) {
  const map: Record<SpamReportStatus, { label: string; className: string }> = {
    UNDER_REVIEW: { label: 'Under Review', className: 'bg-status-warning/10 text-status-warning' },
    RESOLVED: { label: 'Resolved', className: 'bg-status-success/10 text-status-success' },
    DISMISSED: { label: 'Dismissed', className: 'bg-border-secondary text-text-muted' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

// ─── Fragments ───────────────────────────────────────────────────────────────

export const AUDIT_LOG_FIELDS = gql`
  fragment AuditLogFields on AuditLogEntry {
    id
    actorId
    actorName
    actorRole
    action
    resourceType
    resourceId
    details
    timestamp
  }
`;

export const POLICY_DECISION_LOG_FIELDS = gql`
  fragment PolicyDecisionLogFields on PolicyDecisionLog {
    id
    action
    result
    category
    channel
    targetVirtualId
    reasonCode
    reasonDescription
    timestamp
  }
`;

export const SPAM_REPORT_FIELDS = gql`
  fragment SpamReportFields on SpamReport {
    id
    reportedByVirtualId
    notificationId
    reason
    status
    reportedAt
    resolvedAt
  }
`;

// ─── Queries (13.6) ─────────────────────────────────────────────────────────

export const GET_AUDIT_LOGS = gql`
  ${AUDIT_LOG_FIELDS}
  query GetAuditLogs($serviceProviderId: ID!, $from: DateTime, $to: DateTime, $actorId: String, $actionType: String, $limit: Int, $offset: Int) {
    auditLogs(serviceProviderId: $serviceProviderId, from: $from, to: $to, actorId: $actorId, actionType: $actionType, limit: $limit, offset: $offset) {
      nodes {
        ...AuditLogFields
      }
      totalCount
    }
  }
`;

// ─── Queries (13.7) ─────────────────────────────────────────────────────────

export const GET_COMPLIANCE_STATUS = gql`
  query GetComplianceStatus($serviceProviderId: ID!) {
    complianceStatus(serviceProviderId: $serviceProviderId) {
      verificationStatus
      verifiedAt
      complianceScore
      documentsSubmitted
      documentsRequired
      pendingItems
    }
  }
`;

// ─── Queries (13.8) ─────────────────────────────────────────────────────────

export const GET_POLICY_DECISION_LOGS = gql`
  ${POLICY_DECISION_LOG_FIELDS}
  query GetPolicyDecisionLogs($serviceProviderId: ID!, $from: DateTime, $to: DateTime, $result: String, $category: String, $limit: Int, $offset: Int) {
    policyDecisionLogs(serviceProviderId: $serviceProviderId, from: $from, to: $to, result: $result, category: $category, limit: $limit, offset: $offset) {
      nodes {
        ...PolicyDecisionLogFields
      }
      totalCount
    }
  }
`;

// ─── Queries (13.5) ─────────────────────────────────────────────────────────

export const GET_SPAM_REPORTS = gql`
  ${SPAM_REPORT_FIELDS}
  query GetSpamReports($serviceProviderId: ID!, $status: String, $limit: Int, $offset: Int) {
    spamReports(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        ...SpamReportFields
      }
      totalCount
    }
  }
`;

export const GET_SPAM_REPORT_SUMMARY = gql`
  query GetSpamReportSummary($serviceProviderId: ID!) {
    spamReportSummary(serviceProviderId: $serviceProviderId) {
      totalReports
      openCount
      resolvedCount
      dismissedCount
      trend
      topCategories
    }
  }
`;

// ─── Mutations (13.5) ───────────────────────────────────────────────────────

export const RESOLVE_SPAM_REPORT = gql`
  mutation ResolveSpamReport($reportId: ID!, $serviceProviderId: ID!) {
    resolveSpamReport(reportId: $reportId, serviceProviderId: $serviceProviderId)
  }
`;

export const DISMISS_SPAM_REPORT = gql`
  mutation DismissSpamReport($reportId: ID!, $serviceProviderId: ID!) {
    dismissSpamReport(reportId: $reportId, serviceProviderId: $serviceProviderId)
  }
`;

// ─── Hooks (13.6) ───────────────────────────────────────────────────────────

export function useAuditLogs(
  serviceProviderId: string,
  options?: { from?: string; to?: string; actorId?: string; actionType?: string; limit?: number; offset?: number },
) {
  return useQuery<{ auditLogs: AuditLogConnection }>(GET_AUDIT_LOGS, {
    variables: {
      serviceProviderId,
      from: options?.from,
      to: options?.to,
      actorId: options?.actorId,
      actionType: options?.actionType,
      limit: options?.limit ?? 25,
      offset: options?.offset ?? 0,
    },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

// ─── Hooks (13.7) ───────────────────────────────────────────────────────────

export function useComplianceStatus(serviceProviderId: string) {
  return useQuery<{ complianceStatus: ComplianceStatus }>(GET_COMPLIANCE_STATUS, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

// ─── Hooks (13.8) ───────────────────────────────────────────────────────────

export function usePolicyDecisionLogs(
  serviceProviderId: string,
  options?: { from?: string; to?: string; result?: PolicyResult | null; category?: string | null; limit?: number; offset?: number },
) {
  return useQuery<{ policyDecisionLogs: PolicyDecisionLogConnection }>(GET_POLICY_DECISION_LOGS, {
    variables: {
      serviceProviderId,
      from: options?.from,
      to: options?.to,
      result: options?.result,
      category: options?.category,
      limit: options?.limit ?? 25,
      offset: options?.offset ?? 0,
    },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

// ─── Hooks (13.5) ───────────────────────────────────────────────────────────

export function useSpamReports(serviceProviderId: string, status?: SpamReportStatus | null, limit = 25, offset = 0) {
  return useQuery<{ spamReports: SpamReportConnection }>(GET_SPAM_REPORTS, {
    variables: { serviceProviderId, status, limit, offset },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useSpamReportSummary(serviceProviderId: string) {
  return useQuery<{ spamReportSummary: SpamReportSummary }>(GET_SPAM_REPORT_SUMMARY, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useResolveSpamReport() {
  const [resolve, result] = useMutation(RESOLVE_SPAM_REPORT, {
    refetchQueries: ['GetSpamReports', 'GetSpamReportSummary'],
  });
  return {
    resolve: (reportId: string, serviceProviderId: string) =>
      resolve({ variables: { reportId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useDismissSpamReport() {
  const [dismiss, result] = useMutation(DISMISS_SPAM_REPORT, {
    refetchQueries: ['GetSpamReports', 'GetSpamReportSummary'],
  });
  return {
    dismiss: (reportId: string, serviceProviderId: string) =>
      dismiss({ variables: { reportId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}
