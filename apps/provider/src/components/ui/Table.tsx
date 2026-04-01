'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  hidden?: boolean;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyState?: React.ReactNode;
  selectable?: boolean;
  expandable?: boolean;
  renderExpanded?: (row: T) => React.ReactNode;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sortState?: SortState;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  striped?: boolean;
}

// --- Page Sizes ---
const PAGE_SIZES = [10, 25, 50];

// --- Helper: accessor ---
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

// --- Component ---
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyState,
  selectable,
  expandable,
  renderExpanded,
  pagination,
  onPageChange,
  onPageSizeChange,
  sortState,
  onSort,
  onSelectionChange,
  striped,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const visibleColumns = columns.filter((c) => !c.hidden);

  // Persist page size
  useEffect(() => {
    if (pagination) {
      const stored = localStorage.getItem('tablePageSize');
      if (stored && onPageSizeChange) {
        const size = parseInt(stored, 10);
        if (PAGE_SIZES.includes(size) && size !== pagination.pageSize) {
          onPageSizeChange(size);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectAll() {
    if (selected.size === data.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const all = new Set(data.map(keyExtractor));
      setSelected(all);
      onSelectionChange?.(Array.from(all));
    }
  }

  function handleSelectRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  }

  function handleSort(key: string) {
    if (!onSort) return;
    if (sortState?.key === key) {
      onSort(key, sortState.direction === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  }

  function handlePageSizeChange(size: number) {
    localStorage.setItem('tablePageSize', String(size));
    onPageSizeChange?.(size);
  }

  const isAllSelected = data.length > 0 && selected.size === data.length;
  const isIndeterminate = selected.size > 0 && selected.size < data.length;

  return (
    <div className="w-full">
      {/* Bulk selection bar */}
      {selectable && selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-lg mb-2 text-xs text-accent-blue">
          <span className="font-medium">{selected.size} selected</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-primary">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="bg-bg-secondary">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-border-secondary accent-accent-blue"
                  />
                </th>
              )}
              {expandable && <th className="w-10" />}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.sortable && 'cursor-pointer select-none hover:text-text-secondary',
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col">
                        {sortState?.key === col.key ? (
                          sortState.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-30" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.length === 0 && !loading ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)} className="py-12">
                  {emptyState || (
                    <p className="text-center text-sm text-text-muted">No data</p>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const id = keyExtractor(row);
                const isExpanded = expandedRow === id;
                return (
                  <RowGroup key={id}>
                    <tr
                      className={cn(
                        'border-t border-border-primary hover:bg-bg-hover transition-colors',
                        striped && i % 2 === 1 && 'bg-bg-primary',
                        isExpanded && 'bg-bg-hover',
                      )}
                    >
                      {selectable && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(id)}
                            onChange={() => handleSelectRow(id)}
                            className="w-3.5 h-3.5 rounded border-border-secondary accent-accent-blue"
                          />
                        </td>
                      )}
                      {expandable && (
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : id)}
                            className="p-0.5 rounded hover:bg-bg-active transition-colors"
                          >
                            <ChevronRight
                              size={14}
                              className={cn('text-text-muted transition-transform', isExpanded && 'rotate-90')}
                            />
                          </button>
                        </td>
                      )}
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-4 py-3 text-text-secondary',
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right',
                          )}
                        >
                          {col.render
                            ? col.render(getNestedValue(row, col.key), row)
                            : String(getNestedValue(row, col.key) ?? '')}
                        </td>
                      ))}
                    </tr>
                    {expandable && isExpanded && renderExpanded && (
                      <tr className="border-t border-border-primary bg-bg-secondary/50">
                        <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + 1} className="px-4 py-4">
                          {renderExpanded(row)}
                        </td>
                      </tr>
                    )}
                  </RowGroup>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

// --- RowGroup (fragment wrapper) ---
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// --- Pagination ---
function TablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  pagination: PaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs text-text-muted">
      <div className="flex items-center gap-2">
        <span>Showing {start}–{end} of {total}</span>
        <span className="text-border-secondary">|</span>
        <span>Rows:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="bg-bg-input border border-border-primary rounded px-1.5 py-0.5 text-xs text-text-secondary"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange?.(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {generatePageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange?.(p as number)}
              className={cn(
                'w-7 h-7 rounded text-xs transition-colors',
                page === p
                  ? 'bg-accent-blue text-white font-medium'
                  : 'text-text-secondary hover:bg-bg-hover',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// --- Page number generation ---
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}
