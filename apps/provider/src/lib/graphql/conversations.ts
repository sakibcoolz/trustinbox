'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

// ─── Types ──────────────────────────────────────────────

export type ConversationStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type SenderType = 'CUSTOMER' | 'AGENT' | 'BOT' | 'SYSTEM';
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM';
export type ReadStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ConversationParticipant {
  id: string;
  virtualPublicId: string;
  displayName?: string;
}

export interface ConversationNode {
  id: string;
  status: ConversationStatus;
  participants: ConversationParticipant[];
  assignee?: { id: string; name: string; role: string };
  unreadCount: number;
  messages: { nodes: MessageNode[]; totalCount: number };
  createdAt: string;
  updatedAt: string;
}

export interface ConversationConnection {
  nodes: ConversationNode[];
  totalCount: number;
}

export interface MessageNode {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderName: string;
  content: string;
  messageType: MessageType;
  readStatus: ReadStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MessageConnection {
  nodes: MessageNode[];
  totalCount: number;
}

export interface ConversationDetail extends ConversationNode {
  messages: MessageConnection;
  sharedDocuments: SharedDocument[];
  relatedCallbacks: RelatedCallback[];
}

export interface SharedDocument {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  sharedAt: string;
  sharedBy: string;
}

export interface RelatedCallback {
  id: string;
  status: string;
  requestedAt: string;
  notes?: string;
}

export interface ConversationStats {
  open: number;
  closed: number;
  archived: number;
  unreadTotal: number;
  unassigned?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  activeConversations: number;
}

export interface ConversationListOptions {
  status?: string;
  search?: string;
  unreadOnly?: boolean;
  assigneeId?: string;
  orderBy?: { field: string; direction: string };
  limit?: number;
  offset?: number;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  messageType?: string;
  metadata?: Record<string, unknown>;
}

// ─── Status Helpers ─────────────────────────────────────

export function getConversationStatusVariant(status: string) {
  const map: Record<string, string> = {
    OPEN: 'success',
    CLOSED: 'neutral',
    ARCHIVED: 'neutral',
  };
  return (map[status.toUpperCase()] ?? 'neutral') as 'success' | 'neutral';
}

export function getConversationStatusLabel(status: string) {
  const map: Record<string, string> = {
    OPEN: 'Open',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived',
  };
  return map[status.toUpperCase()] ?? status;
}

export function getSenderStyle(senderType: SenderType) {
  const styles: Record<SenderType, { bg: string; iconColor: string }> = {
    CUSTOMER: { bg: 'bg-bg-card border border-border-primary', iconColor: 'text-text-muted' },
    BOT: { bg: 'bg-accent-purple/10 border border-accent-purple/20', iconColor: 'text-accent-purple' },
    AGENT: { bg: 'bg-accent-blue/10 border border-accent-blue/20', iconColor: 'text-accent-blue' },
    SYSTEM: { bg: 'bg-bg-tertiary border border-border-primary', iconColor: 'text-text-muted' },
  };
  return styles[senderType] ?? styles.CUSTOMER;
}

// ─── Hooks ──────────────────────────────────────────────

export function useConversations(options: ConversationListOptions) {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.search) params.set('search', options.search);
  if (options.unreadOnly) params.set('unreadOnly', 'true');
  if (options.assigneeId) params.set('assigneeId', options.assigneeId);
  params.set('orderByField', options.orderBy?.field ?? 'updatedAt');
  params.set('orderByDirection', options.orderBy?.direction ?? 'DESC');
  params.set('limit', String(options.limit ?? 20));
  params.set('offset', String(options.offset ?? 0));
  const qs = params.toString();

  const result = useData<ConversationConnection>(`/api/conversations?${qs}`);
  return { ...result, data: result.data ? { conversations: result.data } : undefined };
}

export function useConversation(id: string) {
  const result = useData<ConversationDetail>(
    id ? `/api/conversations/${id}` : null,
    { skip: !id },
  );

  const [allMessages, setAllMessages] = useState<MessageNode[]>([]);
  const totalCountRef = useRef(0);

  // Sync fetched messages
  useEffect(() => {
    if (result.data) {
      setAllMessages(result.data.messages?.nodes ?? []);
      totalCountRef.current = result.data.messages?.totalCount ?? 0;
    }
  }, [result.data]);

  const fetchMoreMessages = useCallback(async () => {
    const currentCount = allMessages.length;
    const res = await fetch(`/api/conversations/${id}?messageLimit=50&messageOffset=${currentCount}`);
    if (!res.ok) return;
    const data: ConversationDetail = await res.json();
    const olderMessages = data.messages?.nodes ?? [];
    setAllMessages(prev => [...olderMessages, ...prev]);
  }, [id, allMessages.length]);

  const hasMoreMessages = allMessages.length < totalCountRef.current;

  const wrappedData = result.data
    ? {
        conversation: {
          ...result.data,
          messages: { nodes: allMessages, totalCount: totalCountRef.current },
        },
      }
    : undefined;

  return { ...result, data: wrappedData, fetchMoreMessages, hasMoreMessages };
}

export function useConversationStats(spId: string) {
  const result = useData<ConversationStats>(
    spId ? `/api/gateway/conversations/stats?serviceProviderId=${spId}` : null,
    { skip: !spId },
  );
  return { ...result, data: result.data ? { conversationStats: result.data } : undefined };
}

export function useTeamMembers(spId: string, role?: string) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  const qs = params.toString();

  const result = useData<{ items: TeamMember[]; total: number }>(
    spId ? `/api/team/members${qs ? `?${qs}` : ''}` : null,
    { skip: !spId },
  );
  return { ...result, data: result.data ? { teamMembers: result.data.items ?? [] } : undefined };
}

export function useSendMessage() {
  const { run, loading, error } = useMutationHelper<MessageNode>();
  return {
    sendMessage: (input: SendMessageInput) =>
      run(`/api/conversations/${input.conversationId}/messages`, 'POST', input),
    loading,
    error,
  };
}

export function useAssignConversation() {
  const { run, loading, error } = useMutationHelper();
  return {
    assign: (conversationId: string, agentId: string) =>
      run(`/api/gateway/v1/conversations/${conversationId}/assign`, 'POST', { agentId }),
    loading,
    error,
  };
}

export function useArchiveConversation() {
  const { run, loading, error } = useMutationHelper();
  return {
    archive: (id: string) =>
      run(`/api/gateway/v1/conversations/${id}/archive`, 'POST'),
    loading,
    error,
  };
}

export function useTransferConversation() {
  const { run, loading, error } = useMutationHelper();
  return {
    transfer: (conversationId: string, agentId: string, note?: string) =>
      run(`/api/gateway/v1/conversations/${conversationId}/transfer`, 'POST', { agentId, note }),
    loading,
    error,
  };
}

export function getWorkloadColor(count: number): string {
  if (count <= 3) return 'bg-status-success';
  if (count <= 7) return 'bg-status-warning';
  return 'bg-status-error';
}

// Subscription stubs — will be replaced with SSE in Phase 4
export function useProviderMessageSubscription(_spId: string) {
  return { data: undefined as { providerMessageReceived: MessageNode } | undefined };
}

export function useMessageSubscription(_conversationId: string) {
  return { data: undefined as { messageReceived: MessageNode } | undefined };
}
