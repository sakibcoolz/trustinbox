'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useBlockedProviders } from '@/hooks/useBlockedProviders';

export default function BlockedOrganizationsPage() {
  const { blockedProviders, loading, error, unblock } = useBlockedProviders();
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const handleUnblock = useCallback(async (id: string) => {
    setUnblocking(id);
    try {
      await unblock(id);
    } catch {
      // Error handled by Apollo
    } finally {
      setUnblocking(null);
    }
  }, [unblock]);

  if (loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Blocked Organizations</h1>
              <p className="text-2xs text-text-muted">Organizations you&apos;ve blocked from contacting you.</p>
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card flex items-center gap-4 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-bg-tertiary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 bg-bg-tertiary rounded" />
                  <div className="h-3 w-56 bg-bg-tertiary rounded" />
                </div>
                <div className="h-8 w-20 bg-bg-tertiary rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-3">
          <p className="text-sm text-accent-red">Failed to load blocked organizations</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Blocked Organizations</h1>
            <p className="text-2xs text-text-muted">Organizations you&apos;ve blocked from contacting you.</p>
          </div>
        </div>

        {blockedProviders.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-status-success/10 flex items-center justify-center text-2xl mb-3">✅</div>
            <p className="text-sm text-text-secondary">No blocked organizations</p>
            <p className="text-2xs text-text-muted mt-1">You haven&apos;t blocked any service providers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">{blockedProviders.length} blocked organization{blockedProviders.length !== 1 ? 's' : ''}</p>
            {blockedProviders.map((org: { id: string; name?: string; industry?: string; blockedAt?: string; reason?: string }) => (
              <div key={org.id} className="card flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent-red/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{org.name ?? 'Unknown Provider'}</p>
                  <p className="text-2xs text-text-muted mt-0.5">
                    {org.industry ?? '—'}{org.blockedAt ? ` · Blocked ${new Date(org.blockedAt).toLocaleDateString()}` : ''}{org.reason ? ` · ${org.reason}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleUnblock(org.id)}
                  disabled={unblocking === org.id}
                  className="btn-secondary text-sm shrink-0"
                >
                  {unblocking === org.id ? 'Unblocking…' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
