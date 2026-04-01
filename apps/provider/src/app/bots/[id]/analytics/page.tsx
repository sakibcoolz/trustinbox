'use client';

import { useState, use, Suspense, Fragment } from 'react';
import { ArrowLeft, BarChart3, MessageSquare, Send, Inbox, Zap, AlertTriangle, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeTime } from '@/lib/format';
import {
  useBotAnalytics,
  useBotActionLogs,
} from '@/lib/graphql/bots';

function AnalyticsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';

  const { data, loading, error } = useBotAnalytics(id, spId);
  const analytics = data?.botAnalytics;

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-24 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-status-error">{error.message}</p>
        <Link href={`/bots/${id}`} className="text-accent-purple text-sm hover:underline mt-2 inline-block">Back to bot</Link>
      </div>
    );
  }

  const a = analytics;

  const kpis: { label: string; value: string; icon: typeof MessageSquare }[] = [
    { label: 'Total Conversations', value: a?.totalConversations?.toLocaleString() ?? '0', icon: MessageSquare },
    { label: 'Messages Sent', value: a?.totalMessagesSent?.toLocaleString() ?? '0', icon: Send },
    { label: 'Messages Received', value: a?.totalMessagesReceived?.toLocaleString() ?? '0', icon: Inbox },
    { label: 'Total Actions', value: a?.totalActionsExecuted?.toLocaleString() ?? '0', icon: Zap },
    { label: 'Total Escalations', value: a?.totalEscalations?.toLocaleString() ?? '0', icon: AlertTriangle },
    { label: 'Avg Response Time', value: a?.avgResponseTimeMs ? `${(a.avgResponseTimeMs / 1000).toFixed(1)}s` : '—', icon: Clock },
    { label: 'Escalation Rate', value: a?.escalationRate != null ? `${(a.escalationRate * 100).toFixed(1)}%` : '—', icon: TrendingUp },
    { label: 'Resolution Rate', value: a?.resolutionRate != null ? `${(a.resolutionRate * 100).toFixed(1)}%` : '—', icon: CheckCircle },
    { label: 'Satisfaction', value: a?.satisfactionScore != null ? `${(a.satisfactionScore * 100).toFixed(0)}%` : '—', icon: BarChart3 },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/bots/${id}`} className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Bot Analytics</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            Performance dashboard{a?.lastActiveAt ? ` · Last active ${formatRelativeTime(a.lastActiveAt)}` : ''}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">{kpi.label}</p>
              <kpi.icon size={16} className="text-text-muted" />
            </div>
            <p className="text-xl font-semibold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Audit Log */}
      <AuditLog botId={id} />
    </div>
  );
}

/* ─── Audit Log (Task 10.16) ─── */
function AuditLog({ botId }: { botId: string }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const limit = 50;

  const { data, loading } = useBotActionLogs({ botId, serviceProviderId: spId, limit, offset: page * limit });
  const logs = data?.botActionLogs?.nodes ?? [];
  const totalCount = data?.botActionLogs?.totalCount ?? 0;

  const filtered = filter === 'all' ? logs : logs.filter((l) => filter === 'success' ? l.success : !l.success);

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Action Audit Log ({totalCount})</h3>
        <div className="flex gap-1">
          {(['all', 'success', 'failed'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-accent-purple/10 text-accent-purple' : 'text-text-muted hover:text-text-secondary'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-bg-tertiary rounded animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">No actions recorded</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted border-b border-border-primary">
                  <th className="text-left py-2 px-2">Time</th>
                  <th className="text-left py-2 px-2">Action</th>
                  <th className="text-left py-2 px-2">Tool</th>
                  <th className="text-left py-2 px-2">Policy</th>
                  <th className="text-left py-2 px-2">Duration</th>
                  <th className="text-left py-2 px-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <Fragment key={log.id}>
                    <tr onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="border-b border-border-primary cursor-pointer hover:bg-bg-hover/50">
                      <td className="py-2 px-2 text-xs text-text-muted">{formatRelativeTime(log.createdAt)}</td>
                      <td className="py-2 px-2 text-xs font-medium">{log.actionType}</td>
                      <td className="py-2 px-2 text-xs font-mono text-text-secondary">{log.toolUsed || '—'}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          log.policyDecision === 'ALLOWED' ? 'bg-status-success/10 text-status-success' :
                          log.policyDecision === 'DENIED' ? 'bg-status-error/10 text-status-error' :
                          'bg-border-secondary text-text-muted'
                        }`}>{log.policyDecision || '—'}</span>
                      </td>
                      <td className="py-2 px-2 text-xs text-text-muted">{log.durationMs ? `${log.durationMs}ms` : '—'}</td>
                      <td className="py-2 px-2 text-xs">{log.success ? '✅' : '❌'}</td>
                    </tr>
                    {expandedId === log.id && (
                      <tr>
                        <td colSpan={6} className="p-4 bg-bg-tertiary border-b border-border-primary">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-text-muted mb-1 font-medium">Input Summary</p>
                              <pre className="text-text-secondary whitespace-pre-wrap break-words bg-bg-card rounded p-2">{log.inputSummary || '—'}</pre>
                            </div>
                            <div>
                              <p className="text-text-muted mb-1 font-medium">Output Summary</p>
                              <pre className="text-text-secondary whitespace-pre-wrap break-words bg-bg-card rounded p-2">{log.outputSummary || '—'}</pre>
                            </div>
                            {log.errorMessage && (
                              <div className="col-span-2">
                                <p className="text-status-error mb-1 font-medium">Error</p>
                                <pre className="text-status-error/80 whitespace-pre-wrap break-words bg-bg-card rounded p-2">{log.errorMessage}</pre>
                              </div>
                            )}
                            {log.conversationId && (
                              <div className="col-span-2">
                                <Link href={`/conversations/${log.conversationId}`} className="text-accent-purple text-xs hover:underline">
                                  View Conversation →
                                </Link>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {totalCount > limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-text-muted">Page {page + 1} of {Math.ceil(totalCount / limit)}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="px-3 py-1.5 border border-border-secondary rounded-lg text-xs disabled:opacity-30">Prev</button>
                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= totalCount}
                  className="px-3 py-1.5 border border-border-secondary rounded-lg text-xs disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BotAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-24 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
      </div>
    }>
      <AnalyticsContent params={params} />
    </Suspense>
  );
}
