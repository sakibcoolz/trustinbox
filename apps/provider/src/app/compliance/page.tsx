'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import { buildCsvString, downloadCsv } from '@/lib/utils/csv-export';
import {
  Shield, Search, AlertTriangle, CheckCircle2, XCircle, FileText, Clock,
  Download, ShieldCheck, ShieldAlert, ShieldX, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, ExternalLink, Filter,
} from 'lucide-react';
import {
  useAuditLogs,
  useComplianceStatus,
  usePolicyDecisionLogs,
  useSpamReports,
  useSpamReportSummary,
  useResolveSpamReport,
  useDismissSpamReport,
  getPolicyResultConfig,
  getVerificationBadgeConfig,
  getSpamStatusConfig,
  type PolicyResult,
  type SpamReportStatus,
} from '@/lib/graphql/compliance';

// ─── Skeletons ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden animate-pulse">
      <div className="h-12 border-b border-border-primary bg-border-primary/20" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-14 border-b border-border-primary last:border-0 px-5 py-3 flex gap-4">
          <div className="h-4 w-48 bg-border-primary rounded" />
          <div className="h-4 w-20 bg-border-primary rounded" />
          <div className="h-4 w-32 bg-border-primary rounded" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4 animate-pulse">
      <div className="h-3 w-24 bg-border-primary rounded mb-3" />
      <div className="h-6 w-16 bg-border-primary rounded" />
    </div>
  );
}

// ─── Pagination (shared) ─────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-text-muted">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Verification Status Card (13.2) ────────────────────────────────────────

