'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Bell, Plus, Search, Download } from 'lucide-react';
import Link from 'next/link';
import { DataTable, type Column, type SortState, type PaginationState } from '@/components/ui/Table';
import { FilterChipBar } from '@/components/ui/FilterChipBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { NotificationDetailPanel } from '@/components/notifications/NotificationDetailPanel';
import {
  useNotifications,
  useNotificationStats,
  useNotificationLiveUpdates,
  type NotificationNode,
  type NotificationListOptions,
  getNotificationStatusVariant,
  getCategoryVariant,
  getCategoryLabel,
} from '@/lib/graphql/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { formatRelativeTime, formatNumber, formatPercent } from '@/lib/format';
import { buildCsvString, downloadCsv, sanitizeCsvField } from '@/lib/utils/csv-export';

// ─── Filter Definitions ─────────────────────────────────

const STATUS_FILTERS = [
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'RATE_LIMITED', label: 'Rate Limited' },
];

const CATEGORY_FILTERS = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'SERVICE_PROVIDER', label: 'Organizational' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
];

const CHANNEL_FILTERS = [
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
  { value: 'IN_APP', label: 'In-App' },
];

const FILTER_CHIPS = [
  { key: 'status', label: 'Status', type: 'multi-select' as const, options: STATUS_FILTERS },
  { key: 'category', label: 'Category', type: 'multi-select' as const, options: CATEGORY_FILTERS },
  { key: 'channel', label: 'Channel', type: 'multi-select' as const, options: CHANNEL_FILTERS },
];

// ─── Page Component ─────────────────────────────────────

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsContent />
    </Suspense>
  );
}

function NotificationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { activeServiceProvider } = useAuth();
  const canExport = usePermission('analytics:export');
  const spId = activeServiceProvider?.id ?? '';

  // ── URL state ──
  const search = searchParams.get('search') ?? '';
  const statuses = searchParams.get('status')?.split(',').filter(Boolean) ?? [];
  const categories = searchParams.get('category')?.split(',').filter(Boolean) ?? [];
  const channels = searchParams.get('channel')?.split(',').filter(Boolean) ?? [];
  const limit = parseInt(searchParams.get('limit') ?? '25', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const [searchInput, setSearchInput] = useState(search);

  // ── URL update ──
  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === '') params.delete(key);
        else params.set(key, val);
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // ── GraphQL ──
  const queryOptions: NotificationListOptions = {
    search: search || undefined,
    status: statuses.length > 0 ? statuses : undefined,
    category: categories.length > 0 ? categories : undefined,
    channel: channels.length > 0 ? channels : undefined,
    limit,
    offset,
  };

  const { data, loading } = useNotifications(queryOptions);
  const statsRange = useMemo(() => ({
    from: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    to: new Date().toISOString(),
  }), []);
  const { data: statsData } = useNotificationStats(spId, statsRange);

  // Live updates (5.15)
  useNotificationLiveUpdates(spId);

  const notifications = data?.notifications?.nodes ?? [];
  const totalCount = data?.notifications?.totalCount ?? 0;
  const stats = statsData?.notificationAnalytics;

  // ── Current page (offset-based) ──
  const currentPage = Math.floor(offset / limit) + 1;
  const pagination: PaginationState = { page: currentPage, pageSize: limit, total: totalCount };

  function handlePageChange(page: number) {
    updateUrl({ offset: String((page - 1) * limit) });
  }
  function handlePageSizeChange(size: number) {
    updateUrl({ limit: String(size), offset: '0' });
  }

  // ── Filters ──
  const activeFilters: Record<string, string | string[]> = {};
  if (statuses.length > 0) activeFilters.status = statuses;
  if (categories.length > 0) activeFilters.category = categories;
  if (channels.length > 0) activeFilters.channel = channels;

  function handleFilterChange(key: string, value: unknown) {
    if (Array.isArray(value) && value.length === 0) {
      updateUrl({ [key]: undefined, offset: '0' });
    } else if (Array.isArray(value)) {
      updateUrl({ [key]: value.join(','), offset: '0' });
    } else {
      updateUrl({ [key]: value as string, offset: '0' });
    }
  }

  function handleClearFilters() {
    updateUrl({ status: undefined, category: undefined, channel: undefined, offset: '0' });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ search: searchInput || undefined, offset: '0' });
  }

  // ── CSV Export (5.6) ──
  function handleExport() {
    const headers = ['ID', 'Recipient', 'Subject', 'Category', 'Channel', 'Status', 'Priority', 'Sent At', 'Delivered At'];
    const rows = notifications.map((n) => [
      n.id,
      n.recipientVirtualId,
      n.title,
      getCategoryLabel(n.category),
      n.channel,
      n.status,
      n.priority,
      n.createdAt,
      n.deliveredAt ?? '',
    ]);
    const csv = buildCsvString(headers, rows);
    const date = new Date().toISOString().split('T')[0];
    downloadCsv(csv, `notifications_export_${date}.csv`);
  }

  // ── Table Columns ──
  const columns: Column<NotificationNode>[] = useMemo(
    () => [
      {
        key: 'recipientVirtualId',
        header: 'Recipient',
        render: (_, row) => (
          <Link href={`/customers/${row.recipientVirtualId}`} className="font-mono text-xs text-accent-blue hover:underline">
            {row.recipientVirtualId}
          </Link>
        ),
      },
      {
        key: 'title',
        header: 'Subject',
        render: (_, row) => (
          <span className="text-sm font-medium text-text-primary truncate block max-w-[200px]" title={row.title}>
            {row.title}
          </span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (_, row) => (
          <Badge variant={getCategoryVariant(row.category)} size="sm">
            {getCategoryLabel(row.category)}
          </Badge>
        ),
      },
      {
        key: 'channel',
        header: 'Channel',
        render: (_, row) => <span className="text-sm text-text-secondary">{row.channel}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (_, row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'createdAt',
        header: 'Sent',
        render: (_, row) => (
          <span className="text-sm text-text-muted" title={row.createdAt}>
            {formatRelativeTime(row.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-text-secondary mt-1">Send and track notifications to your customers</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && totalCount > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <Download size={15} /> Export CSV
            </button>
          )}
          <Link
            href="/notifications/compose"
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
          >
            <Plus size={16} /> Compose
          </Link>
        </div>
      </div>

      {/* Stats Cards (5.2) */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Sent" value={stats ? formatNumber(stats.totalSent) : '—'} sub="Last 30 days" />
        <StatCard label="Delivery Rate" value={stats ? formatPercent(stats.deliveryRate) : '—'} sub="Successful deliveries" />
        <StatCard label="Failed" value={stats ? formatNumber(stats.totalRejected) : '—'} sub="Delivery failures" />
        <StatCard label="Read Rate" value={stats ? formatPercent(stats.readRate) : '—'} sub="Opened notifications" />
      </div>

      {/* Search + Filters (5.3) */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search notifications…"
          />
        </form>

        <FilterChipBar
          filters={FILTER_CHIPS}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Table (5.1 + 5.4) */}
      <DataTable<NotificationNode>
        columns={columns}
        data={notifications}
        keyExtractor={(row) => row.id}
        loading={loading}
        expandable
        renderExpanded={(row) => <NotificationDetailPanel notificationId={row.id} />}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        emptyState={
          <EmptyState
            icon={Bell}
            title="No notifications found"
            description={search || statuses.length || categories.length
              ? 'Try adjusting your search or filters'
              : 'Notifications will appear here once sent'}
          />
        }
      />
    </div>
  );
}

// ─── Stats Card ─────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-text-muted mt-1">{sub}</p>
    </div>
  );
}

// ─── Loading State ──────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
