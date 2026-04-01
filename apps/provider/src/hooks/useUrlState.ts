'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * Syncs a record of string params to URL search params.
 * - Default values are omitted from the URL (clean URLs)
 * - Uses router.replace for filter changes (no history pollution)
 * - Reads initial state from URL on mount, falls back to defaults
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T,
): [T, (updates: Partial<T>) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const val = searchParams.get(key);
      if (val !== null) {
        (result as Record<string, string>)[key] = val;
      }
    }
    return result;
  }, [searchParams, defaults]);

  const setState = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === (defaults as Record<string, string>)[key]) {
          params.delete(key);
        } else {
          params.set(key, value as string);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname, defaults],
  );

  return [state, setState];
}
