'use client';

import { useState, useMemo } from 'react';
import { Search, Check, X, UserMinus } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { useTeamMembers, useAssignConversation } from '@/lib/graphql/conversations';
import type { TeamMember } from '@/lib/graphql/conversations';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

// ─── Types ──────────────────────────────────────────────

interface AgentAssignDrawerProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  currentAssigneeId?: string;
}

// ─── Workload Helpers ───────────────────────────────────

function getWorkloadColor(count: number): string {
  if (count <= 3) return 'bg-status-success';
  if (count <= 7) return 'bg-status-warning';
  return 'bg-status-error';
}

function getWorkloadLabel(count: number): string {
  if (count <= 3) return 'Low';
  if (count <= 7) return 'Moderate';
  return 'High';
}

// ─── Component ──────────────────────────────────────────

export function AgentAssignDrawer({ open, onClose, conversationId, currentAssigneeId }: AgentAssignDrawerProps) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  const { data: teamData, loading } = useTeamMembers(
    user?.activeServiceProvider?.id ?? '',
    'AGENT'
  );
  const { assign: assignConversation } = useAssignConversation();

  const members = teamData?.teamMembers ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  async function handleAssign(agentId: string, name: string) {
    setAssigning(agentId);
    try {
      await assignConversation(conversationId, agentId);
      success(`Conversation assigned to ${name}`);
      onClose();
    } catch {
      toastError('Failed to assign conversation');
    }
    setAssigning(null);
  }

  async function handleUnassign() {
    setAssigning('unassign');
    try {
      await assignConversation(conversationId, '');
      success('Conversation unassigned');
      onClose();
    } catch {
      toastError('Failed to unassign conversation');
    }
    setAssigning(null);
  }

  return (
    <Drawer open={open} onClose={onClose} title="Assign to Agent" size="sm">
      <div className="flex flex-col h-full">
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search agents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm bg-bg-primary border border-border-secondary rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto px-2">
          {/* Unassign option */}
          {currentAssigneeId && (
            <button
              onClick={handleUnassign}
              disabled={assigning !== null}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-bg-hover transition-colors text-left mb-1"
            >
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                <UserMinus size={14} className="text-text-muted" />
              </div>
              <span className="text-sm text-text-muted">Unassign</span>
            </button>
          )}

          {loading ? (
            <div className="space-y-2 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-bg-hover rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No agents found</p>
          ) : (
            filtered.map((member) => (
              <AgentRow
                key={member.id}
                member={member}
                isCurrent={member.id === currentAssigneeId}
                loading={assigning === member.id}
                disabled={assigning !== null}
                onSelect={() => handleAssign(member.id, member.name)}
              />
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ─── Agent Row ──────────────────────────────────────────

function AgentRow({
  member,
  isCurrent,
  loading,
  disabled,
  onSelect,
}: {
  member: TeamMember;
  isCurrent: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onSelect}
      disabled={disabled || isCurrent}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-left mb-0.5 ${
        isCurrent
          ? 'bg-accent-blue/5 border border-accent-blue/20'
          : 'hover:bg-bg-hover'
      }`}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-accent-purple/10 flex items-center justify-center shrink-0">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <span className="text-xs font-medium text-accent-purple">{initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">{member.name}</span>
          {isCurrent && <Check size={14} className="text-accent-blue shrink-0" />}
        </div>
        <span className="text-xs text-text-muted">{member.role}</span>
      </div>

      {/* Workload */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={`w-2 h-2 rounded-full ${getWorkloadColor(member.activeConversations)}`} />
        <span className="text-[10px] text-text-muted">
          {member.activeConversations} · {getWorkloadLabel(member.activeConversations)}
        </span>
      </div>
    </button>
  );
}
