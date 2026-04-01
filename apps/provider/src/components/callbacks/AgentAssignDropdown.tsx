'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, ChevronDown, Check } from 'lucide-react';
import { useTeamMembers } from '@/lib/graphql/conversations';
import { useAssignCallbackRequest } from '@/lib/graphql/callbacks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

interface AgentAssignDropdownProps {
  callbackId: string;
  currentAgentId?: string;
  currentAgentName?: string;
}

export default function AgentAssignDropdown({ callbackId, currentAgentId, currentAgentName }: AgentAssignDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const spId = user?.activeServiceProvider?.id ?? '';
  const { data: teamData } = useTeamMembers(spId);
  const { assign, loading } = useAssignCallbackRequest();

  const agents = (teamData?.teamMembers ?? []).filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleAssign(agentId: string, agentName: string) {
    try {
      await assign(callbackId, agentId);
      success(`Assigned to ${agentName}`);
      setOpen(false);
    } catch {
      toastError('Failed to assign callback');
    }
  }

  function workloadColor(count: number) {
    if (count <= 3) return 'bg-status-success';
    if (count <= 7) return 'bg-status-warning';
    return 'bg-status-error';
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
      >
        <User size={12} />
        <span className="max-w-[80px] truncate">{currentAgentName || 'Unassigned'}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-bg-input border border-border-secondary rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Search agents…"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            <button
              onClick={() => handleAssign('', 'Unassigned')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-hover transition-colors text-text-muted"
            >
              <User size={14} />
              <span>Unassigned</span>
              {!currentAgentId && <Check size={12} className="ml-auto text-accent-blue" />}
            </button>

            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAssign(agent.id, agent.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-hover transition-colors"
              >
                {agent.avatarUrl ? (
                  <img src={agent.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center text-[10px] font-medium text-accent-blue">
                    {agent.name.charAt(0)}
                  </div>
                )}
                <span className="flex-1 text-left text-text-primary truncate">{agent.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${workloadColor(agent.activeConversations)}`} />
                  <span className="text-text-muted">({agent.activeConversations})</span>
                </div>
                {currentAgentId === agent.id && <Check size={12} className="text-accent-blue" />}
              </button>
            ))}

            {agents.length === 0 && (
              <p className="px-3 py-2 text-xs text-text-muted">No agents found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
