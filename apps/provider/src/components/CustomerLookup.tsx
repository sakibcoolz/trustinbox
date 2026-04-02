'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, ExternalLink, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useData } from '@/lib/hooks/useData';
import type { CustomerRow, CustomerConnection } from '@/lib/graphql/customers';

interface CustomerLookupProps {
  mode?: 'single' | 'multi';
  selected?: string[];
  onSelect?: (virtualId: string) => void;
  onDeselect?: (virtualId: string) => void;
  onSelectionChange?: (virtualIds: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
}

export default function CustomerLookup({
  mode = 'single',
  selected = [],
  onSelect,
  onDeselect,
  onSelectionChange,
  placeholder = 'Search by Virtual ID or name…',
  maxSelections = 50,
  disabled,
}: CustomerLookupProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Search via API route (min 2 chars)
  const shouldSearch = debouncedQuery.length >= 2;
  const { data, loading } = useData<CustomerConnection>(
    shouldSearch ? `/api/gateway/v1/customers?search=${encodeURIComponent(debouncedQuery)}&first=10` : null,
    { skip: !shouldSearch },
  );

  const results: CustomerRow[] = data?.nodes ?? [];
  const selectedSet = new Set(selected);

  const handleSelect = useCallback(
    (virtualId: string) => {
      if (mode === 'single') {
        onSelect?.(virtualId);
        onSelectionChange?.([virtualId]);
        setQuery('');
        setIsOpen(false);
      } else {
        if (selectedSet.has(virtualId)) {
          onDeselect?.(virtualId);
          const next = selected.filter((id) => id !== virtualId);
          onSelectionChange?.(next);
        } else if (selected.length < maxSelections) {
          onSelect?.(virtualId);
          const next = [...selected, virtualId];
          onSelectionChange?.(next);
        }
      }
    },
    [mode, selected, selectedSet, maxSelections, onSelect, onDeselect, onSelectionChange],
  );

  const handleRemove = useCallback(
    (virtualId: string) => {
      onDeselect?.(virtualId);
      const next = selected.filter((id) => id !== virtualId);
      onSelectionChange?.(next);
    },
    [selected, onDeselect, onSelectionChange],
  );

  return (
    <div ref={containerRef} className="bg-bg-card border border-border-primary rounded-xl p-4">
      {/* Selected chips (multi-mode) */}
      {mode === 'multi' && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {selected.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded-full text-xs"
            >
              {id}
              <button onClick={() => handleRemove(id)} className="hover:text-accent-blue/60">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active disabled:opacity-50"
          placeholder={placeholder}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && shouldSearch && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {results.length === 0 && !loading && (
            <p className="text-sm text-text-muted text-center py-4">No customers found</p>
          )}
          {results.map((c) => {
            const isSelected = selectedSet.has(c.virtualId);
            return (
              <div
                key={c.virtualId}
                onClick={() => handleSelect(c.virtualId)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors cursor-pointer ${
                  isSelected ? 'bg-accent-blue/5 border border-accent-blue/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                    <User size={14} className="text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.virtualId}</p>
                    <p className="text-xs text-text-muted">{c.displayName}</p>
                  </div>
                </div>
                <Link
                  href={`/customers/${c.virtualId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-bg-active transition-colors"
                >
                  <ExternalLink size={14} className="text-text-muted hover:text-accent-blue" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {isOpen && !shouldSearch && query.length > 0 && (
        <p className="text-xs text-text-muted text-center py-2">Type at least 2 characters to search</p>
      )}
    </div>
  );
}
