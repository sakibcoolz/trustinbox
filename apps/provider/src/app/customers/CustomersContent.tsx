'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, Users } from 'lucide-react';
import Link from 'next/link';
import { DataTable, type Column, type SortState, type PaginationState } from '@/components/ui/Table';
import { FilterChipBar } from '@/components/ui/FilterChipBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/EmptyState';
import { BulkActionsToolbar } from '@/components/customers/BulkActionsToolbar';
import { useCustomers, type CustomerRow } from '@/lib/graphql/customers';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeTime } from '@/lib/format';

// ─── Filter Definitions ─────────────────────────────────

const CATEGORY_FILTERS = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'SERVICE_PROVIDER', label: 'Organizational' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
];

const STATUS_FILTERS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'DND', label: 'DND' },
  { value: 'OPTED_OUT', label: 'Opted Out' },
];

const FILTER_CHIPS = [
  { key: 'category', label: 'Category', type: 'multi-select' as const, options: CATEGORY_FILTERS },
  { key: 'status', label: 'Status', type: 'multi-select' as const, options: STATUS_FILTERS },
];

// ─── Helpers ────────────────────────────────────────────

function getCategoryVariant(cat: string) {
  const map: Record<string, 'info' | 'purple' | 'warning' | 'neutral'> = {
    PERSONAL: 'info',
    SERVICE_PROVIDER: 'purple',
    ADVERTISEMENT: 'warning',
  };
  return map[cat] ?? 'neutral';
}

function getCategoryLabel(cat: string) {
  const map: Record<string, string> = {
    PERSONAL: 'Personal',
    SERVICE_PROVIDER: 'Organizational',
    ADVERTISEMENT: 'Advertisement',
  };
  return map[cat] ?? cat;
}

// ─── Component ──────────────────────────────────────────

export function CustomersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { activeServiceProvider } = useAuth();

  // ── URL state ──
  const search = searchParams.get('search') ?? '';
  const categories = searchParams.get('category')?.split(',').filter(Boolean) ?? [];
  const statuses = searchParams.get('status')?.split(',').filter(Boolean) ?? [];
  const sortField = searchParams.get('sort') ?? 'lastContactAt';
  const sortDir = (searchParams.get('dir') as 'asc' | 'desc') ?? 'desc';
  const limit = parseInt(searchParams.get('limit') ?? '25', 10);
  const cursor = searchParams.get('cursor') ?? undefined;

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── URL update helper ──
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

  // ── GraphQL Query ──
  const { data, loading } = useCustomers({
    search: search || undefined,
    category: categories.length > 0 ? categories : undefined,
    status: statuses.length > 0 ? statuses : undefined,
    sort: { field: sortField, direction: sortDir },
    first: limit,
    after: cursor,
  });

  const customers = data?.conversations?.nodes ?? [];
  const totalCount = data?.conversations?.totalCount ?? 0;
  const pageInfo = data?.conversations?.pageInfo;

  // ── Sort ──
  const sortState: SortState = { key: sortField, direction: sortDir };

  function handleSort(key: string, direction: 'asc' | 'desc') {
    updateUrl({ sort: key, dir: direction, cursor: undefined });
  }

  // ── Pagination ──
  const currentPage = cursor ? 2 : 1; // simplified
  const pagination: PaginationState = {
    page: currentPage,
    pageSize: limit,
    total: totalCount,
  };

  function handlePageChange(page: number) {
    if (page > currentPage && pageInfo?.endCursor) {
      updateUrl({ cursor: pageInfo.endCursor });
    } else {
      updateUrl({ cursor: undefined });
    }
  }

  function handlePageSizeChange(size: number) {
    updateUrl({ limit: String(size), cursor: undefined });
  }

  // ── Filters ──
  const activeFilters: Record<string, string | string[]> = {};
  if (categories.length > 0) activeFilters.category = categories;
  if (statuses.length > 0) activeFilters.status = statuses;

  function handleFilterChange(key: string, value: unknown) {
    if (Array.isArray(value) && value.length === 0) {
      updateUrl({ [key]: undefined, cursor: undefined });
    } else if (Array.isArray(value)) {
      updateUrl({ [key]: value.join(','), cursor: undefined });
    } else {
      updateUrl({ [key]: value as string, cursor: undefined });
    }
    setSelectedIds(new Set());
  }

  function handleClearFilters() {
    updateUrl({ category: undefined, status: undefined, cursor: undefined });
    setSelectedIds(new Set());
  }

  // ── Search ──
  const [searchInput, setSearchInput] = useState(search);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ search: searchInput || undefined, cursor: undefined });
    setSelectedIds(new Set());
  }

  // ── Selection ──
  function handleSelectionChange(ids: string[]) {
    setSelectedIds(new Set(ids));
  }

  // ── Table Columns ──
  const columns: Column<CustomerRow>[] = useMemo(
    () => [
      {
        key: 'virtualId',
        header: 'Virtual ID',
        sortable: true,
        render: (_, row) => (
          <Link
            href={`/customers/${row.virtualId}`}
            className="font-mono text-xs text-accent-blue hover:underline"
          >
            {row.virtualId}
          </Link>
        ),
      },
      {
        key: 'displayName',
        header: 'Name',
        sortable: true,
        render: (_, row) => <span className="text-sm font-medium text-text-primary">{row.displayName}</span>,
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
        key: 'lastContactAt',
        header: 'Last Contact',
        sortable: true,
        render: (_, row) => (
          <span className="text-sm text-text-muted" title={row.lastContactAt}>
            {row.lastContactAt ? formatRelativeTime(row.lastContactAt) : '—'}
          </span>
        ),
      },
      {
        key: 'interactionCount',
        header: 'Interactions',
        sortable: true,
        align: 'right' as const,
        render: (_, row) => <span className="text-sm tabular-nums">{row.interactionCount}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (_, row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-text-secondary mt-1">
            Manage your customer relationships and communication preferences
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search by virtual ID or name…"
          />
        </form>

        <FilterChipBar
          filters={FILTER_CHIPS}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Table */}
      <DataTable<CustomerRow>
        columns={columns}
        data={customers}
        keyExtractor={(row) => row.virtualId}
        loading={loading}
        selectable
        sortState={sortState}
        onSort={handleSort}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSelectionChange={handleSelectionChange}
        emptyState={
          <EmptyState
            icon={Users}
            title="No customers found"
            description={search || categories.length || statuses.length
              ? 'Try adjusting your search or filters'
              : 'Customers will appear here once conversations are established'}
          />
        }
      />

      {/* Bulk Actions */}
      <BulkActionsToolbar
        selectedIds={selectedIds}
        onDeselectAll={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
