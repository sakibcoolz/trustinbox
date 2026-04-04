'use client';

import { useState, useMemo } from 'react';
import { Search, Check, X, UserMinus, Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { useTeamMembers, useAssignConversation, useTransferConversation } from '@/lib/graphql/conversations';
import type { TeamMember } from '@/lib/graphql/conversations';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

// ─── Types ──────────────────────────────────────────────

interface AgentAssignDrawerProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  currentAssigneeId?: string;
  onAssigned?: () => void;
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

export function AgentAssignDrawer({ open, onClose, conversationId, currentAssigneeId, onAssigned }: AgentAssignDrawerProps) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState('');

  const isTransferMode = !!currentAssigneeId;

  const { data: teamData, loading } = useTeamMembers(
    user?.activeServiceProvider?.id ?? '',
    'AGENT'
  );
  const { assign: assignConversation } = useAssignConversation();
  const { transfer: transferConversation } = useTransferConversation();

  const members = teamData?.teamMembers ?? [];
  const currentAgent = members.find((m) => m.id === currentAssigneeId);

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
      if (isTransferMode) {
        await transferConversation(conversationId, agentId, transferNote || undefined);
        success(`Conversation transferred to ${name}`);
      } else {
        await assignConversation(conversationId, agentId);
        success(`Conversation assigned to ${name}`);
      }
      setTransferNote('');
      onAssigned?.();
      onClose();
    } catch {
      toastError(isTransferMode ? 'Failed to transfer conversation' : 'Failed to assign conversation');
    }
    setAssigning(null);
  }

  async function handleUnassign() {
    setAssigning('unassign');
    try {
      await assignConversation(conversationId, '');
      success('Conversation unassigned');
      onAssigned?.();
      onClose();
    } catch {
      toastError('Failed to unassign conversation');
    }
    setAssigning(null);
  }

  return (
    <Drawer open={open} onClose={onClose} title={isTransferMode ? 'Transfer Conversation' : 'Assign to Agent'} size="sm">
      <div className="flex flex-col h-full">
        {/* Current assignee info (transfer mode) */}
        {isTransferMode && currentAgent && (
          <div className="px-4 pb-2 flex items-center gap-2 text-xs text-text-muted">
            <span>Currently assigned to</span>
            <span className="font-medium text-text-secondary">{currentAgent.name}</span>
          </div>
        )}

        {/* Transfer note (transfer mode) */}
        {isTransferMode && (
          <div className="px-4 pb-3">
            <label className="block text-xs text-text-muted mb-1.5">Transfer Note (optional)</label>
            <textarea
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary resize-none placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Reason for transfer…"
            />
          </div>
        )}

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
            filtered.map((member) => {
              const isCurrent = member.id === currentAssigneeId;
              return (
                <AgentRow
                  key={member.id}
                  member={member}
                  isCurrent={isCurrent}
                  isFromAgent={isTransferMode && isCurrent}
                  loading={assigning === member.id}
                  disabled={assigning !== null}
                  onSelect={() => handleAssign(member.id, member.name)}
                />
              );
            })
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
  isFromAgent,
  loading,
  disabled,
  onSelect,
}: {
  member: TeamMember;
  isCurrent: boolean;
  isFromAgent?: boolean;
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
        isFromAgent
          ? 'bg-status-warning/5 border border-status-warning/20 opacity-60'
          : isCurrent
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
          {isFromAgent && <span className="text-[10px] text-status-warning font-medium">(current)</span>}
          {loading && <Loader2 size={14} className="text-accent-blue shrink-0 animate-spin" />}
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
