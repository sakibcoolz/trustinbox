'use client';

import { X, ExternalLink, FileText, PhoneCall, Clock, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/format';
import { getConversationStatusVariant, getConversationStatusLabel } from '@/lib/graphql/conversations';
import type { ConversationDetail } from '@/lib/graphql/conversations';

// ─── Types ──────────────────────────────────────────────

interface ConversationInfoSidebarProps {
  conversation: ConversationDetail;
  open: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────

export function ConversationInfoSidebar({ conversation, open, onClose }: ConversationInfoSidebarProps) {
  const customer = conversation.participants?.[0];
  const vid = customer?.virtualPublicId ?? 'Unknown';

  return (
    <div
      className={`border-l border-border-primary bg-bg-surface transition-all duration-200 overflow-hidden ${
        open ? 'w-80 min-w-[320px]' : 'w-0 min-w-0'
      }`}
    >
      <div className="w-80 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <h3 className="text-sm font-semibold text-text-primary">Conversation Info</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Customer Profile */}
        <div className="p-4 border-b border-border-primary">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent-purple/10 flex items-center justify-center">
              <User size={18} className="text-accent-purple" />
            </div>
            <div>
              <Link
                href={`/customers/${vid}`}
                className="text-sm font-mono font-medium text-accent-blue hover:underline"
              >
                {vid}
              </Link>
              {customer?.displayName && (
                <p className="text-xs text-text-muted">{customer.displayName}</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1">
            <Link
              href={`/customers/${vid}`}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <ExternalLink size={12} />
              View Full Profile
            </Link>
            <Link
              href={`/notifications/compose?recipients=${vid}`}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <MessageSquare size={12} />
              Send Notification
            </Link>
          </div>
        </div>

        {/* Shared Documents */}
        <div className="p-4 border-b border-border-primary">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Shared Documents
          </h4>
          {conversation.sharedDocuments && conversation.sharedDocuments.length > 0 ? (
            <div className="space-y-1.5">
              {conversation.sharedDocuments.map((doc) => (
                <a
                  key={doc.id}
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-bg-hover transition-colors group"
                >
                  <FileText size={14} className="text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate group-hover:text-accent-blue">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {formatRelativeTime(doc.sharedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted py-2">No documents shared</p>
          )}
        </div>

        {/* Callback History */}
        <div className="p-4 border-b border-border-primary">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Callback History
          </h4>
          {conversation.relatedCallbacks && conversation.relatedCallbacks.length > 0 ? (
            <div className="space-y-1.5">
              {conversation.relatedCallbacks.map((cb) => (
                <div
                  key={cb.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-bg-hover transition-colors"
                >
                  <PhoneCall size={14} className="text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={cb.status === 'COMPLETED' ? 'success' : cb.status === 'PENDING' ? 'warning' : 'neutral'}>
                        {cb.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {formatRelativeTime(cb.requestedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted py-2">No callbacks</p>
          )}
        </div>

        {/* Conversation Metadata */}
        <div className="p-4">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Details
          </h4>
          <dl className="space-y-2">
            <MetaRow icon={<Clock size={12} />} label="Started" value={formatRelativeTime(conversation.createdAt)} />
            <MetaRow icon={<Clock size={12} />} label="Last active" value={formatRelativeTime(conversation.updatedAt)} />
            <MetaRow
              icon={<MessageSquare size={12} />}
              label="Messages"
              value={String(conversation.messages?.totalCount ?? 0)}
            />
            <MetaRow
              icon={<User size={12} />}
              label="Assigned to"
              value={conversation.assignee?.name ?? 'Unassigned'}
            />
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-text-muted">Status</span>
              <Badge variant={getConversationStatusVariant(conversation.status)}>
                {getConversationStatusLabel(conversation.status)}
              </Badge>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

// ─── Meta Row ───────────────────────────────────────────

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted">{icon}</span>
      <span className="text-xs text-text-muted">{label}:</span>
      <span className="text-xs text-text-primary">{value}</span>
    </div>
  );
}
