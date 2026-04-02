'use client';

import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

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

// ─── Hooks (13.6) ───────────────────────────────────────────────────────────

export function useAuditLogs(
  serviceProviderId: string,
  options?: { from?: string; to?: string; actorId?: string; actionType?: string; limit?: number; offset?: number },
) {
  const params = new URLSearchParams({ serviceProviderId });
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.actorId) params.set('actorId', options.actorId);
  if (options?.actionType) params.set('actionType', options.actionType);
  params.set('limit', String(options?.limit ?? 25));
  params.set('offset', String(options?.offset ?? 0));
  const qs = params.toString();

  const result = useData<AuditLogConnection>(
    serviceProviderId ? `/api/gateway/v1/compliance/audit-logs?${qs}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { auditLogs: result.data } : undefined };
}

// ─── Hooks (13.7) ───────────────────────────────────────────────────────────

export function useComplianceStatus(serviceProviderId: string) {
  const result = useData<ComplianceStatus>(
    serviceProviderId ? `/api/gateway/v1/compliance/status?serviceProviderId=${serviceProviderId}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { complianceStatus: result.data } : undefined };
}

// ─── Hooks (13.8) ───────────────────────────────────────────────────────────

export function usePolicyDecisionLogs(
  serviceProviderId: string,
  options?: { from?: string; to?: string; result?: PolicyResult | null; category?: string | null; limit?: number; offset?: number },
) {
  const params = new URLSearchParams({ serviceProviderId });
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.result) params.set('result', options.result);
  if (options?.category) params.set('category', options.category);
  params.set('limit', String(options?.limit ?? 25));
  params.set('offset', String(options?.offset ?? 0));
  const qs = params.toString();

  const result = useData<PolicyDecisionLogConnection>(
    serviceProviderId ? `/api/gateway/v1/compliance/policy-decisions?${qs}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { policyDecisionLogs: result.data } : undefined };
}

// ─── Hooks (13.5) ───────────────────────────────────────────────────────────

export function useSpamReports(serviceProviderId: string, status?: SpamReportStatus | null, limit = 25, offset = 0) {
  const params = new URLSearchParams({ serviceProviderId });
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const qs = params.toString();

  const result = useData<SpamReportConnection>(
    serviceProviderId ? `/api/gateway/v1/compliance/spam-reports?${qs}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { spamReports: result.data } : undefined };
}

export function useSpamReportSummary(serviceProviderId: string) {
  const result = useData<SpamReportSummary>(
    serviceProviderId ? `/api/gateway/v1/compliance/spam-reports/summary?serviceProviderId=${serviceProviderId}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { spamReportSummary: result.data } : undefined };
}

export function useResolveSpamReport() {
  const { run, loading, error } = useMutationHelper();
  return {
    resolve: (reportId: string, serviceProviderId: string) =>
      run(`/api/gateway/v1/compliance/spam-reports/${reportId}/resolve`, 'POST', { serviceProviderId }),
    loading,
    error,
  };
}

export function useDismissSpamReport() {
  const { run, loading, error } = useMutationHelper();
  return {
    dismiss: (reportId: string, serviceProviderId: string) =>
      run(`/api/gateway/v1/compliance/spam-reports/${reportId}/dismiss`, 'POST', { serviceProviderId }),
    loading,
    error,
  };
}
