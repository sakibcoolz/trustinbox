'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
interface FilterChip {
  key: string;
  label: string;
  type: 'select' | 'multi-select' | 'date-range' | 'search' | 'toggle';
  options?: { value: string; label: string }[];
}

interface FilterChipBarProps {
  filters: FilterChip[];
  activeFilters: Record<string, string | string[] | boolean | [Date, Date]>;
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
}

// --- Component ---
export function FilterChipBar({ filters, activeFilters, onFilterChange, onClearAll }: FilterChipBarProps) {
  const hasActive = Object.values(activeFilters).some(
    (v) => v !== undefined && v !== null && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0),
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {filters.map((filter) => (
        <FilterChipItem
          key={filter.key}
          filter={filter}
          value={activeFilters[filter.key]}
          onChange={(value) => onFilterChange(filter.key, value)}
        />
      ))}
      {hasActive && (
        <button
          onClick={onClearAll}
          className="px-3 py-1 text-xs text-text-muted hover:text-text-primary transition-colors whitespace-nowrap"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// --- Individual Chip ---
function FilterChipItem({
  filter,
  value,
  onChange,
}: {
  filter: FilterChip;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = value !== undefined && value !== null && value !== '' && value !== false && !(Array.isArray(value) && value.length === 0);

  // Toggle
  if (filter.type === 'toggle') {
    return (
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
          isActive
            ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
            : 'bg-bg-hover border-border-primary text-text-secondary hover:text-text-primary',
        )}
      >
        {filter.label}
      </button>
    );
  }

  // Search
  if (filter.type === 'search') {
    return (
      <div className="relative" ref={ref}>
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border whitespace-nowrap transition-colors',
            isActive
              ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
              : 'bg-bg-hover border-border-primary text-text-secondary',
          )}
        >
          <SearchIcon size={12} />
          <input
            type="text"
            placeholder={filter.label}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="bg-transparent outline-none text-xs w-24 placeholder:text-text-muted"
          />
          {isActive && (
            <button onClick={() => onChange(undefined)} className="hover:text-text-primary">
              <X size={10} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Select / Multi-select dropdown
  const selectedLabel = filter.type === 'select'
    ? filter.options?.find((o) => o.value === value)?.label
    : filter.type === 'multi-select' && Array.isArray(value) && value.length > 0
      ? `${value.length} selected`
      : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
          isActive
            ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
            : 'bg-bg-hover border-border-primary text-text-secondary hover:text-text-primary',
        )}
      >
        {filter.label}
        {selectedLabel && <span className="font-normal">: {selectedLabel}</span>}
        {isActive ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(filter.type === 'multi-select' ? [] : undefined);
            }}
          >
            <X size={10} />
          </button>
        ) : (
          <ChevronDown size={10} />
        )}
      </button>

      {open && filter.options && (
        <div className="absolute top-full mt-1 left-0 min-w-[160px] bg-bg-elevated border border-border-primary rounded-lg shadow-xl py-1 z-50">
          {filter.options.map((option) => {
            const isSelected = filter.type === 'multi-select'
              ? Array.isArray(value) && value.includes(option.value)
              : value === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  if (filter.type === 'multi-select') {
                    const current = Array.isArray(value) ? value : [];
                    const next = isSelected
                      ? current.filter((v: string) => v !== option.value)
                      : [...current, option.value];
                    onChange(next.length > 0 ? next : undefined);
                  } else {
                    onChange(isSelected ? undefined : option.value);
                    setOpen(false);
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
                  isSelected ? 'text-accent-blue bg-accent-blue/5' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                )}
              >
                {filter.type === 'multi-select' && (
                  <span className={cn(
                    'w-3 h-3 rounded border flex items-center justify-center shrink-0',
                    isSelected ? 'bg-accent-blue border-accent-blue' : 'border-border-secondary',
                  )}>
                    {isSelected && <span className="text-white text-[8px]">✓</span>}
                  </span>
                )}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
