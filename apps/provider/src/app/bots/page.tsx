'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Search, X, Bot as BotIcon } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { formatRelativeTime } from '@/lib/format';
import { useData } from '@/lib/hooks/useData';
import { useUpdateBot } from '@/lib/mutations/bots';
import { useToast } from '@/components/Toast';
import { type Bot, type BotStatus, getStatusConfig } from '@/lib/types';

const STATUS_CHIPS: { label: string; value: BotStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

function BotStatusToggle({ bot, onUpdated }: { bot: Bot; onUpdated?: () => void }) {
  const canDeploy = usePermission('bots:deploy');
  const { execute: update, loading } = useUpdateBot();
  const { success, error: toastError } = useToast();

  if (!canDeploy) return null;
  const isActive = bot.status === 'ACTIVE';
  const isPaused = bot.status === 'PAUSED';
  if (!isActive && !isPaused) return null;

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newStatus: BotStatus = isActive ? 'PAUSED' : 'ACTIVE';
    try {
      await update(bot.id, { status: newStatus });
      success(newStatus === 'ACTIVE' ? 'Bot activated' : 'Bot paused');
      onUpdated?.();
    } catch {
      toastError('Failed to update bot status');
    }
  }

  return (
    <button onClick={handleToggle} disabled={loading}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-status-success' : 'bg-border-secondary'} ${loading ? 'opacity-50' : ''}`}
      title={isActive ? 'Deactivate' : 'Activate'}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function BotsContent() {
  const canCreate = usePermission('bots:create');

  const [statusFilter, setStatusFilter] = useState<BotStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const url = `/api/bots${statusFilter ? `?status=${statusFilter}` : ''}`;
  const { data, loading, error, refetch } = useData<{ nodes?: Bot[] }>(url, { deps: [statusFilter] });
  const bots = data?.nodes ?? [];

  const filteredBots = useMemo(() => {
    if (!debouncedSearch) return bots;
    return bots.filter((b) => b.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [bots, debouncedSearch]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">AI Bots</h1>
          <p className="text-text-secondary mt-1">Manage your AI-powered customer interaction bots</p>
        </div>
        {canCreate && (
          <Link href="/bots/new"
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">
            + Create Bot
          </Link>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {STATUS_CHIPS.map((chip) => (
            <button key={chip.label}
              onClick={() => setStatusFilter(chip.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === chip.value
                  ? 'bg-accent-purple/10 text-accent-purple'
                  : 'border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active'
              }`}>
              {chip.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search bots…"
            className="w-full pl-8 pr-8 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={14} className="text-text-muted hover:text-text-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-5 space-y-3 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-bg-tertiary" />
                <div className="w-14 h-5 rounded-full bg-bg-tertiary" />
              </div>
              <div className="h-4 w-2/3 bg-bg-tertiary rounded" />
              <div className="h-3 w-full bg-bg-tertiary rounded" />
              <div className="h-px bg-border-primary" />
              <div className="flex gap-4">
                <div className="h-8 w-20 bg-bg-tertiary rounded" />
                <div className="h-8 w-20 bg-bg-tertiary rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-bg-card border border-status-error/20 rounded-xl p-8 text-center">
          <p className="text-text-muted mb-3">Failed to load bots.</p>
          <button onClick={() => refetch()} className="text-sm text-accent-blue hover:underline">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredBots.length === 0 && (
        <div className="bg-bg-card border border-border-primary rounded-xl p-12 text-center">
          <BotIcon size={32} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-muted">
            {bots.length === 0 ? 'No bots created yet.' : 'No bots match your search.'}
          </p>
          {bots.length === 0 && canCreate && (
            <Link href="/bots/new" className="inline-block mt-3 text-sm text-accent-purple hover:underline">Create your first bot</Link>
          )}
          {bots.length > 0 && debouncedSearch && (
            <button onClick={() => setSearchTerm('')} className="mt-3 text-sm text-accent-blue hover:underline">Clear search</button>
          )}
        </div>
      )}

      {/* Bot Cards */}
      {!loading && !error && filteredBots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBots.map((bot) => {
            const sc = getStatusConfig(bot.status);
            const analytics = bot.analytics;
            return (
              <Link key={bot.id} href={`/bots/${bot.id}`}
                className="bg-bg-card border border-border-primary rounded-xl p-5 hover:border-border-secondary transition-colors block">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center text-accent-purple text-sm font-medium overflow-hidden">
                    {bot.avatarUrl
                      ? <img src={bot.avatarUrl} alt={bot.name} className="w-full h-full object-cover" />
                      : (bot.name?.charAt(0) || <BotIcon size={18} />)}
                  </div>
                  <div className="flex items-center gap-2">
                    <BotStatusToggle bot={bot} onUpdated={refetch} />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>{sc.label}</span>
                  </div>
                </div>
                <h3 className="font-medium text-sm">{bot.name || 'Unnamed Bot'}</h3>
                <p className="text-xs text-text-muted mt-1 line-clamp-2">{bot.purpose || 'No purpose set'}</p>
                {bot.department && <p className="text-xs text-text-secondary mt-1">{bot.department}</p>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-primary">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs text-text-muted">Conversations</p>
                      <p className="text-sm font-medium">{(analytics?.totalConversations ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Escalations</p>
                      <p className="text-sm font-medium">{(analytics?.totalEscalations ?? 0).toLocaleString()}</p>
                    </div>
                    {analytics?.escalationRate != null && (
                      <div>
                        <p className="text-xs text-text-muted">Esc. Rate</p>
                        <p className="text-sm font-medium">{analytics.escalationRate.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    {analytics?.lastActiveAt ? formatRelativeTime(analytics.lastActiveAt) : 'Never'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BotsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="h-8 w-40 bg-bg-tertiary rounded animate-pulse" /></div>}>
      <BotsContent />
    </Suspense>
  );
}
