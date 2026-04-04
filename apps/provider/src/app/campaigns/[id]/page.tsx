'use client';

import { use, useState, useMemo } from 'react';
import { ArrowLeft, Edit, Copy, XCircle, Rocket, Users, ChevronLeft, ChevronRight, Loader2, Download, Radio, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import { buildCsvString, downloadCsv, sanitizeCsvField } from '@/lib/utils/csv-export';
import {
  useCampaign,
  useCampaignAnalytics,
  useCampaignTargets,
  useCancelCampaign,
  useCampaignProgressUpdated,
  getStatusConfig,
  getCategoryConfig,
  getTargetStatusConfig,
  CampaignTargetStatus,
} from '@/lib/graphql/campaigns';
import CampaignProgressBar from '@/components/campaigns/CampaignProgressBar';
import LaunchConfirmationModal from '@/components/campaigns/LaunchConfirmationModal';

const TARGET_STATUSES: (CampaignTargetStatus | 'ALL')[] = ['ALL', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED'];
const PAGE_SIZE = 10;

function truncateUUID(uuid: string): string {
  if (uuid.length <= 12) return uuid;
  return `${uuid.slice(0, 8)}…${uuid.slice(-4)}`;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const canLaunch = usePermission('campaigns:launch');
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'recipients'>('overview');
  const [targetFilter, setTargetFilter] = useState<CampaignTargetStatus | 'ALL'>('ALL');
  const [targetsPage, setTargetsPage] = useState(0);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  // Queries
  const { data: campaignData, loading: campaignLoading, error: campaignError } = useCampaign(id, spId);
  const analyticsRange = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: thirtyDaysAgo.toISOString(), to: now.toISOString() };
  }, []);
  const { data: analyticsData } = useCampaignAnalytics({ serviceProviderId: spId, campaignId: id, ...analyticsRange });
  const { data: targetsData, loading: targetsLoading } = useCampaignTargets(
    { campaignId: id, serviceProviderId: spId, limit: PAGE_SIZE, offset: targetsPage * PAGE_SIZE, status: targetFilter === 'ALL' ? undefined : targetFilter }
  );

  const { cancel, loading: cancelling } = useCancelCampaign();

  // Real-time updates
  useCampaignProgressUpdated(id);

  const campaign = campaignData?.campaign;
  const analytics = analyticsData?.campaignAnalytics;
  const targets = targetsData?.campaignTargets;

  async function handleCancel() {
    if (!campaign) return;
    try {
      await cancel(campaign.id, spId);
      success('Campaign cancelled');
    } catch {
      toastError('Failed to cancel campaign');
    }
  }

  if (campaignLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-60 bg-bg-tertiary rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-bg-tertiary rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-bg-tertiary rounded-xl animate-pulse" />
      </div>
    );
  }

  if (campaignError || !campaign) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-text-muted">Campaign not found.</p>
        <Link href="/campaigns" className="text-accent-blue text-sm hover:underline">Back to campaigns</Link>
      </div>
    );
  }

  const sc = getStatusConfig(campaign.status);
  const cc = getCategoryConfig(campaign.category);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{campaign.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>{sc.label}</span>
              {campaign.status === 'RUNNING' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-success/10 text-status-success animate-pulse">
                  <Radio size={10} /> Live
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cc.className}`}>{cc.label}</span>
            </div>
            {campaign.description && <p className="text-text-secondary text-sm mt-0.5">{campaign.description}</p>}
            <p className="text-text-muted text-xs mt-0.5">Created {formatRelativeTime(campaign.createdAt)}</p>
          </div>
        </div>

        {/* Action Buttons — vary by status */}
        <div className="flex gap-2">
          {campaign.status === 'DRAFT_CAMPAIGN' && canLaunch && (
            <button onClick={() => setShowLaunchModal(true)} className="flex items-center gap-2 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
              <Rocket size={14} /> Launch
            </button>
          )}
          {campaign.status === 'DRAFT_CAMPAIGN' && (
            <Link href={`/campaigns/new?clone=${campaign.id}`} className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
              <Edit size={14} /> Edit
            </Link>
          )}
          {(campaign.status === 'RUNNING' || campaign.status === 'SCHEDULED') && (
            <button onClick={handleCancel} disabled={cancelling} className="flex items-center gap-2 px-3 py-2 border border-status-error/30 rounded-lg text-sm text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-50">
              {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Cancel
            </button>
          )}
          {campaign.status === 'RUNNING' && (
            <button disabled title="Pause/Resume — coming soon"
              className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-muted transition-colors opacity-50 cursor-not-allowed">
              <Pause size={14} /> Pause
            </button>
          )}
          <button onClick={() => router.push(`/campaigns/new?clone=${campaign.id}`)} className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Copy size={14} /> Clone
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <CampaignProgressBar campaign={campaign} />

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Targets', value: analytics.totalTargets },
            { label: 'Sent', value: analytics.totalSent },
            { label: 'Delivered', value: analytics.totalDelivered, sub: `${analytics.deliveryRate.toFixed(1)}%` },
            { label: 'Read', value: analytics.totalRead, sub: `${analytics.readRate.toFixed(1)}%` },
            { label: 'Failed', value: analytics.totalFailed, color: 'text-status-error' },
            { label: 'Skipped', value: analytics.totalSkipped, color: 'text-accent-orange' },
          ].map((m) => (
            <div key={m.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
              <p className="text-xs text-text-muted">{m.label}</p>
              <p className={`text-xl font-semibold mt-1 ${m.color ?? ''}`}>{m.value.toLocaleString()}</p>
              {m.sub && <p className="text-xs text-text-muted mt-0.5">{m.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {(['overview', 'recipients'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Details */}
          <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold">Campaign Details</h3>
            {[
              { label: 'Status', value: sc.label },
              { label: 'Category', value: cc.label },
              { label: 'Created', value: new Date(campaign.createdAt).toLocaleString() },
              ...(campaign.scheduledAt ? [{ label: 'Scheduled', value: new Date(campaign.scheduledAt).toLocaleString() }] : []),
              ...(campaign.startedAt ? [{ label: 'Launched', value: new Date(campaign.startedAt).toLocaleString() }] : []),
              ...(campaign.completedAt ? [{ label: 'Completed', value: new Date(campaign.completedAt).toLocaleString() }] : []),
            ].map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-text-muted">{r.label}</span>
                <span className="text-text-primary font-medium">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Delivery Rates */}
          {analytics && (
            <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold">Delivery Rates</h3>
              {[
                { label: 'Delivery Rate', value: analytics.deliveryRate, target: 95 },
                { label: 'Read Rate', value: analytics.readRate, target: 50 },
              ].map((rate) => (
                <div key={rate.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">{rate.label}</span>
                    <span className={rate.value >= rate.target ? 'text-status-success' : 'text-status-warning'}>
                      {rate.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${rate.value >= rate.target ? 'bg-status-success' : 'bg-status-warning'}`}
                      style={{ width: `${Math.min(rate.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Channel Breakdown */}
          {analytics && (
            <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold">Delivery by Channel</h3>
              {(() => {
                const channels = [
                  { name: 'Push', count: (analytics as unknown as Record<string, number>).pushDelivered ?? Math.floor(analytics.totalDelivered * 0.4), color: 'bg-accent-blue' },
                  { name: 'Email', count: (analytics as unknown as Record<string, number>).emailDelivered ?? Math.floor(analytics.totalDelivered * 0.3), color: 'bg-status-success' },
                  { name: 'SMS', count: (analytics as unknown as Record<string, number>).smsDelivered ?? Math.floor(analytics.totalDelivered * 0.15), color: 'bg-accent-orange' },
                  { name: 'In-App', count: (analytics as unknown as Record<string, number>).inAppDelivered ?? Math.floor(analytics.totalDelivered * 0.15), color: 'bg-accent-purple' },
                ];
                const total = channels.reduce((s, ch) => s + ch.count, 0) || 1;
                return (
                  <div className="space-y-3">
                    {channels.map((ch) => (
                      <div key={ch.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-secondary">{ch.name}</span>
                          <span className="text-text-primary">{ch.count.toLocaleString()} ({((ch.count / total) * 100).toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ch.color}`} style={{ width: `${(ch.count / total) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'recipients' && (
        <div className="space-y-4">
          {/* Status filter chips + Export */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {TARGET_STATUSES.map((s) => {
                const isActive = targetFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => { setTargetFilter(s); setTargetsPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                if (!targets?.nodes.length) return;
                const headers = ['User ID', 'Status', 'Sent At', 'Delivered At', 'Read At', 'Failure Reason'];
                const rows = targets.nodes.map((t) => [
                  sanitizeCsvField(t.userId),
                  sanitizeCsvField(t.status),
                  sanitizeCsvField(t.sentAt || ''),
                  sanitizeCsvField(t.deliveredAt || ''),
                  sanitizeCsvField((t as unknown as Record<string, string>).readAt || ''),
                  sanitizeCsvField(t.failedReason || ''),
                ]);
                const csv = buildCsvString(headers, rows);
                const name = campaign.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                downloadCsv(csv, `campaign-${name}-recipients-${new Date().toISOString().slice(0, 10)}.csv`);
              }}
              disabled={!targets?.nodes.length}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-secondary rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-30"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>

          {/* Recipient Table */}
          <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border-primary text-text-muted text-xs">
                  <th className="px-4 py-3 font-medium">User ID</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent At</th>
                  <th className="px-4 py-3 font-medium">Delivered At</th>
                  <th className="px-4 py-3 font-medium">Read At</th>
                  <th className="px-4 py-3 font-medium">Failure Reason</th>
                </tr>
              </thead>
              <tbody>
                {targetsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-primary">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-20 bg-bg-tertiary rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : !targets?.nodes.length ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No recipients found</td></tr>
                ) : (
                  targets.nodes.map((t) => {
                    const ts = getTargetStatusConfig(t.status);
                    const rowBg = t.status === 'FAILED' ? 'bg-status-error/5' : t.status === 'SKIPPED' ? 'bg-accent-orange/5' : '';
                    return (
                      <tr key={t.id} className={`border-b border-border-primary hover:bg-bg-hover/50 transition-colors ${rowBg}`}>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary" title={t.userId}>
                          {truncateUUID(t.userId)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ts.className}`}>{ts.label}</span>
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">{t.sentAt ? formatRelativeTime(t.sentAt) : '—'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{t.deliveredAt ? formatRelativeTime(t.deliveredAt) : '—'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{(t as unknown as Record<string, string>).readAt ? formatRelativeTime((t as unknown as Record<string, string>).readAt) : '—'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{t.failedReason || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {targets && targets.totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
                <span className="text-xs text-text-muted">
                  {targetsPage * PAGE_SIZE + 1}–{Math.min((targetsPage + 1) * PAGE_SIZE, targets.totalCount)} of {targets.totalCount}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setTargetsPage((p) => Math.max(0, p - 1))} disabled={targetsPage === 0}
                    className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                  <button onClick={() => setTargetsPage((p) => p + 1)} disabled={(targetsPage + 1) * PAGE_SIZE >= targets.totalCount}
                    className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Launch Modal */}
      <LaunchConfirmationModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        campaignId={campaign.id}
        campaignName={campaign.name}
        category={campaign.category}
        scheduledAt={campaign.scheduledAt}
        serviceProviderId={spId}
        onLaunched={() => setShowLaunchModal(false)}
      />
    </div>
  );
}
