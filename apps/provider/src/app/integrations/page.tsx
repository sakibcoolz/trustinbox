'use client';

import { Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  Plug, Key, Webhook, UserCog, Plus, Copy, Eye, EyeOff, Trash2, RefreshCw,
  Shield, AlertTriangle, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Clock, Zap, Filter, ExternalLink, Link2, BarChart3,
} from 'lucide-react';
import {
  useAPIKeys,
  useCreateAPIKey,
  useRevokeAPIKey,
  useIntegrationConfigs,
  useIntegrationLogs,
  useRateLimitInfo,
  getAPIKeyStatus,
  getIntegrationStatusConfig,
  getLogStatusConfig,
  API_KEY_SCOPES,
  EXPIRY_OPTIONS,
  type APIKey,
  type APIKeyWithSecret,
  type CreateAPIKeyInput,
  type IntegrationConfig,
  type IntegrationLogStatus,
} from '@/lib/graphql/integrations';

// ─── Skeletons ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden animate-pulse">
      <div className="h-12 border-b border-border-primary bg-border-primary/20" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-14 border-b border-border-primary last:border-0 px-5 py-3 flex gap-4">
          <div className="h-4 w-48 bg-border-primary rounded" />
          <div className="h-4 w-20 bg-border-primary rounded" />
          <div className="h-4 w-16 bg-border-primary rounded" />
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

// ─── Pagination ──────────────────────────────────────────────────────────────

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

// ─── Secret Display (shown once after creation) ─────────────────────────────

function SecretBanner({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="text-status-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-status-warning">Save your API key secret now</p>
          <p className="text-xs text-text-secondary mt-0.5">This secret will only be shown once. Store it securely — you won&apos;t be able to see it again.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-bg-primary rounded-lg px-3 py-2 border border-border-primary">
        <code className="flex-1 text-sm font-mono text-text-primary break-all select-all">{secret}</code>
        <button onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-bg-card border border-border-secondary rounded text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
          <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <button onClick={onDismiss} className="text-xs text-text-muted hover:text-text-secondary">I&apos;ve saved this secret — dismiss</button>
    </div>
  );
}

// ─── Create Key Form (14.1) ─────────────────────────────────────────────────

