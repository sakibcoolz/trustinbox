'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDataOptions {
  skip?: boolean;
  /** Re-fetch when these values change */
  deps?: unknown[];
}

interface UseDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

/**
 * Generic data-fetching hook that replaces Apollo useQuery.
 * Calls a Next.js API route and returns { data, loading, error, refetch }.
 *
 * Uses a generation counter instead of AbortController so React StrictMode
 * double-mount does not produce ERR_ABORTED in the network tab.
 */
export function useData<T = unknown>(
  url: string | null,
  options?: UseDataOptions,
): UseDataResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<Error | undefined>(undefined);
  const genRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const deps = options?.deps ?? [];

  useEffect(() => {
    if (!url || options?.skip) {
      setLoading(false);
      return;
    }

    const gen = ++genRef.current;

    const doFetch = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const res = await fetch(url);
        if (gen !== genRef.current) return;

        if (res.status === 401) {
          const hasAuth = document.cookie.includes('auth-status=1');
          if (!hasAuth) {
            window.location.href = '/auth/login';
            return;
          }
        }
        if (res.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(body.error || body.message || `Request failed ${res.status}`);
        }
        const json = await res.json();
        if (gen !== genRef.current) return;
        setData(json as T);
      } catch (e: unknown) {
        if (gen !== genRef.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (gen === genRef.current) setLoading(false);
      }
    };

    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, options?.skip, refreshKey, ...deps]);

  const refetch = useCallback(async () => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { data, loading, error, refetch };
}
