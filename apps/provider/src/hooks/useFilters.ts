'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type FilterValue = string | string[] | boolean | [Date, Date] | undefined;

interface UseFiltersOptions {
  syncUrl?: boolean;
  defaults?: Record<string, FilterValue>;
}

export function useFilters({ syncUrl = false, defaults = {} }: UseFiltersOptions = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL if syncing
  function getInitial(): Record<string, FilterValue> {
    if (!syncUrl) return { ...defaults };
    const initial: Record<string, FilterValue> = { ...defaults };
    searchParams.forEach((value, key) => {
      if (value.includes(',')) {
        initial[key] = value.split(',');
      } else if (value === 'true') {
        initial[key] = true;
      } else if (value === 'false') {
        initial[key] = false;
      } else {
        initial[key] = value;
      }
    });
    return initial;
  }

  const [filters, setFilters] = useState<Record<string, FilterValue>>(getInitial);

  const updateUrl = useCallback(
    (next: Record<string, FilterValue>) => {
      if (!syncUrl) return;
      const params = new URLSearchParams();
      Object.entries(next).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '' || value === false) return;
        if (Array.isArray(value) && value.length === 0) return;
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else if (typeof value === 'boolean') {
          params.set(key, String(value));
        } else {
          params.set(key, String(value));
        }
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [syncUrl, pathname, router],
  );

  const setFilter = useCallback(
    (key: string, value: FilterValue) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        updateUrl(next);
        return next;
      });
    },
    [updateUrl],
  );

  const clearAll = useCallback(() => {
    const cleared = { ...defaults };
    setFilters(cleared);
    updateUrl(cleared);
  }, [defaults, updateUrl]);

  return { filters, setFilter, clearAll };
}
