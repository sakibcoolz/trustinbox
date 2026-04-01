'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Plus, ChevronLeft, ChevronRight, Copy, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCampaigns,
  useCampaignProgressUpdated,
  CampaignStatus,
  Campaign,
  getStatusConfig,
  getCategoryConfig,
} from '@/lib/graphql/campaigns';
import { formatRelativeTime } from '@/lib/format';
import CampaignProgressBar from '@/components/campaigns/CampaignProgressBar';

const FILTER_CHIPS: { label: string; value: CampaignStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'DRAFT_CAMPAIGN' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Active', value: 'RUNNING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const PAGE_SIZES = [10, 25, 50];

function CampaignsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';

  const initialStatus = searchParams.get('status') as CampaignStatus | null;
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | null>(initialStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data, loading, error, refetch } = useCampaigns({
    serviceProviderId: spId,
    status: statusFilter,
    limit: pageSize,
    offset: page * pageSize,
  });

  // Real-time progress updates for running campaigns
  useCampaignProgressUpdated(spId);

  const campaigns = data?.campaigns?.nodes ?? [];
  const totalCount = data?.campaigns?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Client-side search filter
  const filteredCampaigns = useMemo(() => {
    if (!debouncedSearch) return campaigns;
    return campaigns.filter((c) =>
      c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [campaigns, debouncedSearch]);

  function handleFilterChange(status: CampaignStatus | null) {
    setStatusFilter(status);
    setPage(0);
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set('status', status);
    else params.delete('status');
    router.replace(`/campaigns?${params.toString()}`, { scroll: false });
  }

  // Loading skeleton
  if (loading && campaigns.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="flex gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 w-20 bg-bg-tertiary rounded-full animate-pulse" />)}</div>
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-status-error/5 border border-status-error/20 rounded-xl p-6 text-center">
          <p className="text-sm text-status-error font-medium">Failed to load campaigns</p>
          <button onClick={() => refetch()} className="mt-2 text-xs text-accent-blue hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Campaigns</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">{totalCount}</span>
          </div>
          <p className="text-text-secondary mt-1 text-sm">Create and manage notification campaigns</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
        >
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      {/* Search + Filter Chips */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search campaigns…"
            className="pl-9 pr-8 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active w-64"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-text-muted hover:text-text-primary" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {FILTER_CHIPS.map((chip) => {
            const active = statusFilter === chip.value;
            const cfg = chip.value ? getStatusConfig(chip.value) : null;
            return (
              <button
                key={chip.label}
                onClick={() => handleFilterChange(chip.value)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  active
                    ? chip.value ? `${cfg!.className} border-current` : 'bg-accent-blue text-white border-accent-blue'
                    : 'border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-12 text-center">
          <p className="text-text-muted text-sm">
            {debouncedSearch || statusFilter ? 'No campaigns match your filters' : 'No campaigns yet'}
          </p>
          {debouncedSearch || statusFilter ? (
            <button onClick={() => { setSearchTerm(''); handleFilterChange(null); }} className="mt-2 text-xs text-accent-blue hover:underline">Clear filters</button>
          ) : (
            <Link href="/campaigns/new" className="mt-2 inline-block text-xs text-accent-blue hover:underline">Create your first campaign</Link>
          )}
        </div>
      ) : (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Category</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-muted w-36">Progress</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-text-muted">Targets</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-text-muted">Delivered</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-text-muted">Failed</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">Created</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((c) => (
                <CampaignRow key={c.id} campaign={c} />
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                  className="bg-bg-input border border-border-secondary rounded px-2 py-1 text-xs text-text-primary"
                >
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPage(page - 1)} disabled={page === 0} className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1} className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignRow({ campaign: c }: { campaign: Campaign }) {
  const statusCfg = getStatusConfig(c.status);
  const catCfg = getCategoryConfig(c.category);
  const showProgress = c.status === 'RUNNING' || c.status === 'COMPLETED' || c.status === 'CANCELLED';

  return (
    <tr className="border-b border-border-primary last:border-0 hover:bg-bg-hover/50 transition-colors">
      <td className="py-3 px-4">
        <Link href={`/campaigns/${c.id}`} className="text-sm font-medium hover:text-accent-blue transition-colors">{c.name}</Link>
        {c.description && <p className="text-xs text-text-muted truncate max-w-xs">{c.description}</p>}
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-0.5 rounded-full ${catCfg.className}`}>{catCfg.label}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.className}`}>{statusCfg.label}</span>
      </td>
      <td className="py-3 px-4">
        {showProgress ? (
          <div className="w-28"><CampaignProgressBar campaign={c} /></div>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right text-sm">{c.targetCount.toLocaleString()}</td>
      <td className="py-3 px-4 text-right text-sm">
        <span className={c.deliveredCount > 0 ? 'text-status-success' : ''}>{c.deliveredCount.toLocaleString()}</span>
      </td>
      <td className="py-3 px-4 text-right text-sm">
        <span className={c.failedCount > 0 ? 'text-status-error' : ''}>{c.failedCount.toLocaleString()}</span>
      </td>
      <td className="py-3 px-4 text-xs text-text-muted" title={c.createdAt}>{formatRelativeTime(c.createdAt)}</td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/campaigns/${c.id}`} className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Eye size={14} /></Link>
          <Link href={`/campaigns/new?clone=${c.id}`} className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Copy size={14} /></Link>
        </div>
      </td>
    </tr>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
      </div>
    }>
      <CampaignsContent />
    </Suspense>
  );
}