function VerificationStatusCard({ spId }: { spId: string }) {
  const { data, loading } = useComplianceStatus(spId);
  const status = data?.complianceStatus;

  if (loading) return <CardSkeleton />;
  if (!status) return null;

  const badge = getVerificationBadgeConfig(status.verificationStatus);
  const VerifIcon = status.verificationStatus === 'VERIFIED' ? ShieldCheck
    : status.verificationStatus === 'PENDING' ? ShieldAlert : ShieldX;

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-1">Verification Status</h3>
          <div className="flex items-center gap-2">
            <VerifIcon size={20} className={badge.iconColor} />
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
          </div>
        </div>
        {status.verifiedAt && (
          <p className="text-xs text-text-muted">Verified {formatRelativeTime(status.verifiedAt)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-xs text-text-muted mb-1">Documents</p>
          <p className="text-lg font-semibold">{status.documentsSubmitted}/{status.documentsRequired}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">Compliance Score</p>
          <p className="text-lg font-semibold text-status-success">{status.complianceScore}%</p>
        </div>
      </div>

      {status.pendingItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-primary">
          <p className="text-xs text-text-muted mb-2">Pending Review Items</p>
          <ul className="space-y-1">
            {status.pendingItems.map((item, i) => (
              <li key={i} className="text-xs text-status-warning flex items-center gap-1.5">
                <Clock size={12} /> {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Compliance Checklist (13.3) ─────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { key: 'identity', label: 'Organization Identity Verified', link: '/settings' },
  { key: 'tos', label: 'Terms of Service Accepted', link: '/settings' },
  { key: 'dpa', label: 'Data Processing Agreement Signed', link: '/settings' },
  { key: 'license', label: 'Business License Uploaded', link: '/settings' },
  { key: 'policy', label: 'Communication Policy Configured', link: '/settings' },
  { key: 'contact', label: 'Admin Contact Verified', link: '/settings/team' },
  { key: 'webhook', label: 'Webhook Security (HMAC) Configured', link: '/webhooks' },
] as const;

type CheckStatus = 'complete' | 'pending' | 'not_started';

function ComplianceChecklist({ spId }: { spId: string }) {
  const { data, loading } = useComplianceStatus(spId);
  const status = data?.complianceStatus;

  const items = useMemo(() => {
    if (!status) return CHECKLIST_ITEMS.map((c) => ({ ...c, status: 'not_started' as CheckStatus }));
    const pending = new Set(status.pendingItems.map((p) => p.toLowerCase()));
    return CHECKLIST_ITEMS.map((c) => {
      if (pending.has(c.label.toLowerCase())) return { ...c, status: 'pending' as CheckStatus };
      if (status.verificationStatus === 'VERIFIED') return { ...c, status: 'complete' as CheckStatus };
      const completionRatio = status.documentsSubmitted / Math.max(status.documentsRequired, 1);
      return { ...c, status: completionRatio > 0.5 ? 'complete' as CheckStatus : 'not_started' as CheckStatus };
    });
  }, [status]);

  const completedCount = items.filter((i) => i.status === 'complete').length;

  if (loading) return <CardSkeleton />;

  const statusIcon = (s: CheckStatus) => {
    if (s === 'complete') return <CheckCircle2 size={16} className="text-status-success" />;
    if (s === 'pending') return <Clock size={16} className="text-status-warning" />;
    return <XCircle size={16} className="text-text-muted" />;
  };

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Compliance Checklist</h3>
        <span className="text-xs text-text-muted">{completedCount} of {items.length} complete</span>
      </div>

      <div className="h-2 bg-border-primary rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-status-success rounded-full transition-all duration-300"
          style={{ width: `${(completedCount / items.length) * 100}%` }} />
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              {statusIcon(item.status)}
              <span className={`text-sm ${item.status === 'complete' ? 'text-text-secondary line-through' : ''}`}>{item.label}</span>
            </div>
            {item.status !== 'complete' && (
              <a href={item.link} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
                Configure <ExternalLink size={10} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Policy Status Tab (13.2 + 13.3) ────────────────────────────────────────

function PolicyStatusTab({ spId }: { spId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <VerificationStatusCard spId={spId} />
      <ComplianceChecklist spId={spId} />
    </div>
  );
}

// ─── Audit Log Tab (13.1 + 13.4) ────────────────────────────────────────────

function AuditLogTab({ spId, spName }: { spId: string; spName: string }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const canManage = usePermission('compliance:manage');
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data, loading } = useAuditLogs(spId, { actionType: actionFilter || undefined, limit, offset });
  const logs = data?.auditLogs.nodes ?? [];
  const totalCount = data?.auditLogs.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) =>
      l.action.toLowerCase().includes(q) || l.actorName.toLowerCase().includes(q) || l.details.toLowerCase().includes(q),
    );
  }, [logs, search]);

  const handleExport = useCallback(() => {
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Details', 'Resource'];
    const rows = filtered.map((l) => [l.timestamp, l.actorName, l.actorRole, l.action, l.details, `${l.resourceType}/${l.resourceId}`]);
    const csv = buildCsvString(headers, rows);
    const now = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `audit_log_${spName}_${now}.csv`);
  }, [filtered, spName]);

  if (loading && logs.length === 0) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search audit logs…" />
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
          <option value="">All Actions</option>
          <option value="API_KEY">API Key</option>
          <option value="WEBHOOK">Webhook</option>
          <option value="TEAM">Team</option>
          <option value="BOT">Bot</option>
          <option value="CAMPAIGN">Campaign</option>
          <option value="SETTINGS">Settings</option>
        </select>
        {canManage && (
          <button onClick={handleExport} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-active transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
              <th className="px-4 py-3 text-left font-medium">Resource</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No audit log entries found</td></tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">{formatRelativeTime(l.timestamp)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{l.actorName}</p>
                  <p className="text-xs text-text-muted">{l.actorRole}</p>
                </td>
                <td className="px-4 py-3 font-medium">{l.action}</td>
                <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{l.details}</td>
                <td className="px-4 py-3 text-text-muted text-xs font-mono">{l.resourceType}/{l.resourceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ─── Communication Audit Tab (13.1 + 13.4 + 13.8) ──────────────────────────

function CommunicationAuditTab({ spId, spName }: { spId: string; spName: string }) {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<PolicyResult | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const canManage = usePermission('compliance:manage');
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data, loading } = usePolicyDecisionLogs(spId, {
    result: resultFilter || null,
    category: categoryFilter || null,
    limit,
    offset,
  });
  const logs = data?.policyDecisionLogs.nodes ?? [];
  const totalCount = data?.policyDecisionLogs.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) =>
      l.action.toLowerCase().includes(q) || l.targetVirtualId.toLowerCase().includes(q) || l.reasonDescription.toLowerCase().includes(q),
    );
  }, [logs, search]);

  const handleExport = useCallback(() => {
    const headers = ['Timestamp', 'Action', 'Result', 'Category', 'Channel', 'Target', 'Reason Code'];
    const rows = filtered.map((l) => [l.timestamp, l.action, l.result, l.category, l.channel, l.targetVirtualId, l.reasonCode]);
    const csv = buildCsvString(headers, rows);
    const now = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `communication_audit_${spName}_${now}.csv`);
  }, [filtered, spName]);

  if (loading && logs.length === 0) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search policy decisions…" />
        </div>
        <select value={resultFilter} onChange={(e) => { setResultFilter(e.target.value as PolicyResult | ''); setPage(1); }}
          className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
          <option value="">All Results</option>
          <option value="ALLOWED">Allowed</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
          <option value="">All Categories</option>
          <option value="PERSONAL">Personal</option>
          <option value="ORGANIZATIONAL">Organizational</option>
          <option value="ADVERTISEMENT">Advertisement</option>
        </select>
        {canManage && (
          <button onClick={handleExport} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-active transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Result</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Channel</th>
              <th className="px-4 py-3 text-left font-medium">Target</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-left font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No policy decision logs found</td></tr>
            )}
            {filtered.map((l) => {
              const rc = getPolicyResultConfig(l.result);
              return (
                <tr key={l.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium">{l.action}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rc.className}`}>{rc.label}</span></td>
                  <td className="px-4 py-3 text-text-secondary">{l.category}</td>
                  <td className="px-4 py-3 text-text-secondary">{l.channel}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">{l.targetVirtualId}</td>
                  <td className="px-4 py-3 text-text-muted text-xs" title={l.reasonCode}>{l.reasonDescription}</td>
                  <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">{formatRelativeTime(l.timestamp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ─── Spam Reports Tab (13.5) ─────────────────────────────────────────────────

function SpamReportsTab({ spId }: { spId: string }) {
  const [statusFilter, setStatusFilter] = useState<SpamReportStatus | ''>('');
  const [page, setPage] = useState(1);
  const canManage = usePermission('compliance:manage');
  const { success, error: toastError } = useToast();
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data: summaryData } = useSpamReportSummary(spId);
  const summary = summaryData?.spamReportSummary;

  const { data, loading } = useSpamReports(spId, statusFilter || null, limit, offset);
  const reports = data?.spamReports.nodes ?? [];
  const totalCount = data?.spamReports.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  const { resolve, loading: resolving } = useResolveSpamReport();
  const { dismiss, loading: dismissing } = useDismissSpamReport();

  const handleResolve = async (reportId: string) => {
    try {
      await resolve(reportId, spId);
      success('Spam report resolved');
    } catch {
      toastError('Failed to resolve spam report');
    }
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await dismiss(reportId, spId);
      success('Spam report dismissed');
    } catch {
      toastError('Failed to dismiss spam report');
    }
  };

  const TrendIcon = summary?.trend === 'INCREASING' ? TrendingUp
    : summary?.trend === 'DECREASING' ? TrendingDown : Minus;
  const trendColor = summary?.trend === 'INCREASING' ? 'text-status-error'
    : summary?.trend === 'DECREASING' ? 'text-status-success' : 'text-text-muted';

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">Total Reports</p>
            <p className="text-xl font-semibold mt-1">{summary.totalReports}</p>
          </div>
          <div className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">Open</p>
            <p className="text-xl font-semibold mt-1 text-status-warning">{summary.openCount}</p>
          </div>
          <div className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">Trend</p>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendIcon size={18} className={trendColor} />
              <span className={`text-sm font-medium ${trendColor}`}>{summary.trend}</span>
            </div>
          </div>
          <div className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">Top Categories</p>
            <p className="text-sm mt-1 text-text-secondary truncate">{summary.topCategories.join(', ') || '—'}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter size={14} className="text-text-muted" />
        {(['', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((s) => {
          const label = s === '' ? 'All' : getSpamStatusConfig(s as SpamReportStatus).label;
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => { setStatusFilter(s as SpamReportStatus | ''); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-accent-blue/10 text-accent-blue' : 'bg-bg-input text-text-muted hover:text-text-primary'}`}>
              {label}
            </button>
          );
        })}
      </div>

      {loading && reports.length === 0 ? <TableSkeleton /> : (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 text-left font-medium">Reported By</th>
                <th className="px-4 py-3 text-left font-medium">Notification</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Reported</th>
                {canManage && <th className="px-4 py-3 text-left font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-text-muted">No spam reports found</td></tr>
              )}
              {reports.map((r) => {
                const sc = getSpamStatusConfig(r.status);
                return (
                  <tr key={r.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{r.reportedByVirtualId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.notificationId}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.reason}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>{sc.label}</span></td>
                    <td className="px-4 py-3 text-text-muted text-xs">{formatRelativeTime(r.reportedAt)}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        {r.status === 'UNDER_REVIEW' ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleResolve(r.id)} disabled={resolving}
                              className="text-xs text-status-success hover:underline disabled:opacity-50">Resolve</button>
                            <button onClick={() => handleDismiss(r.id)} disabled={dismissing}
                              className="text-xs text-text-muted hover:underline disabled:opacity-50">Dismiss</button>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ─── Main Content (13.1) ────────────────────────────────────────────────────

function ComplianceContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') as 'status' | 'audit' | 'communication' | 'spam' | null;
  const [tab, setTab] = useState<'status' | 'audit' | 'communication' | 'spam'>(defaultTab || 'status');
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const spName = activeServiceProvider?.name?.replace(/\s+/g, '_') ?? 'provider';

  const { data: complianceData } = useComplianceStatus(spId);
  const { data: spamData } = useSpamReportSummary(spId);
  const { data: policyData } = usePolicyDecisionLogs(spId, { limit: 0, offset: 0 });

  const complianceScore = complianceData?.complianceStatus?.complianceScore;
  const openSpam = spamData?.spamReportSummary?.openCount ?? 0;
  const totalDecisions = policyData?.policyDecisionLogs?.totalCount ?? 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance Center</h1>
        <p className="text-text-secondary mt-1">Policy status, audit trail, communication audit, and spam report management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Policy Decisions', value: totalDecisions.toLocaleString(), icon: Shield },
          { label: 'Blocked', value: '—', color: 'text-status-error', icon: XCircle },
          { label: 'Spam Reports (Open)', value: openSpam.toString(), color: 'text-status-warning', icon: AlertTriangle },
          { label: 'Compliance Score', value: complianceScore != null ? `${complianceScore}%` : '—', color: 'text-status-success', icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">{s.label}</p>
              <s.icon size={16} className={s.color || 'text-text-muted'} />
            </div>
            <p className={`text-xl font-semibold mt-1 ${s.color || ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {([
          { key: 'status' as const, label: 'Policy Status', icon: Shield },
          { key: 'audit' as const, label: 'Audit Log', icon: FileText },
          { key: 'communication' as const, label: 'Communication Audit', icon: Shield },
          { key: 'spam' as const, label: 'Spam Reports', icon: AlertTriangle },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'status' && <PolicyStatusTab spId={spId} />}
      {tab === 'audit' && <AuditLogTab spId={spId} spName={spName} />}
      {tab === 'communication' && <CommunicationAuditTab spId={spId} spName={spName} />}
      {tab === 'spam' && <SpamReportsTab spId={spId} />}
    </div>
  );
}

// ─── Page Wrapper ────────────────────────────────────────────────────────────

export default function CompliancePage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-border-primary rounded mb-2" />
          <div className="h-4 w-80 bg-border-primary rounded" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
        <TableSkeleton />
      </div>
    }>
      <ComplianceContent />
    </Suspense>
  );
}