function CreateKeyForm({ spId, onClose, onCreated }: { spId: string; onClose: () => void; onCreated: (result: APIKeyWithSecret) => void }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number>(90);
  const { create, loading } = useCreateAPIKey();
  const { error: toastError } = useToast();

  const toggleScope = (scope: string) => {
    setScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  };

  const handleSubmit = async () => {
    if (!name.trim() || scopes.length === 0) return;
    try {
      const result = await create({
        serviceProviderId: spId,
        name: name.trim(),
        scopes,
        expiresInDays: expiresInDays || undefined,
      });
      if (result) onCreated(result);
    } catch {
      toastError('Failed to create API key');
    }
  };

  return (
    <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-semibold">Generate New API Key</h3>

      <div>
        <label className="block text-xs text-text-muted mb-1.5">Key Name <span className="text-status-error">*</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="e.g. Production API Key" />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-2">Scopes <span className="text-status-error">*</span></label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {API_KEY_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)}
                className="rounded border-border-secondary text-accent-blue focus:ring-accent-blue/30" />
              <span className="text-xs text-text-secondary">{scope}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1.5">Expiry</label>
        <select value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))}
          className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
          {EXPIRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors">Cancel</button>
        <button onClick={handleSubmit} disabled={!name.trim() || scopes.length === 0 || loading}
          className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

// ─── Revoke Modal (14.1) ────────────────────────────────────────────────────

function RevokeKeyModal({ apiKey, spId, onClose }: { apiKey: APIKey; spId: string; onClose: () => void }) {
  const { revoke, loading } = useRevokeAPIKey();
  const { success, error: toastError } = useToast();

  const handleRevoke = async () => {
    try {
      await revoke({ apiKeyId: apiKey.id, serviceProviderId: spId });
      success(`API key "${apiKey.name}" revoked`);
      onClose();
    } catch {
      toastError('Failed to revoke API key');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-2">Revoke API Key</h3>
        <p className="text-sm text-text-secondary mb-1">Are you sure you want to revoke <strong>{apiKey.name}</strong>?</p>
        <div className="bg-status-error/5 border border-status-error/20 rounded-lg p-3 mb-4 mt-3">
          <p className="text-xs text-status-error">This action is irreversible. Any applications using this key ({apiKey.prefix}) will immediately lose access.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors">Cancel</button>
          <button onClick={handleRevoke} disabled={loading}
            className="px-4 py-2 bg-status-error text-white rounded-lg text-sm font-medium hover:bg-status-error/90 transition-colors disabled:opacity-50">
            {loading ? 'Revoking…' : 'Revoke Key'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── API Keys Tab (14.1) ────────────────────────────────────────────────────

function APIKeysTab({ spId }: { spId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newSecret, setNewSecret] = useState<APIKeyWithSecret | null>(null);
  const [revoking, setRevoking] = useState<APIKey | null>(null);
  const canManage = usePermission('integrations:manage');
  const { success: toastSuccess } = useToast();

  const { data, loading } = useAPIKeys(spId);
  const keys = data?.apiKeys.nodes ?? [];

  const handleCreated = (result: APIKeyWithSecret) => {
    setNewSecret(result);
    setShowCreate(false);
  };

  const handleCopyPrefix = async (prefix: string) => {
    await navigator.clipboard.writeText(prefix);
    toastSuccess('Key prefix copied');
  };

  if (loading && keys.length === 0) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
            <Plus size={16} /> Generate Key
          </button>
        </div>
      )}

      {showCreate && <CreateKeyForm spId={spId} onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {newSecret && <SecretBanner secret={newSecret.secret} onDismiss={() => setNewSecret(null)} />}

      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Key</th>
              <th className="px-4 py-3 text-left font-medium">Scopes</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-left font-medium">Last Used</th>
              <th className="px-4 py-3 text-left font-medium">Expires</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              {canManage && <th className="px-4 py-3 text-left font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-8 text-center text-text-muted">No API keys yet. Generate one to get started.</td></tr>
            )}
            {keys.map((k) => {
              const st = getAPIKeyStatus(k);
              const isRevoked = st.label === 'Revoked';
              return (
                <tr key={k.id} className={`border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors ${isRevoked ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-text-muted text-xs">{k.prefix}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px] text-text-secondary">{s}</span>
                      ))}
                      {k.scopes.length > 3 && <span className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px] text-text-muted">+{k.scopes.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">{formatRelativeTime(k.createdAt)}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{k.lastUsedAt ? formatRelativeTime(k.lastUsedAt) : 'Never'}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{k.expiresAt ? formatRelativeTime(k.expiresAt) : 'Never'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span></td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleCopyPrefix(k.prefix)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Copy prefix">
                          <Copy size={14} />
                        </button>
                        {st.label === 'Active' && (
                          <button onClick={() => setRevoking(k)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error" title="Revoke">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {revoking && <RevokeKeyModal apiKey={revoking} spId={spId} onClose={() => setRevoking(null)} />}
    </div>
  );
}

// ─── Integrations Grid Tab (14.2) ───────────────────────────────────────────

const STATIC_INTEGRATIONS = [
  { name: 'Slack', description: 'Receive notifications and callback alerts in Slack channels', icon: '💬' },
  { name: 'Salesforce', description: 'Sync customer communication data with Salesforce CRM', icon: '☁️' },
  { name: 'HubSpot', description: 'Connect contacts and communication history with HubSpot', icon: '🟠' },
  { name: 'Zendesk', description: 'Route escalations and callback requests to Zendesk tickets', icon: '💚' },
  { name: 'Custom Webhook', description: 'Send events to any HTTP endpoint via webhooks', icon: '🔗' },
];

function IntegrationsGridTab({ spId }: { spId: string }) {
  const { data } = useIntegrationConfigs(spId);
  const configs = data?.integrationConfigs ?? [];

  const integrations = useMemo(() => {
    return STATIC_INTEGRATIONS.map((si) => {
      const config = configs.find((c) => c.name.toLowerCase() === si.name.toLowerCase());
      return {
        ...si,
        status: config?.status ?? (si.name === 'Custom Webhook' ? 'NOT_CONNECTED' as const : 'COMING_SOON' as const),
        lastSyncAt: config?.lastSyncAt,
        errorMessage: config?.errorMessage,
      };
    });
  }, [configs]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {integrations.map((integ) => {
        const sc = getIntegrationStatusConfig(integ.status);
        const isDisabled = integ.status === 'COMING_SOON';
        const configLink = integ.name === 'Custom Webhook' ? '/webhooks' : undefined;

        return (
          <div key={integ.name} className={`bg-bg-card border border-border-primary rounded-xl p-5 flex flex-col ${isDisabled ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{integ.icon}</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{integ.name}</h3>
                <p className="text-xs text-text-muted mt-0.5">{integ.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>{sc.label}</span>
              {integ.lastSyncAt && (
                <span className="text-xs text-text-muted">Last sync {formatRelativeTime(integ.lastSyncAt)}</span>
              )}
            </div>

            {integ.errorMessage && (
              <p className="text-xs text-status-error mb-3 flex items-center gap-1"><AlertTriangle size={12} /> {integ.errorMessage}</p>
            )}

            <div className="mt-auto">
              {configLink ? (
                <a href={configLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-active transition-colors">
                  Configure <ExternalLink size={10} />
                </a>
              ) : (
                <button disabled={isDisabled}
                  className="px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-active transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {isDisabled ? 'Coming Soon' : 'Configure'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Integration Logs Tab (14.3) ────────────────────────────────────────────

function IntegrationLogsTab({ spId }: { spId: string }) {
  const [integrationFilter, setIntegrationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data, loading } = useIntegrationLogs(spId, {
    integration: integrationFilter || undefined,
    status: statusFilter || undefined,
    limit,
    offset,
  });
  const logs = data?.integrationLogs.nodes ?? [];
  const totalCount = data?.integrationLogs.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  if (loading && logs.length === 0) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={integrationFilter} onChange={(e) => { setIntegrationFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
          <option value="">All Integrations</option>
          {STATIC_INTEGRATIONS.map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="ERROR">Error</option>
          <option value="WARNING">Warning</option>
        </select>
        <span className="text-xs text-text-muted ml-auto flex items-center gap-1"><RefreshCw size={12} /> Auto-refreshes every 30s</span>
      </div>

      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium">Integration</th>
              <th className="px-4 py-3 text-left font-medium">Event</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No integration logs found</td></tr>
            )}
            {logs.map((l) => {
              const sc = getLogStatusConfig(l.status);
              return (
                <tr key={l.id} className={`border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors ${l.status === 'ERROR' ? 'bg-status-error/5' : ''}`}>
                  <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">{formatRelativeTime(l.timestamp)}</td>
                  <td className="px-4 py-3 font-medium">{l.integration}</td>
                  <td className="px-4 py-3 text-text-secondary">{l.event}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>{sc.label}</span></td>
                  <td className="px-4 py-3 text-text-muted text-xs max-w-xs truncate">{l.details}</td>
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

// ─── Rate Limit Dashboard (14.4) ────────────────────────────────────────────

function RateLimitDashboard({ spId }: { spId: string }) {
  const { data, loading } = useRateLimitInfo(spId);
  const info = data?.rateLimitInfo;

  if (loading) return <CardSkeleton />;
  if (!info) return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 text-center text-text-muted text-sm">
      Rate limit data unavailable
    </div>
  );

  const usagePercent = info.limit > 0 ? (info.currentUsage / info.limit) * 100 : 0;
  const barColor = usagePercent > 90 ? 'bg-status-error' : usagePercent > 70 ? 'bg-status-warning' : 'bg-status-success';
  const resetsIn = info.resetsAt ? (() => {
    const diff = new Date(info.resetsAt).getTime() - Date.now();
    if (diff <= 0) return 'Resetting soon';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `Resets in ${h}h ${m}m`;
  })() : null;

  return (
    <div className="space-y-4">
      {usagePercent > 80 && (
        <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-status-warning shrink-0" />
          <p className="text-sm text-status-warning">API usage is at {usagePercent.toFixed(0)}% of your daily limit. Consider optimizing your API calls to avoid throttling.</p>
        </div>
      )}

      <div className="bg-bg-card border border-border-primary rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-secondary">API Usage Today</h3>
          {resetsIn && <span className="text-xs text-text-muted flex items-center gap-1"><Clock size={12} /> {resetsIn}</span>}
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-semibold">{info.currentUsage.toLocaleString()}</span>
          <span className="text-sm text-text-muted">/ {info.limit.toLocaleString()} requests</span>
        </div>

        <div className="h-3 bg-border-primary rounded-full overflow-hidden mb-4">
          <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
        </div>

        {info.scopeBreakdown && info.scopeBreakdown.length > 0 && (
          <div className="border-t border-border-primary pt-4 mt-2">
            <p className="text-xs text-text-muted mb-3">Per-scope breakdown</p>
            <div className="space-y-2">
              {info.scopeBreakdown.map((sb) => {
                const pct = sb.limit > 0 ? (sb.usage / sb.limit) * 100 : 0;
                const c = pct > 90 ? 'bg-status-error' : pct > 70 ? 'bg-status-warning' : 'bg-status-success';
                return (
                  <div key={sb.scope}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-secondary">{sb.scope}</span>
                      <span className="text-text-muted">{sb.usage.toLocaleString()} / {sb.limit.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-border-primary rounded-full overflow-hidden">
                      <div className={`h-full ${c} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Content ───────────────────────────────────────────────────────────

type TabKey = 'keys' | 'integrations' | 'logs' | 'rate-limit';

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') as TabKey | null;
  const [tab, setTab] = useState<TabKey>(defaultTab || 'keys');
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';

  const tabs = [
    { key: 'keys' as const, label: 'API Keys', icon: Key },
    { key: 'integrations' as const, label: 'Integrations', icon: Link2 },
    { key: 'logs' as const, label: 'Logs', icon: RefreshCw },
    { key: 'rate-limit' as const, label: 'Rate Limits', icon: BarChart3 },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-text-secondary mt-1">Manage API keys, third-party integrations, and monitor usage</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'keys' && <APIKeysTab spId={spId} />}
      {tab === 'integrations' && <IntegrationsGridTab spId={spId} />}
      {tab === 'logs' && <IntegrationLogsTab spId={spId} />}
      {tab === 'rate-limit' && <RateLimitDashboard spId={spId} />}
    </div>
  );
}

// ─── Page Wrapper ────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-border-primary rounded mb-2" />
          <div className="h-4 w-80 bg-border-primary rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
        <TableSkeleton />
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
