'use client';

import { useState, useCallback } from 'react';

/**
 * Generic mutation helper that replaces Apollo's useMutation.
 * Returns { run, loading, error } where run() is a fetch-based mutation executor.
 */
export function useMutationHelper<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const run = useCallback(async (url: string, method: string, body?: unknown): Promise<T> => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.message || `Request failed ${res.status}`);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : ({} as T);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error };
}
