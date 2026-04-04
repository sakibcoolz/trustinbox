'use client';

import { useState, useCallback, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { MessageSquare, Search, Bot, User, X, ArrowDownUp, Filter, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import {
  useConversations,
  useConversationStats,
  useProviderMessageSubscription,
  useTeamMembers,
  useAssignConversation,
  getWorkloadColor,
  type ConversationNode,
  type ConversationListOptions,
  type TeamMember,
  getConversationStatusVariant,
  getConversationStatusLabel,
} from '@/lib/graphql/conversations';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime, formatNumber } from '@/lib/format';

// ─── Constants ──────────────────────────────────────────

const STATUS_CHIPS = [
  { value: 'All', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent', field: 'updatedAt', direction: 'DESC' },
  { value: 'oldest', label: 'Oldest', field: 'updatedAt', direction: 'ASC' },
  { value: 'unread', label: 'Unread First', field: 'unreadCount', direction: 'DESC' },
];

const PAGE_SIZE = 20;

// ─── Page Wrapper ───────────────────────────────────────

export default function ConversationsPage() {
  return (
    <Suspense fallback={<ConversationsSkeleton />}>
      <ConversationsContent />
    </Suspense>
  );
}

// ─── Main Content ───────────────────────────────────────

function ConversationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { activeServiceProvider, user } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const currentUserId = user?.id ?? '';
  const listRef = useRef<HTMLDivElement>(null);
  const canManage = usePermission('conversations:assign');
  const { success, error: toastError } = useToast();
  const { assign: assignConversation } = useAssignConversation();

  // ── URL state ──
  const statusFilter = searchParams.get('status') ?? 'All';
  const unreadOnly = searchParams.get('unread') === 'true';
  const sortParam = searchParams.get('sort') ?? 'recent';
  const searchQuery = searchParams.get('q') ?? '';
  const assigneeFilter = searchParams.get('assignee') ?? 'all';
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [showSort, setShowSort] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const sortConfig = SORT_OPTIONS.find((o) => o.value === sortParam) ?? SORT_OPTIONS[0];

  // ── Agent data for filters + workload ──
  const { data: teamData } = useTeamMembers(spId);
  const agents = teamData?.teamMembers ?? [];

  const agentWorkloadMap = useMemo(() => {
    const map = new Map<string, number>();
    agents.forEach((a) => map.set(a.id, a.activeConversations));
    return map;
  }, [agents]);

  // ── URL update ──
  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === '') params.delete(key);
        else params.set(key, val);
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // ── Debounced search (6.2) ──
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.length >= 2) {
        updateUrl({ q: value, offset: '0' });
      } else if (value.length === 0) {
        updateUrl({ q: undefined, offset: '0' });
      }
    }, 300);
  }

  function clearSearch() {
    setSearchInput('');
    updateUrl({ q: undefined, offset: '0' });
  }

  // ── GraphQL ──
  const resolvedAssigneeId = assigneeFilter === 'all' ? undefined : assigneeFilter === 'me' ? currentUserId : assigneeFilter;

  const queryOptions: ConversationListOptions = {
    status: statusFilter !== 'All' ? statusFilter : undefined,
    search: searchQuery || undefined,
    unreadOnly: unreadOnly || undefined,
    assigneeId: resolvedAssigneeId,
    orderBy: { field: sortConfig.field, direction: sortConfig.direction },
    limit: PAGE_SIZE,
    offset,
  };

  const { data, loading, refetch } = useConversations(queryOptions);
  const { data: statsData } = useConversationStats(spId);

  // Live updates (6.15)
  useProviderMessageSubscription(spId);

  const conversations = data?.conversations?.nodes ?? [];
  const totalCount = data?.conversations?.totalCount ?? 0;
  const stats = statsData?.conversationStats;
  const hasMore = conversations.length < totalCount;

  // ── Infinite scroll (6.1) ──
  const [loadingMore, setLoadingMore] = useState(false);
  const [extraConversations, setExtraConversations] = useState<typeof conversations>([]);

  // Reset extra conversations when query options change
  useEffect(() => {
    setExtraConversations([]);
  }, [statusFilter, searchQuery, unreadOnly, assigneeFilter, sortConfig.field, sortConfig.direction]);

  const allConversations = [...conversations, ...extraConversations];
  const allHasMore = allConversations.length < totalCount;

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container || loadingMore || !allHasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        setLoadingMore(true);
        const nextOffset = allConversations.length;
        const params = new URLSearchParams();
        if (queryOptions.status) params.set('status', queryOptions.status);
        if (queryOptions.search) params.set('search', queryOptions.search);
        if (queryOptions.unreadOnly) params.set('unreadOnly', 'true');
        if (queryOptions.assigneeId) params.set('assigneeId', queryOptions.assigneeId);
        params.set('orderByField', queryOptions.orderBy?.field ?? 'updatedAt');
        params.set('orderByDirection', queryOptions.orderBy?.direction ?? 'DESC');
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(nextOffset));

        fetch(`/api/conversations?${params}`)
          .then((res) => res.ok ? res.json() : null)
          .then((moreData) => {
            if (moreData?.nodes) {
              setExtraConversations((prev) => [...prev, ...moreData.nodes]);
            }
          })
          .finally(() => setLoadingMore(false));
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [allConversations.length, allHasMore, loadingMore, queryOptions]);

  // ── Quick claim ──
  async function handleQuickClaim(conversationId: string) {
    setClaimingId(conversationId);
    try {
      await assignConversation(conversationId, currentUserId);
      success('Conversation claimed');
      refetch?.();
    } catch {
      toastError('Failed to claim conversation');
    }
    setClaimingId(null);
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <p className="text-text-secondary mt-1">Manage customer conversations with bot assist</p>
      </div>

      {/* Stats Cards (dynamic) */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Open" value={stats ? formatNumber(stats.open) : '—'} color="text-status-success" />
        <StatCard label="Closed" value={stats ? formatNumber(stats.closed) : '—'} color="text-text-muted" />
        <StatCard label="Archived" value={stats ? formatNumber(stats.archived) : '—'} color="text-text-muted" />
        <StatCard label="Unread" value={stats ? formatNumber(stats.unreadTotal) : '—'} color="text-accent-blue" />
        <StatCard
          label="Unassigned"
          value={stats ? formatNumber(stats.unassigned ?? 0) : '—'}
          color="text-status-warning"
          onClick={() => updateUrl({ assignee: 'unassigned', status: 'OPEN', offset: '0' })}
          active={assigneeFilter === 'unassigned'}
        />
      </div>

      {/* Agent workload bar (supervisor view) */}
      {canManage && agents.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => updateUrl({ assignee: undefined, offset: '0' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shrink-0 text-xs font-medium transition-colors ${
              assigneeFilter === 'all' ? 'border-accent-blue bg-accent-blue/5 text-accent-blue' : 'border-border-secondary text-text-muted hover:border-border-active'
            }`}>
            All Agents
          </button>
          <button
            onClick={() => updateUrl({ assignee: 'me', offset: '0' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shrink-0 text-xs font-medium transition-colors ${
              assigneeFilter === 'me' ? 'border-accent-blue bg-accent-blue/5 text-accent-blue' : 'border-border-secondary text-text-muted hover:border-border-active'
            }`}>
            <UserCheck size={12} /> My Conversations
          </button>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => updateUrl({ assignee: agent.id, offset: '0' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 transition-colors ${
                assigneeFilter === agent.id ? 'border-accent-blue bg-accent-blue/5' : 'border-border-secondary hover:border-border-active'
              }`}>
              <div className={`w-2 h-2 rounded-full ${getWorkloadColor(agent.activeConversations)}`} />
              <span className="text-xs font-medium text-text-primary">{agent.name}</span>
              <span className="text-[10px] text-text-muted">{agent.activeConversations}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search + Filters + Sort (6.2, 6.3, 6.4) */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search by name, VID, or message…"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          )}
          {loading && searchQuery && (
            <Loader2 size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
          )}
        </div>

        {/* Status chips (6.3) */}
        <div className="flex gap-1">
          {STATUS_CHIPS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateUrl({ status: s.value === 'All' ? undefined : s.value, offset: '0' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Unread toggle (6.3) */}
        <button
          onClick={() => updateUrl({ unread: unreadOnly ? undefined : 'true', offset: '0' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            unreadOnly
              ? 'bg-accent-blue/10 text-accent-blue'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Filter size={12} />
          Unread
          {stats && stats.unreadTotal > 0 && (
            <span className="w-4 h-4 rounded-full bg-accent-blue text-white text-[10px] flex items-center justify-center">
              {stats.unreadTotal > 99 ? '99+' : stats.unreadTotal}
            </span>
          )}
        </button>

        {/* Sort dropdown (6.4) */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <ArrowDownUp size={12} /> {sortConfig.label}
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-bg-card border border-border-primary rounded-lg shadow-xl py-1 min-w-[160px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      updateUrl({ sort: opt.value === 'recent' ? undefined : opt.value, offset: '0' });
                      setShowSort(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      sortParam === opt.value
                        ? 'text-accent-blue bg-accent-blue/5'
                        : 'text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unassigned queue banner */}
      {assigneeFilter === 'unassigned' && (
        <div className="flex items-start gap-2 p-3 bg-status-warning/5 rounded-lg border border-status-warning/20">
          <AlertTriangle size={14} className="text-status-warning mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary">Showing unassigned conversations — click &quot;Claim&quot; on any conversation to assign it to yourself</p>
        </div>
      )}

      {/* Conversation List (6.1) */}
      <div ref={listRef} className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
        {loading && allConversations.length === 0 ? (
          <ConversationSkeletonCards />
        ) : allConversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations found"
            description={
              searchQuery || statusFilter !== 'All' || unreadOnly || assigneeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Conversations will appear here when customers reach out'
            }
          />
        ) : (
          <>
            {allConversations.map((conv) => (
              <ConversationCard
                key={conv.id}
                conversation={conv}
                agentWorkload={conv.assignee && !conv.assignee.role?.includes('BOT') ? agentWorkloadMap.get(conv.assignee.id) : undefined}
                showClaim={assigneeFilter === 'unassigned'}
                claiming={claimingId === conv.id}
                onClaim={() => handleQuickClaim(conv.id)}
              />
            ))}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="text-text-muted animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Conversation Card ──────────────────────────────────

function ConversationCard({ conversation: conv, agentWorkload, showClaim, claiming, onClaim }: {
  conversation: ConversationNode;
  agentWorkload?: number;
  showClaim?: boolean;
  claiming?: boolean;
  onClaim?: () => void;
}) {
  const customer = conv.participants[0];
  const lastMessage = conv.messages.nodes[0];
  const isBot = conv.assignee?.role === 'BOT';

  return (
    <div className={`flex items-center gap-4 bg-bg-card border rounded-xl p-4 hover:bg-bg-hover transition-colors group ${
      conv.unreadCount > 0 ? 'border-l-accent-blue border-l-2 border-border-primary' : 'border-border-primary'
    }`}>
      <Link href={`/conversations/${conv.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
          <MessageSquare size={18} className="text-text-muted" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-mono">
              {customer?.virtualPublicId ?? 'Unknown'}
            </span>
            <Badge variant={getConversationStatusVariant(conv.status)} size="sm">
              {getConversationStatusLabel(conv.status)}
            </Badge>
            {conv.unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-accent-blue text-white text-xs flex items-center justify-center font-medium">
                {conv.unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted truncate mt-0.5">
            {lastMessage?.content
              ? lastMessage.content.length > 60
                ? `${lastMessage.content.slice(0, 60)}…`
                : lastMessage.content
              : 'No messages yet'}
          </p>
        </div>

        {/* Meta */}
        <div className="text-right shrink-0">
          <p className="text-xs text-text-muted">{formatRelativeTime(conv.updatedAt)}</p>
          {conv.assignee && (
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1 justify-end">
              {isBot ? (
                <Bot size={12} className="text-accent-purple" />
              ) : (
                <User size={12} className="text-accent-blue" />
              )}
              <span className="truncate max-w-[120px]">{conv.assignee.name}</span>
              {typeof agentWorkload === 'number' && (
                <span className={`w-2 h-2 rounded-full ${getWorkloadColor(agentWorkload)}`} title={`${agentWorkload} active`} />
              )}
            </p>
          )}
        </div>
      </Link>

      {showClaim && onClaim && (
        <button
          onClick={(e) => { e.stopPropagation(); onClaim(); }}
          disabled={claiming}
          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors disabled:opacity-50"
        >
          {claiming ? <Loader2 size={12} className="animate-spin" /> : 'Claim'}
        </button>
      )}
    </div>
  );
}

// ─── Stats Card ─────────────────────────────────────────

function StatCard({ label, value, color, onClick, active }: { label: string; value: string; color: string; onClick?: () => void; active?: boolean }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-bg-card border rounded-xl p-4 text-left w-full ${
        active ? 'border-accent-blue ring-1 ring-accent-blue/30' : 'border-border-primary'
      } ${onClick ? 'cursor-pointer hover:bg-bg-hover transition-colors' : ''}`}
    >
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${color}`}>{value}</p>
    </Wrapper>
  );
}

// ─── Skeletons ──────────────────────────────────────────

function ConversationsSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <ConversationSkeletonCards />
    </div>
  );
}

function ConversationSkeletonCards() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-bg-card border border-border-primary rounded-xl p-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
