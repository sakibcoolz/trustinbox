'use client';

import { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useServiceProviders } from '@/hooks/useServiceProviders';
import { useBlockedProviders } from '@/hooks/useBlockedProviders';
import { useDetailParam } from '@/hooks/useDetailParam';
import { EmptyState } from '@/components/ui/EmptyState';
import { Building2 } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

function TrustBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-status-success bg-status-success/10' : score >= 50 ? 'text-accent-orange bg-accent-orange/10' : 'text-accent-red bg-accent-red/10';
  return <span className={`chip text-2xs ${color}`}>{score}% Trust</span>;
}

export default function ServiceProvidersPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-sm text-text-muted">Loading…</p></div>}>
      <ServiceProvidersContent />
    </Suspense>
  );
}

function ServiceProvidersContent() {
  const [search, setSearch] = useState('');
  const { selectedId, setSelectedId, clearSelectedId } = useDetailParam();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'history'>('profile');
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const { providers, loading, error, block, unblock } = useServiceProviders({ search: search || undefined });
  const { blockedProviders } = useBlockedProviders();

  const blockedIds = useMemo(() => new Set(
    (blockedProviders ?? []).map((b: any) => b.serviceProvider?.id).filter(Boolean)
  ), [blockedProviders]);

  const filtered = useMemo(() => providers, [providers]);
  const selected = providers.find((p: any) => p.id === selectedId);
  const isSelectedBlocked = selected ? blockedIds.has(selected.id) : false;

  // Auto-open mobile detail when deep-linked
  useEffect(() => {
    if (selectedId) setMobileShowDetail(true);
  }, [selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
    setDetailTab('profile');
  }, []);

  const handleToggleBlock = useCallback(async (id: string, isCurrentlyBlocked: boolean) => {
    setBlockingId(id);
    try {
      if (isCurrentlyBlocked) {
        await unblock(id);
      } else {
        await block(id);
      }
    } catch {
      // Error handled by Apollo
    } finally {
      setBlockingId(null);
    }
  }, [block, unblock]);

  if (loading) {
    return (
      <>
        <div className="flex w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0">
          <div className="px-4 pt-4 pb-2 space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">Service Providers</h2>
          </div>
          <div className="flex-1 px-4 space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-xl bg-bg-tertiary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-bg-tertiary rounded" />
                  <div className="h-3 w-20 bg-bg-tertiary rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden sm:flex flex-1 items-center justify-center bg-bg-primary">
          <p className="text-sm text-text-muted">Loading providers…</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-3">
          <p className="text-sm text-accent-red">Failed to load service providers</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* List */}
      <div className={`${mobileShowDetail ? 'hidden sm:flex' : 'flex'} w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0`}>
        <div className="px-4 pt-4 pb-2 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Service Providers</h2>
          <div className="relative">
            <svg className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search providers…" className="input-field w-full pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No service provider connections"
              description="Browse the directory to discover verified service providers and control how they contact you."
              action={search ? { label: 'Clear search', onClick: () => setSearch('') } : undefined}
            />
          ) : (
            filtered.map((sp: any) => (
              <button key={sp.id} onClick={() => handleSelect(sp.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border-primary hover:bg-bg-hover transition-colors ${selectedId === sp.id ? 'bg-bg-active border-l-2 border-l-accent-blue' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-sm font-bold text-accent-blue shrink-0">
                  {(sp.name ?? '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">{sp.name ?? 'Unknown'}</span>
                    {sp.verificationStatus === 'VERIFIED' && (
                      <svg className="w-3.5 h-3.5 text-accent-blue shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xs text-text-muted">{sp.industry ?? ''}</span>
                  </div>
                </div>
                {sp.trustScore != null && <TrustBadge score={sp.trustScore} />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={`${mobileShowDetail ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-bg-primary`}>
        <div className="sm:hidden h-[60px] px-4 flex items-center border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
          <button onClick={() => setMobileShowDetail(false)} className="btn-icon mr-2" aria-label="Back">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h3 className="text-sm font-semibold text-text-primary">Provider Details</h3>
        </div>

        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={Building2}
              title="Select a provider"
              description="Choose a service provider to view their details and communication preferences"
              size="lg"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-xl font-bold text-accent-blue shrink-0">
                {(selected.name ?? '?').charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text-primary">{selected.name ?? 'Unknown'}</h2>
                  {selected.verificationStatus === 'VERIFIED' && (
                    <svg className="w-5 h-5 text-accent-blue" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                  )}
                </div>
                <p className="text-sm text-text-muted">{selected.industry ?? ''}</p>
              </div>
              {selected.trustScore != null && <TrustBadge score={selected.trustScore} />}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border-primary">
              <button onClick={() => setDetailTab('profile')} className={detailTab === 'profile' ? 'tab-active' : 'tab'}>Profile</button>
              <button onClick={() => setDetailTab('history')} className={detailTab === 'history' ? 'tab-active' : 'tab'}>History</button>
            </div>

            {detailTab === 'profile' && (
              <div className="space-y-4">
                <div className="card space-y-3">
                  <div>
                    <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Description</p>
                    <p className="text-sm text-text-secondary mt-1">{selected.description ?? '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Industry</p>
                      <p className="text-sm text-text-primary mt-1">{selected.industry ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Verification</p>
                      <p className="mt-1"><span className={`chip text-2xs ${selected.verificationStatus === 'VERIFIED' ? 'chip-green' : 'chip-orange'}`}>{selected.verificationStatus ?? 'UNKNOWN'}</span></p>
                    </div>
                    {selected.trustScore != null && (
                    <div>
                      <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Trust Score</p>
                      <p className="text-sm text-text-primary mt-1 font-semibold">{selected.trustScore}%</p>
                    </div>
                    )}
                    {selected.website && (
                      <div>
                        <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Website</p>
                        <p className="text-sm text-accent-blue mt-1 truncate">{selected.website}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Policy summary */}
                <div className="card">
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-3">Communication Policy</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-bg-tertiary">
                      <p className="text-lg font-bold text-accent-blue">✓</p>
                      <p className="text-2xs text-text-muted mt-1">Notifications</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-bg-tertiary">
                      <p className="text-lg font-bold text-accent-blue">✓</p>
                      <p className="text-2xs text-text-muted mt-1">Callbacks</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-bg-tertiary">
                      <p className="text-lg font-bold text-accent-blue">✓</p>
                      <p className="text-2xs text-text-muted mt-1">Documents</p>
                    </div>
                  </div>
                </div>

                {/* Block/Unblock */}
                <button
                  onClick={() => handleToggleBlock(selected.id, isSelectedBlocked)}
                  disabled={blockingId === selected.id}
                  className={isSelectedBlocked ? 'w-full btn-secondary' : 'w-full btn-danger'}
                >
                  {blockingId === selected.id ? (
                    <>Processing…</>
                  ) : isSelectedBlocked ? (
                    <>
                      <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Unblock Provider
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      Block Provider
                    </>
                  )}
                </button>
              </div>
            )}

            {detailTab === 'history' && (
              <div className="card">
                <p className="text-sm font-medium text-text-primary mb-4">Relationship History</p>
                {/* History not yet available in GraphQL schema */}
                <p className="text-sm text-text-muted text-center py-4">No interaction history available yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
