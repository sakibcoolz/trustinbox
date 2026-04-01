'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  useWebhookSubscriptions,
  useWebhookDeliveries,
  useCreateWebhookSubscription,
  useUpdateWebhookSubscription,
  useDeleteWebhookSubscription,
  useTestWebhookSubscription,
  useRetryWebhookDelivery,
  useWebhookDeliveryUpdates,
  getSubscriptionStatusConfig,
  getDeliveryStatusConfig,
  getHealthStatus,
  WEBHOOK_EVENTS,
  type WebhookSubscription,
  type WebhookSubscriptionStatus,
  type WebhookDeliveryStatus,
  type WebhookDelivery,
  type TestWebhookResult,
} from '@/lib/graphql/webhooks';

// ─── Skeletons ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden animate-pulse">
      <div className="h-12 border-b border-border-primary bg-border-primary/20" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-14 border-b border-border-primary last:border-0 px-5 py-3 flex gap-4">
          <div className="h-4 w-64 bg-border-primary rounded" />
          <div className="h-4 w-20 bg-border-primary rounded" />
          <div className="h-4 w-16 bg-border-primary rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Create / Edit Form (12.2, 12.3) ────────────────────────────────────────

function WebhookForm({
  spId,
  existing,
  onClose,
  onSaved,
}: {
  spId: string;
  existing?: WebhookSubscription | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { success, error: toastError } = useToast();
  const { create, loading: creating } = useCreateWebhookSubscription();
  const { update, loading: updating } = useUpdateWebhookSubscription();

  const [url, setUrl] = useState(existing?.url ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [events, setEvents] = useState<string[]>(existing?.events ?? []);
  const [status, setStatus] = useState<WebhookSubscriptionStatus>(existing?.status ?? 'ACTIVE_SUBSCRIPTION');
  const [secret] = useState(() =>
    existing ? '' : Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join(''),
  );
  const [regenerateSecret, setRegenerateSecret] = useState(false);
  const [newSecret] = useState(() =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join(''),
  );
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!existing;
  const loading = creating || updating;

  function validate() {
    const e: Record<string, string> = {};
    if (!url.startsWith('https://')) e.url = 'URL must start with https://';
    if (!url.trim()) e.url = 'URL is required';
    if (events.length === 0) e.events = 'Select at least one event';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function toggleEvent(ev: string) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEditing) {
        await update({
          subscriptionId: existing.id,
          serviceProviderId: spId,
          url,
          description: description || undefined,
          events,
          status,
          newSecret: regenerateSecret ? newSecret : undefined,
        });
        success('Webhook updated');
      } else {
        await create({ serviceProviderId: spId, url, description: description || undefined, events, secret });
        setShowSecret(true);
        success('Webhook created');
      }
      onSaved();
      if (!showSecret) onClose();
    } catch {
      toastError('Failed to save webhook');
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displaySecret = isEditing && regenerateSecret ? newSecret : secret;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-surface border border-border-primary rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Webhook' : 'Create Webhook'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">✕</button>
        </div>

        {/* Secret display (shown once after create / regenerate) */}
        {showSecret && displaySecret && (
          <div className="mx-6 mt-4 p-4 bg-status-warning/10 border border-status-warning/30 rounded-lg">
            <p className="text-sm font-medium text-status-warning mb-2">Save your webhook secret — it won't be shown again</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-bg-primary p-2 rounded border border-border-primary break-all">{displaySecret}</code>
              <button onClick={() => handleCopy(displaySecret)} className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg shrink-0">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">Used for HMAC signature verification of webhook payloads.</p>
            <button onClick={onClose} className="mt-3 text-xs text-accent-blue hover:underline">Done</button>
          </div>
        )}

        {!showSecret && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Endpoint URL *</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-domain.com/webhooks"
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-secondary rounded-lg focus:border-accent-blue focus:outline-none font-mono"
              />
              {errors.url && <p className="text-xs text-status-error mt-1">{errors.url}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                placeholder="Optional description"
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-secondary rounded-lg focus:border-accent-blue focus:outline-none"
              />
            </div>

            {/* Events */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Event Types *</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-bg-hover rounded px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="accent-accent-blue"
                    />
                    <span className="text-text-secondary">{ev}</span>
                  </label>
                ))}
              </div>
              {errors.events && <p className="text-xs text-status-error mt-1">{errors.events}</p>}
            </div>

            {/* Status toggle (edit only) */}
            {isEditing && (
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">Status</label>
                <button
                  type="button"
                  onClick={() => setStatus(status === 'ACTIVE_SUBSCRIPTION' ? 'PAUSED_SUBSCRIPTION' : 'ACTIVE_SUBSCRIPTION')}
                  className={`relative w-10 h-5 rounded-full transition-colors ${status === 'ACTIVE_SUBSCRIPTION' ? 'bg-status-success' : 'bg-border-secondary'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${status === 'ACTIVE_SUBSCRIPTION' ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            )}

            {/* Regenerate secret (edit only) */}
            {isEditing && (
              <div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regenerateSecret}
                    onChange={(e) => setRegenerateSecret(e.target.checked)}
                    className="accent-accent-blue"
                  />
                  <span className="text-text-secondary">Regenerate signing secret</span>
                </label>
                {regenerateSecret && (
                  <p className="text-xs text-status-warning mt-1">A new secret will be generated. Save it — it won't be shown again.</p>
                )}
              </div>
            )}

            {/* Secret display for create */}
            {!isEditing && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Signing Secret (auto-generated)</label>
                <code className="block text-xs font-mono bg-bg-primary p-2 rounded border border-border-primary break-all text-text-muted">
                  {secret}
                </code>
                <p className="text-xs text-text-muted mt-1">Will be shown after creation. Used for HMAC payload verification.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Webhook'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirmation (12.4) ──────────────────────────────────────────────

function DeleteWebhookModal({
  webhook,
  spId,
  onClose,
  onDeleted,
}: {
  webhook: WebhookSubscription;
  spId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { success, error: toastError } = useToast();
  const { deleteWebhook, loading } = useDeleteWebhookSubscription();

  async function handleDelete() {
    try {
      await deleteWebhook(webhook.id, spId);
      success('Webhook deleted');
      onDeleted();
      onClose();
    } catch {
      toastError('Failed to delete webhook');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-surface border border-border-primary rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-2">Delete Webhook</h3>
        <p className="text-sm text-text-secondary mb-1">
          Delete webhook subscription to:
        </p>
        <code className="block text-xs font-mono text-accent-blue bg-bg-primary p-2 rounded border border-border-primary break-all mb-3">
          {webhook.url}
        </code>
        <p className="text-xs text-text-muted mb-4">
          {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''} subscribed. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm bg-status-error text-white rounded-lg font-medium hover:bg-status-error/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Test Webhook (12.5) ─────────────────────────────────────────────────────

function TestWebhookModal({
  webhook,
  spId,
  onClose,
}: {
  webhook: WebhookSubscription;
  spId: string;
  onClose: () => void;
}) {
  const { test, result, loading, error } = useTestWebhookSubscription();
  const [tested, setTested] = useState(false);

  async function handleTest() {
    try {
      await test(webhook.id, spId);
      setTested(true);
    } catch { /* error handled via hook */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-surface border border-border-primary rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-2">Test Webhook</h3>
        <code className="block text-xs font-mono text-accent-blue bg-bg-primary p-2 rounded border border-border-primary break-all mb-4">
          {webhook.url}
        </code>

        {!tested && (
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        )}

        {tested && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${result.success ? 'bg-status-success' : 'bg-status-error'}`} />
              <span className="text-sm font-medium">{result.success ? 'Success' : 'Failed'}</span>
            </div>
            {result.responseStatus != null && (
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Status Code</span>
                <span className={`font-mono font-medium ${result.responseStatus >= 200 && result.responseStatus < 300 ? 'text-status-success' : 'text-status-error'}`}>{result.responseStatus}</span>
              </div>
            )}
            {result.durationMs != null && (
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Duration</span>
                <span className="font-mono">{result.durationMs}ms</span>
              </div>
            )}
            {result.responseBody && (
              <div>
                <p className="text-xs text-text-muted mb-1">Response Body</p>
                <pre className="text-xs font-mono bg-bg-primary p-2 rounded border border-border-primary max-h-40 overflow-y-auto whitespace-pre-wrap break-all">{result.responseBody}</pre>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-accent-blue hover:underline">Done</button>
            </div>
          </div>
        )}

        {tested && error && (
          <div className="space-y-3">
            <p className="text-sm text-status-error">Test failed: {error.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Close</button>
              <button onClick={handleTest} className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg font-medium">Retry</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delivery Log (12.6, 12.7) ──────────────────────────────────────────────

function DeliveryLog({ subscriptionId, spId }: { subscriptionId: string; spId: string }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [statusFilter, setStatusFilter] = useState<WebhookDeliveryStatus | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const { data, loading, refetch } = useWebhookDeliveries(subscriptionId, spId, statusFilter, PAGE_SIZE, page * PAGE_SIZE);
  const { retry, loading: retrying } = useRetryWebhookDelivery();
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Real-time subscription for live updates
  useWebhookDeliveryUpdates(spId, useCallback((d: WebhookDelivery) => {
    if (d.subscriptionId === subscriptionId) {
      refetch();
      setNewIds((prev) => new Set(prev).add(d.id));
      setTimeout(() => setNewIds((prev) => { const next = new Set(prev); next.delete(d.id); return next; }), 3000);
    }
  }, [subscriptionId, refetch]));

  const deliveries = data?.webhookDeliveries?.nodes ?? [];
  const total = data?.webhookDeliveries?.totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function handleRetry(deliveryId: string) {
    try {
      await retry(deliveryId, spId);
      toastSuccess('Delivery retried');
    } catch {
      toastError('Failed to retry delivery');
    }
  }

  const statusFilters: { label: string; value: WebhookDeliveryStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Success', value: 'DELIVERED' },
    { label: 'Failed', value: 'FAILED_DELIVERY' },
    { label: 'Pending', value: 'PENDING_DELIVERY' },
  ];

  return (
    <div className="border-t border-border-primary bg-bg-primary/50">
      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">Delivery Log</p>
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => { setStatusFilter(f.value); setPage(0); }}
              className={`px-2 py-1 text-xs rounded ${statusFilter === f.value ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-5 pb-4 space-y-2 animate-pulse">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-8 bg-border-primary/30 rounded" />)}
        </div>
      ) : deliveries.length === 0 ? (
        <div className="px-5 pb-4 text-center">
          <p className="text-xs text-text-muted py-4">No deliveries yet</p>
        </div>
      ) : (
        <div className="px-5 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-primary">
                  <th className="text-left py-2 px-2">Event Type</th>
                  <th className="text-left py-2 px-2">Event ID</th>
                  <th className="text-left py-2 px-2">Status Code</th>
                  <th className="text-left py-2 px-2">Attempts</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Duration</th>
                  <th className="text-left py-2 px-2">Time</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const dsc = getDeliveryStatusConfig(d.status);
                  const isNew = newIds.has(d.id);
                  const statusCodeColor =
                    d.responseStatus == null ? '' :
                    d.responseStatus >= 200 && d.responseStatus < 300 ? 'text-status-success' :
                    d.responseStatus >= 300 && d.responseStatus < 400 ? 'text-status-warning' :
                    'text-status-error';

                  return (
                    <tr key={d.id} className={`border-b border-border-primary/50 last:border-0 ${isNew ? 'bg-accent-blue/5 animate-pulse' : 'hover:bg-bg-hover/50'}`}>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{d.eventType}</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-text-muted truncate max-w-[120px]" title={d.eventId}>{d.eventId.slice(0, 12)}…</td>
                      <td className={`py-2 px-2 font-mono font-medium ${statusCodeColor}`}>{d.responseStatus ?? '—'}</td>
                      <td className="py-2 px-2">{d.attemptCount}</td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${dsc.className}`}>{dsc.label}</span>
                      </td>
                      <td className="py-2 px-2 font-mono">{d.durationMs != null ? `${d.durationMs}ms` : '—'}</td>
                      <td className="py-2 px-2 text-text-muted">{formatRelativeTime(d.createdAt)}</td>
                      <td className="py-2 px-2">
                        {d.status === 'FAILED_DELIVERY' && (
                          <button
                            onClick={() => handleRetry(d.id)}
                            disabled={retrying}
                            className="text-accent-blue hover:underline disabled:opacity-50"
                            title="Retry"
                          >
                            ↻ Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
              <span>{total} total deliveries</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded hover:bg-bg-hover disabled:opacity-50">Prev</button>
                <span className="px-2 py-1">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded hover:bg-bg-hover disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page (12.1, 12.8) ──────────────────────────────────────────────────

function WebhooksContent() {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const canManage = usePermission('webhooks:manage');

  const [statusFilter, setStatusFilter] = useState<WebhookSubscriptionStatus | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookSubscription | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<WebhookSubscription | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<WebhookSubscription | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading, refetch } = useWebhookSubscriptions(spId, statusFilter);
  const webhooks = data?.webhookSubscriptions?.nodes ?? [];
  const totalCount = data?.webhookSubscriptions?.totalCount ?? 0;

  if (!spId) {
    return <div className="p-8 text-center text-text-muted">Select a service provider to manage webhooks.</div>;
  }

  const statuses: { label: string; value: WebhookSubscriptionStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Active', value: 'ACTIVE_SUBSCRIPTION' },
    { label: 'Paused', value: 'PAUSED_SUBSCRIPTION' },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Webhooks</h1>
          <p className="text-text-secondary mt-1">Manage webhook subscriptions and monitor deliveries</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
          >
            + Add Webhook
          </button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              statusFilter === s.value
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active'
            }`}
          >
            {s.label}{s.value === null && totalCount > 0 ? ` (${totalCount})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : webhooks.length === 0 ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          </div>
          <h3 className="text-sm font-medium mb-1">No webhook subscriptions yet</h3>
          <p className="text-xs text-text-muted mb-4">Create a webhook to receive real-time event notifications.</p>
          {canManage && (
            <button onClick={() => setShowCreateForm(true)} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90">
              + Add Webhook
            </button>
          )}
        </div>
      ) : (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Health</th>
                <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Endpoint</th>
                <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Events</th>
                <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Status</th>
                <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Failures</th>
                <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Last Delivery</th>
                {canManage && <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh) => {
                const sc = getSubscriptionStatusConfig(wh.status);
                const health = getHealthStatus(wh);
                const isExpanded = expandedId === wh.id;

                return (
                  <tr key={wh.id} className="contents">
                    <tr
                      className={`border-b border-border-primary hover:bg-bg-hover transition-colors cursor-pointer ${isExpanded ? 'bg-bg-hover/50' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : wh.id)}
                    >
                      <td className="px-5 py-3">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${health.color}`} title={`${health.label}: ${health.tooltip}`} />
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-mono text-text-primary truncate block max-w-[320px]" title={wh.url}>{wh.url}</span>
                        {wh.description && <p className="text-xs text-text-muted mt-0.5 truncate max-w-[320px]">{wh.description}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {wh.events.slice(0, 3).map((e) => (
                            <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{e}</span>
                          ))}
                          {wh.events.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">+{wh.events.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sc.className}`}>{sc.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm ${wh.failureCount > 0 ? 'text-status-error font-medium' : 'text-text-muted'}`}>
                          {wh.failureCount}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-text-muted">
                        {wh.lastDeliveryAt ? formatRelativeTime(wh.lastDeliveryAt) : '—'}
                      </td>
                      {canManage && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setEditingWebhook(wh)}
                              className="text-xs text-accent-blue hover:underline"
                              title="Edit"
                            >
                              Edit
                            </button>
                            {wh.status === 'ACTIVE_SUBSCRIPTION' && (
                              <button
                                onClick={() => setTestingWebhook(wh)}
                                className="text-xs text-accent-purple hover:underline"
                                title="Test"
                              >
                                Test
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingWebhook(wh)}
                              className="text-xs text-status-error hover:underline"
                              title="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Expanded delivery log */}
                    {isExpanded && (
                      <tr className="border-b border-border-primary">
                        <td colSpan={canManage ? 7 : 6}>
                          <DeliveryLog subscriptionId={wh.id} spId={spId} />
                        </td>
                      </tr>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateForm && (
        <WebhookForm spId={spId} onClose={() => setShowCreateForm(false)} onSaved={() => refetch()} />
      )}
      {editingWebhook && (
        <WebhookForm spId={spId} existing={editingWebhook} onClose={() => setEditingWebhook(null)} onSaved={() => refetch()} />
      )}
      {deletingWebhook && (
        <DeleteWebhookModal webhook={deletingWebhook} spId={spId} onClose={() => setDeletingWebhook(null)} onDeleted={() => refetch()} />
      )}
      {testingWebhook && (
        <TestWebhookModal webhook={testingWebhook} spId={spId} onClose={() => setTestingWebhook(null)} />
      )}
    </div>
  );
}

export default function WebhooksPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse"><div className="h-8 w-48 bg-border-primary rounded mb-6" /><TableSkeleton /></div>}>
      <WebhooksContent />
    </Suspense>
  );
}
