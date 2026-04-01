'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  PhoneCall,
  FileText,
  Archive,
  UserPlus,
  MoreVertical,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { usePermission } from '@/hooks/usePermission';
import { useArchiveConversation, getConversationStatusVariant, getConversationStatusLabel } from '@/lib/graphql/conversations';
import type { ConversationDetail, ConversationStatus } from '@/lib/graphql/conversations';
import { useToast } from '@/components/Toast';

// ─── Types ──────────────────────────────────────────────

interface ConversationHeaderProps {
  conversation: ConversationDetail;
  onToggleInfo: () => void;
  onAssign: () => void;
  infoOpen: boolean;
}

// ─── Component ──────────────────────────────────────────

export function ConversationHeader({ conversation, onToggleInfo, onAssign, infoOpen }: ConversationHeaderProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canManage = usePermission('conversations:assign');
  const canCallback = usePermission('callbacks:manage');
  const canShareDoc = usePermission('documents:share');

  const { archive: archiveConversation, loading: archiving } = useArchiveConversation();

  const isOpen = conversation.status === 'OPEN';
  const isArchivable = conversation.status === 'OPEN' || conversation.status === 'CLOSED';

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  async function handleArchive() {
    try {
      await archiveConversation(conversation.id);
      success('Conversation archived');
      router.push('/conversations');
    } catch {
      toastError('Failed to archive conversation');
    }
    setArchiveConfirm(false);
  }

  const customer = conversation.participants?.[0];
  const vid = customer?.virtualPublicId ?? 'Unknown';

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-bg-surface">
        {/* Left: back + customer info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/conversations')}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"
            title="Back to conversations"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-text-primary font-mono">{vid}</h2>
              <Badge variant={getConversationStatusVariant(conversation.status)}>
                {getConversationStatusLabel(conversation.status)}
              </Badge>
            </div>
            {conversation.assignee && (
              <span className="text-xs text-text-muted">
                Assigned to {conversation.assignee.name}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {/* Primary actions — visible when OPEN */}
          {canCallback && isOpen && (
            <button
              onClick={() => {
                /* TODO: open callback drawer */
              }}
              className="p-2 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"
              title="Request callback"
            >
              <PhoneCall size={16} />
            </button>
          )}

          {canShareDoc && isOpen && (
            <button
              onClick={() => {
                /* TODO: open document picker */
              }}
              className="p-2 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"
              title="Share document"
            >
              <FileText size={16} />
            </button>
          )}

          {/* Info toggle */}
          <button
            onClick={onToggleInfo}
            className={`p-2 rounded-lg transition-colors ${
              infoOpen
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'hover:bg-bg-hover text-text-muted'
            }`}
            title="Conversation info"
          >
            <Info size={16} />
          </button>

          {/* More menu */}
          {canManage && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"
                title="More actions"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-bg-card border border-border-primary rounded-lg shadow-lg z-20 py-1">
                  {isOpen && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onAssign();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                    >
                      <UserPlus size={14} />
                      Assign to Agent
                    </button>
                  )}

                  {isArchivable && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setArchiveConfirm(true);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-status-error hover:bg-bg-hover transition-colors"
                    >
                      <Archive size={14} />
                      Archive
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={archiveConfirm}
        onConfirm={handleArchive}
        onCancel={() => setArchiveConfirm(false)}
        title="Archive Conversation"
        description="Archive this conversation? It can be unarchived later."
        confirmLabel="Archive"
        variant="danger"
        loading={archiving}
      />
    </>
  );
}
