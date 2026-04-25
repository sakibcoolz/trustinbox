'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './auth-context';
import { useNotifications, ChatMessagePayload, PresencePayload, MessageReadPayload } from './notification-context';
import { xmppClient, XMPPMessage, XMPPPresence, XMPPTyping, XMPPDeliveryReceipt, XMPP_DOMAIN, XMPP_MUC_DOMAIN, uuidv4 } from './xmpp-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ==================== Sound notification ====================

/** Plays a short soft chime using the Web Audio API.
 *  Safe to call in any context – silently no-ops when unavailable (SSR, old browsers). */
function playMessageSound(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    // Close the context once the sound finishes to avoid resource leaks
    osc.onended = () => { ctx.close().catch(() => {}); };
  } catch {
    // ignore – AudioContext unavailable
  }
}

// ==================== Types ====================

export interface Participant {
  userId: string;
  username: string;
  fullName: string;
  online: boolean;
  role: string;
  lastReadAt?: string;
  lastSeenAt?: string;
}

export interface Conversation {
  id: string;
  type: string;
  status: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  participants: Participant[];
  unreadCount: number;
  muted: boolean;
  createdAt: string;
  // Computed client-side
  name?: string;
  otherUser?: Participant;
}

export interface ReplyPreview {
  id: string;
  senderName: string;
  content?: string;
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url?: string;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  messageType: string;   // TEXT | VOICE | IMAGE | FILE
  content?: string;
  replyToId?: string;
  replyPreview?: ReplyPreview;
  attachments?: Attachment[];
  reactions?: Reaction[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | string;
  deliveredAt?: string;
  starred?: boolean;
  pinned?: boolean;
  forwardedFrom?: { senderName: string; conversationName?: string };
}

export interface TypingUser {
  userId: string;
  senderName: string;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  typingUsers: TypingUser[];
  typingConversationIds: Set<string>;
  isConnected: boolean;
  isReconnecting: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (content: string, replyToId?: string, attachmentIds?: string[], messageType?: string) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  markAsRead: () => void;
  sendTyping: (isTyping: boolean) => void;
  createConversation: (participantId: string, message?: string) => Promise<Conversation | null>;
  uploadFile: (file: File) => Promise<Attachment | null>;
  loadMoreMessages: () => void;
  refreshConversations: () => void;
  forwardMessage: (messageId: string, targetConvId: string) => Promise<void>;
  starMessage: (messageId: string) => void;
  pinMessage: (messageId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, token, xmppToken, xmppJid, isLoading: isAuthLoading, refreshAccessToken } = useAuth();
  const { onChatMessage, onPresenceUpdate, onMessageRead } = useNotifications();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [typingConversationIds, setTypingConversationIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const activeConvRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const hasConnectedOnce = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ==================== API Helpers ====================

  const authHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, [token]);

  // ==================== Fetch Conversations ====================

  const fetchConversations = useCallback(async () => {
    if (!token || !user) {
      setIsLoadingConversations(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      // Compute display names for DIRECT conversations
      const enriched = data.map(c => enrichConversation(c, user.id));
      setConversations(enriched);
    } catch {
      // silent
    } finally {
      setIsLoadingConversations(false);
    }
  }, [token, user, authHeaders]);

  // ==================== Fetch Messages ====================

  const fetchMessages = useCallback(async (conversationId: string, before?: string) => {
    if (!token) return [];
    setIsLoadingMessages(true);
    try {
      let url = `${API_BASE}/api/conversations/${conversationId}/messages?limit=50`;
      if (before) url += `&before=${encodeURIComponent(before)}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) return [];
      const data: Message[] = await res.json();
      return data;
    } catch {
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  }, [token, authHeaders]);

  // ==================== Fetch a single conversation (for new-conv discovery) ==

  const fetchConversationByID = useCallback(async (convId: string): Promise<Conversation | null> => {
    if (!token || !user) return null;
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${convId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return null;
      const data: Conversation = await res.json();
      return enrichConversation(data, user.id);
    } catch {
      return null;
    }
  }, [token, user, authHeaders]);

  // ==================== Fetch a single message (attachment hydration) ==

  const fetchMessageByID = useCallback(async (messageId: string): Promise<Message | null> => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/messages/${messageId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = await res.json();
      const msg: Message = {
        id:             d.id,
        conversationId: d.conversationId,
        senderId:       d.senderId,
        senderName:     d.senderName,
        senderType:     'USER',
        messageType:    d.messageType,
        content:        d.content ?? undefined,
        replyToId:      d.replyToId ?? undefined,
        attachments:    (d.attachments ?? []).map((a: any) => ({
          id:           a.id,
          fileName:     a.fileName,
          fileType:     a.fileType,
          fileSize:     a.fileSize,
          url:          a.url,
          thumbnailUrl: a.thumbnailUrl,
        })),
        reactions:      d.reactions ?? [],
        createdAt:      d.createdAt,
        status:         d.status ?? 'sent',
        starred:        d.starred,
        pinned:         d.pinned,
        editedAt:       d.editedAt ?? undefined,
        deletedAt:      d.deletedAt ?? undefined,
      };
      return msg;
    } catch {
      return null;
    }
  }, [token, authHeaders]);

  // ==================== XMPP event handlers ====================

  const handleNewXMPPMessage = useCallback((msg: XMPPMessage) => {
    const chatMsg: Message = {
      id:             msg.id,
      conversationId: msg.conversationId,
      senderId:       msg.from.split('@')[0],
      senderName:     msg.from.split('@')[0],
      senderType:     'USER',
      messageType:    msg.messageType || 'TEXT',
      content:        msg.body,
      attachments:    [],
      reactions:      [],
      createdAt:      msg.timestamp.toISOString(),
      status:         'sent',
    };

    // Play sound for messages from other users
    if (chatMsg.senderId !== user?.id) {
      playMessageSound();
    }

    if (activeConvRef.current?.id === msg.conversationId) {
      setMessages(prev => {
        if (prev.find(m => m.id === chatMsg.id)) return prev;
        return [...prev, chatMsg];
      });

      // If the stanza carries a non-text type (IMAGE, FILE, VIDEO, VOICE),
      // XMPP doesn't carry attachment URLs — fetch the full message from
      // REST to hydrate the attachments for the receiver.
      if (chatMsg.messageType !== 'TEXT') {
        const hydrateDelayMs = 800; // give the sender's REST POST time to link attachments
        setTimeout(() => {
          fetchMessageByID(msg.id).then(full => {
            if (!full) return;
            setMessages(prev => prev.map(m => m.id === full.id ? full : m));
          });
        }, hydrateDelayMs);
      }
    }

    setConversations(prev => {
      const found = prev.find(c => c.id === msg.conversationId);
      if (!found) {
        // Unknown conversation — fetch and prepend it so recipient sees it immediately.
        // Async fetch is safe here; React batches the subsequent setConversations update.
        fetchConversationByID(msg.conversationId).then(conv => {
          if (conv) {
            setConversations(list => {
              if (list.find(c => c.id === conv.id)) return list; // already added by SSE path
              return [{ ...conv, lastMessagePreview: msg.body, lastMessageAt: msg.timestamp.toISOString(), unreadCount: chatMsg.senderId !== user?.id ? 1 : 0 }, ...list];
            });
          }
        });
        return prev;
      }
      const updated = prev.map(c => {
        if (c.id === msg.conversationId) {
          return {
            ...c,
            lastMessageAt:      msg.timestamp.toISOString(),
            lastMessagePreview: msg.body,
            unreadCount: activeConvRef.current?.id === msg.conversationId
              ? c.unreadCount
              : c.unreadCount + (chatMsg.senderId !== user?.id ? 1 : 0),
          };
        }
        return c;
      });
      return updated.sort((a, b) =>
        new Date(b.lastMessageAt || b.createdAt).getTime() -
        new Date(a.lastMessageAt || a.createdAt).getTime()
      );
    });

    setTypingUsers(prev => prev.filter(t => t.userId !== chatMsg.senderId));
  }, [user, fetchConversationByID, fetchMessageByID]);

  // ==================== SSE chat_message handler ====================
  // Handles messages delivered via the SSE fallback channel (when XMPP is
  // down, or for the sender's other open tabs). Deduplicates by message ID.

  const handleSSEChatMessage = useCallback((payload: ChatMessagePayload) => {
    const msg: Message = {
      id:             payload.messageId,
      conversationId: payload.conversationId,
      senderId:       payload.senderId,
      senderName:     payload.senderName,
      senderType:     'USER',
      messageType:    payload.messageType || 'TEXT',
      content:        payload.content,
      replyToId:      payload.replyToId,
      replyPreview:   payload.replyToId
        ? (() => {
            const rm = messagesRef.current.find(m => m.id === payload.replyToId);
            return rm ? { id: payload.replyToId, content: rm.content, senderName: rm.senderName } : undefined;
          })()
        : undefined,
      attachments:    (payload.attachments as Attachment[] | undefined) ?? [],
      reactions:      [],
      createdAt:      payload.timestamp,
      status:         payload.status || 'sent',
    };

    // Sound only for messages from other users
    if (msg.senderId !== user?.id) {
      playMessageSound();
    }

    // If this is the active conversation, add message (dedup)
    if (activeConvRef.current?.id === msg.conversationId) {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }

    setConversations(prev => {
      const found = prev.find(c => c.id === msg.conversationId);
      if (!found) {
        // New conversation unknown to this client — fetch and prepend
        fetchConversationByID(msg.conversationId).then(conv => {
          if (conv) {
            setConversations(list => {
              if (list.find(c => c.id === conv.id)) return list;
              return [{ ...conv, lastMessagePreview: msg.content || '', lastMessageAt: msg.createdAt, unreadCount: msg.senderId !== user?.id ? 1 : 0 }, ...list];
            });
          }
        });
        return prev;
      }
      const updated = prev.map(c => {
        if (c.id === msg.conversationId) {
          return {
            ...c,
            lastMessageAt:      msg.createdAt,
            lastMessagePreview: msg.content,
            unreadCount: activeConvRef.current?.id === msg.conversationId
              ? c.unreadCount
              : c.unreadCount + (msg.senderId !== user?.id ? 1 : 0),
          };
        }
        return c;
      });
      return updated.sort((a, b) =>
        new Date(b.lastMessageAt || b.createdAt).getTime() -
        new Date(a.lastMessageAt || a.createdAt).getTime()
      );
    });
  }, [user, fetchConversationByID]);

  const handleXMPPPresence = useCallback((p: XMPPPresence) => {
    const fromUserId = p.from.split('@')[0];
    const online = p.status !== 'offline';
    const lastSeenAt = !online ? new Date().toISOString() : undefined;
    setConversations(prev => prev.map(c => ({
      ...c,
      participants: c.participants.map(pt =>
        pt.userId === fromUserId
          ? { ...pt, online, ...(lastSeenAt ? { lastSeenAt } : {}) }
          : pt
      ),
      otherUser: c.otherUser?.userId === fromUserId
        ? { ...c.otherUser, online, ...(lastSeenAt ? { lastSeenAt } : {}) }
        : c.otherUser,
    })));
  }, []);

  const handleXMPPTyping = useCallback((t: XMPPTyping) => {
    const fromUserId = t.from.split('@')[0];
    // Update typing indicator in conversation list
    setTypingConversationIds(prev => {
      const next = new Set(prev);
      if (t.isTyping) next.add(t.conversationId); else next.delete(t.conversationId);
      return next;
    });
    if (activeConvRef.current?.id !== t.conversationId) return;
    if (t.isTyping) {
      setTypingUsers(prev => {
        if (prev.find(u => u.userId === fromUserId)) return prev;
        return [...prev, { userId: fromUserId, senderName: fromUserId }];
      });
      const key = `${t.conversationId}:${fromUserId}`;
      if (typingTimers.current.has(key)) clearTimeout(typingTimers.current.get(key)!);
      typingTimers.current.set(key, setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== fromUserId));
        setTypingConversationIds(prev => { const n = new Set(prev); n.delete(t.conversationId); return n; });
        typingTimers.current.delete(key);
      }, 5000));
    } else {
      setTypingUsers(prev => prev.filter(u => u.userId !== fromUserId));
    }
  }, []);

  const handleNewMessage = useCallback((event: any) => {
    const msg: Message = {
      id: event.messageId,
      conversationId: event.conversationId,
      senderId: event.senderId,
      senderName: event.senderName,
      senderType: 'USER',
      messageType: event.messageType || 'TEXT',
      content: event.content,
      replyToId: event.replyToId,
      attachments: event.attachments,
      reactions: [],
      createdAt: event.timestamp,
      status: event.status || 'sent',
    };

    // If this is the active conversation, add the message (deduplicate)
    if (activeConvRef.current?.id === event.conversationId) {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }

    // Update conversation list
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === event.conversationId) {
          return {
            ...c,
            lastMessageAt: event.timestamp,
            lastMessagePreview: event.content,
            unreadCount: activeConvRef.current?.id === event.conversationId
              ? c.unreadCount
              : c.unreadCount + (event.senderId !== user?.id ? 1 : 0),
          };
        }
        return c;
      });
      // Sort by last message
      return updated.sort((a, b) =>
        new Date(b.lastMessageAt || b.createdAt).getTime() -
        new Date(a.lastMessageAt || a.createdAt).getTime()
      );
    });

    // Clear typing indicator for this user
    setTypingUsers(prev => prev.filter(t => t.userId !== event.senderId));
  }, [user]);

  const handleTypingEvent = useCallback((event: any, isTyping: boolean) => {
    if (activeConvRef.current?.id !== event.conversationId) return;

    if (isTyping) {
      setTypingUsers(prev => {
        if (prev.find(t => t.userId === event.userId)) return prev;
        return [...prev, { userId: event.userId, senderName: event.senderName }];
      });
      // Auto-clear after 5s if no stop_typing received
      const key = `${event.conversationId}:${event.userId}`;
      if (typingTimers.current.has(key)) {
        clearTimeout(typingTimers.current.get(key)!);
      }
      typingTimers.current.set(key, setTimeout(() => {
        setTypingUsers(prev => prev.filter(t => t.userId !== event.userId));
        typingTimers.current.delete(key);
      }, 5000));
    } else {
      setTypingUsers(prev => prev.filter(t => t.userId !== event.userId));
    }
  }, []);

  const handleMessageRead = useCallback((event: any) => {
    // Update participant's lastReadAt in the conversation
    setConversations(prev => prev.map(c => {
      if (c.id === event.conversationId) {
        return {
          ...c,
          participants: c.participants.map(p =>
            p.userId === event.userId
              ? { ...p, lastReadAt: event.lastReadAt }
              : p
          ),
        };
      }
      return c;
    }));

    // If active conversation, update message statuses
    if (activeConvRef.current?.id === event.conversationId) {
      setMessages(prev => prev.map(m => {
        if (m.senderId === user?.id && m.status !== 'read') {
          return { ...m, status: 'read' };
        }
        return m;
      }));
    }
  }, [user]);

  const handleMessageEdited = useCallback((event: any) => {
    if (activeConvRef.current?.id !== event.conversationId) return;
    setMessages(prev => prev.map(m =>
      m.id === event.messageId
        ? { ...m, content: event.content, editedAt: event.timestamp }
        : m
    ));
  }, []);

  const handleMessageDeleted = useCallback((event: any) => {
    if (activeConvRef.current?.id !== event.conversationId) return;
    setMessages(prev => prev.map(m =>
      m.id === event.messageId
        ? { ...m, content: undefined, deletedAt: event.timestamp }
        : m
    ));
  }, []);

  const handleReactionEvent = useCallback((event: any) => {
    if (activeConvRef.current?.id !== event.conversationId) return;
    const isAdd = event.type === 'reaction_added';

    setMessages(prev => prev.map(m => {
      if (m.id !== event.messageId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === event.emoji);

      if (isAdd) {
        if (idx >= 0) {
          if (!reactions[idx].users.includes(event.userId)) {
            reactions[idx] = {
              ...reactions[idx],
              users: [...reactions[idx].users, event.userId],
              count: reactions[idx].count + 1,
            };
          }
        } else {
          reactions.push({ emoji: event.emoji, users: [event.userId], count: 1 });
        }
      } else {
        if (idx >= 0) {
          const newUsers = reactions[idx].users.filter(u => u !== event.userId);
          if (newUsers.length === 0) {
            reactions.splice(idx, 1);
          } else {
            reactions[idx] = { ...reactions[idx], users: newUsers, count: newUsers.length };
          }
        }
      }

      return { ...m, reactions };
    }));
  }, []);

  const handlePresenceUpdate = useCallback((event: any) => {
    setConversations(prev => prev.map(c => {
      const updatedParticipants = c.participants.map(p =>
        p.userId === event.userId ? { ...p, online: event.online as boolean } : p
      );
      let updatedOtherUser = c.otherUser;
      if (c.otherUser && c.otherUser.userId === event.userId) {
        updatedOtherUser = { ...c.otherUser, online: event.online as boolean };
      }
      return { ...c, participants: updatedParticipants, otherUser: updatedOtherUser };
    }));
  }, []);

  const handleDeliveryReceipt = useCallback((r: XMPPDeliveryReceipt) => {
    setMessages(prev => prev.map(m =>
      m.id === r.messageId && m.status === 'sent'
        ? { ...m, status: 'delivered', deliveredAt: new Date().toISOString() }
        : m
    ));
  }, []);

  // Keep the WS event dispatcher ref always current (avoids stale closures)
  // This is now only used for REST-driven updates (read receipts, edits, deletions).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleWSEvent = (event: any) => {
    switch (event.type) {
      case 'message_read':    handleMessageRead(event);    break;
      case 'message_edited':  handleMessageEdited(event);  break;
      case 'message_deleted': handleMessageDeleted(event); break;
      case 'reaction_added':
      case 'reaction_removed': handleReactionEvent(event); break;
      case 'presence_update': handlePresenceUpdate(event); break;
    }
  };

  // ==================== Actions ====================

  const sendMessage = useCallback(async (content: string, replyToId?: string, attachmentIds?: string[], messageType?: string) => {
    const conv = activeConvRef.current;
    if (!conv) return;
    const mType = messageType || 'TEXT';

    if (xmppClient.isConnected) {
      const msgId = uuidv4();

      if (conv.type === 'DIRECT' && conv.otherUser) {
        xmppClient.sendDirectMessage(conv.otherUser.userId, content, conv.id, msgId, mType);
      } else {
        xmppClient.sendGroupMessage(conv.id, content, msgId);
      }

      const echo: Message = {
        id:             msgId,
        conversationId: conv.id,
        senderId:       user?.id ?? '',
        senderName:     user?.id ?? '',
        senderType:     'USER',
        messageType:    mType,
        content,
        replyToId,
        replyPreview:   replyToId
          ? (() => {
              const rm = messagesRef.current.find(m => m.id === replyToId);
              return rm ? { id: replyToId, content: rm.content, senderName: rm.senderName } : undefined;
            })()
          : undefined,
        attachments:    [],
        reactions:      [],
        createdAt:      new Date().toISOString(),
        status:         'pending',   // ✓ pending until server ACKs
      };
      setMessages(prev => {
        if (prev.find(m => m.id === echo.id)) return prev;
        return [...prev, echo];
      });

      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id === conv.id) {
            return { ...c, lastMessageAt: echo.createdAt, lastMessagePreview: content };
          }
          return c;
        });
        return updated.sort((a, b) =>
          new Date(b.lastMessageAt || b.createdAt).getTime() -
          new Date(a.lastMessageAt || a.createdAt).getTime()
        );
      });

      fetch(`${API_BASE}/api/conversations/${conv.id}/messages`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ messageId: msgId, content, replyToId, attachmentIds, messageType: mType }),
      }).then(async res => {
        if (!res.ok) return;
        // If there are attachments, replace the optimistic echo with the real
        // message from the server (which contains hydrated attachment URLs).
        if (attachmentIds && attachmentIds.length > 0) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const real: any = await res.json();
            const realMsg: Message = {
              id:             real.id ?? msgId,
              conversationId: real.conversationId ?? conv.id,
              senderId:       real.senderId ?? user?.id ?? '',
              senderName:     real.senderName ?? user?.id ?? '',
              senderType:     'USER',
              messageType:    real.messageType ?? mType,
              content:        real.content ?? content,
              replyToId:      real.replyToId ?? replyToId,
              attachments:    (real.attachments ?? []).map((a: any) => ({
                id:           a.id,
                fileName:     a.fileName,
                fileType:     a.fileType,
                fileSize:     a.fileSize,
                url:          a.url,
                thumbnailUrl: a.thumbnailUrl,
              })),
              reactions:      [],
              createdAt:      real.createdAt ?? echo.createdAt,
              status:         real.status ?? 'sent',
            };
            setMessages(prev => prev.map(m => m.id === msgId ? realMsg : m));
          } catch {
            // already displayed as echo — harmless; still mark as sent
            setMessages(prev => prev.map(m => m.id === msgId && m.status === 'pending' ? { ...m, status: 'sent' } : m));
          }
        } else {
          // Text-only message confirmed by server → upgrade pending → sent (✓)
          setMessages(prev => prev.map(m => m.id === msgId && m.status === 'pending' ? { ...m, status: 'sent' } : m));
        }
      }).catch(() => { /* silent */ });
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/conversations/${conv.id}/messages`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ content, replyToId, attachmentIds, messageType: mType }),
        });
        if (!res.ok) throw new Error('send failed');
        const msg = await res.json();
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.id === conv.id) {
              return { ...c, lastMessageAt: msg.createdAt, lastMessagePreview: content };
            }
            return c;
          });
          return updated.sort((a, b) =>
            new Date(b.lastMessageAt || b.createdAt).getTime() -
            new Date(a.lastMessageAt || a.createdAt).getTime()
          );
        });
      } catch {
        // silent
      }
    }
  }, [authHeaders, user]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await fetch(`${API_BASE}/api/messages/${messageId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ content }),
      });
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content, editedAt: new Date().toISOString() } : m
      ));
    } catch { /* silent */ }
  }, [authHeaders]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await fetch(`${API_BASE}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: undefined, deletedAt: new Date().toISOString() } : m
      ));
    } catch { /* silent */ }
  }, [authHeaders]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx >= 0) {
        if (!reactions[idx].users.includes(user?.id || '')) {
          reactions[idx] = {
            ...reactions[idx],
            users: [...reactions[idx].users, user?.id || ''],
            count: reactions[idx].count + 1,
          };
        }
      } else {
        reactions.push({ emoji, users: [user?.id || ''], count: 1 });
      }
      return { ...m, reactions };
    }));
    try {
      await fetch(`${API_BASE}/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ emoji }),
      });
    } catch { /* silent */ }
  }, [authHeaders, user]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx >= 0) {
        const newUsers = reactions[idx].users.filter(u => u !== user?.id);
        if (newUsers.length === 0) {
          reactions.splice(idx, 1);
        } else {
          reactions[idx] = { ...reactions[idx], users: newUsers, count: newUsers.length };
        }
      }
      return { ...m, reactions };
    }));
    try {
      await fetch(`${API_BASE}/api/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    } catch { /* silent */ }
  }, [authHeaders, user]);

  const markAsRead = useCallback(() => {
    if (!activeConvRef.current || !token) return;
    // REST call + WS notification
    fetch(`${API_BASE}/api/conversations/${activeConvRef.current.id}/read`, {
      method: 'POST',
      headers: authHeaders(),
    });
    // Clear local unread
    setConversations(prev => prev.map(c =>
      c.id === activeConvRef.current?.id ? { ...c, unreadCount: 0 } : c
    ));
  }, [token, authHeaders]);

  const typingRef = useRef(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const sendTyping = useCallback((isTyping: boolean) => {
    const conv = activeConvRef.current;
    if (!conv || !xmppClient.isConnected) return;
    if (isTyping && !typingRef.current) {
      typingRef.current = true;
      if (conv.type === 'DIRECT' && conv.otherUser) {
        xmppClient.sendTyping(`${conv.otherUser.userId}@${XMPP_DOMAIN}`, 'chat', true);
      } else {
        xmppClient.sendTyping(`org-${conv.id}@${XMPP_MUC_DOMAIN}`, 'groupchat', true);
      }
      typingTimeout.current = setTimeout(() => {
        typingRef.current = false;
        if (conv.type === 'DIRECT' && conv.otherUser) {
          xmppClient.sendTyping(`${conv.otherUser.userId}@${XMPP_DOMAIN}`, 'chat', false);
        } else {
          xmppClient.sendTyping(`org-${conv.id}@${XMPP_MUC_DOMAIN}`, 'groupchat', false);
        }
      }, 3000);
    } else if (!isTyping && typingRef.current) {
      typingRef.current = false;
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (conv.type === 'DIRECT' && conv.otherUser) {
        xmppClient.sendTyping(`${conv.otherUser.userId}@${XMPP_DOMAIN}`, 'chat', false);
      } else {
        xmppClient.sendTyping(`org-${conv.id}@${XMPP_MUC_DOMAIN}`, 'groupchat', false);
      }
    }
  }, []);

  const createConversation = useCallback(async (participantId: string, message?: string): Promise<Conversation | null> => {
    if (!token || !user) return null;
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: 'DIRECT', participantId, message }),
      });
      if (!res.ok) return null;
      const conv: Conversation = await res.json();
      const enriched = enrichConversation(conv, user.id);

      // Add to or update conversations list
      setConversations(prev => {
        const exists = prev.find(c => c.id === enriched.id);
        if (exists) return prev;
        return [enriched, ...prev];
      });

      return enriched;
    } catch {
      return null;
    }
  }, [token, user, authHeaders]);

  const uploadFile = useCallback(async (file: File): Promise<Attachment | null> => {
    if (!token) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [token]);

  const forwardMessage = useCallback(async (messageId: string, targetConvId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !msg.content) return;
    const targetConv = conversations.find(c => c.id === targetConvId);
    if (!targetConv) return;
    const fwd: Message = {
      id:             uuidv4(),
      conversationId: targetConvId,
      senderId:       user?.id ?? '',
      senderName:     user?.id ?? '',
      senderType:     'USER',
      messageType:    'TEXT',
      content:        msg.content,
      attachments:    [],
      reactions:      [],
      createdAt:      new Date().toISOString(),
      status:         'sent',
      forwardedFrom:  { senderName: msg.senderName },
    };
    if (xmppClient.isConnected && targetConv.type === 'DIRECT' && targetConv.otherUser) {
      xmppClient.sendDirectMessage(targetConv.otherUser.userId, msg.content, targetConvId, fwd.id);
    }
    try {
      await fetch(`${API_BASE}/api/conversations/${targetConvId}/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messageId: fwd.id, content: msg.content, forwardedFrom: { senderName: msg.senderName } }),
      });
    } catch { /* silent */ }
    if (activeConvRef.current?.id === targetConvId) {
      setMessages(prev => [...prev, fwd]);
    }
  }, [messages, conversations, user, authHeaders]);

  const starMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, starred: !m.starred } : m
    ));
  }, []);

  const pinMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, pinned: !m.pinned } : m
    ));
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!activeConvRef.current || messages.length === 0) return;
    const oldest = messages[0];
    const older = await fetchMessages(activeConvRef.current.id, oldest.createdAt);
    if (older.length > 0) {
      setMessages(prev => [...older, ...prev]);
    }
  }, [messages, fetchMessages]);

  // ==================== Set Active Conversation ====================

  const setActiveConversation = useCallback(async (conv: Conversation | null) => {
    setActiveConversationState(conv);
    setMessages([]);
    setTypingUsers([]);

    if (conv) {
      const msgs = await fetchMessages(conv.id);
      setMessages(msgs);
      // Mark as read
      if (conv.unreadCount > 0) {
        fetch(`${API_BASE}/api/conversations/${conv.id}/read`, {
          method: 'POST',
          headers: authHeaders(),
        });
        setConversations(prev => prev.map(c =>
          c.id === conv.id ? { ...c, unreadCount: 0 } : c
        ));
      }
    }
  }, [fetchMessages, authHeaders]);

  // ==================== Effects ====================

  // Fetch conversations once auth is resolved
  useEffect(() => {
    if (isAuthLoading) return;
    fetchConversations();
  }, [fetchConversations, isAuthLoading]);

  // Subscribe to SSE-delivered chat messages (fallback / backup to XMPP).
  // This fires for every message persisted via REST, ensuring delivery even
  // when the recipient's XMPP connection is temporarily down.
  useEffect(() => {
    return onChatMessage(handleSSEChatMessage);
  }, [onChatMessage, handleSSEChatMessage]);

  // ── Presence: heartbeat + SSE listener + initial poll ─────────────────────
  // Instead of a raw WebSocket to port 4000 (which is blocked by firewalls /
  // Tailscale), we use two standard HTTP mechanisms:
  //   1. POST /api/presence/heartbeat every 45 s  →  keeps THIS user "online" in Redis
  //   2. onPresenceUpdate (SSE)                   →  notified when peers go online/offline
  //   3. GET /api/presence?ids=…                  →  initial snapshot after conversations load

  // 1. Heartbeat
  useEffect(() => {
    if (!token) return;
    const doHeartbeat = () =>
      fetch(`${API_BASE}/api/presence/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    doHeartbeat(); // immediate on mount
    const timer = setInterval(doHeartbeat, 45_000);
    return () => clearInterval(timer);
  }, [token]);

  // 2. SSE presence events
  useEffect(() => {
    return onPresenceUpdate((p: PresencePayload) => handlePresenceUpdate(p));
  }, [onPresenceUpdate, handlePresenceUpdate]);

  // 2b. SSE read receipt events (supplements WebSocket read receipts)
  useEffect(() => {
    return onMessageRead((p: MessageReadPayload) => handleMessageRead({
      conversationId: p.conversationId,
      userId: p.readByUserId,
      lastReadAt: p.lastReadAt,
      messageId: p.messageId,
    }));
  }, [onMessageRead, handleMessageRead]);

  // 3. Initial presence snapshot once conversations are loaded
  useEffect(() => {
    if (!token || conversations.length === 0) return;
    const peerIds = conversations
      .filter(c => c.type === 'DIRECT' && c.otherUser?.userId)
      .map(c => c.otherUser!.userId);
    if (peerIds.length === 0) return;
    fetch(`${API_BASE}/api/presence?ids=${peerIds.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: Record<string, { online: boolean; lastSeen: string }> | null) => {
        if (!data) return;
        Object.entries(data).forEach(([userId, info]) => {
          handlePresenceUpdate({ type: 'presence_update', userId, online: info.online });
        });
      })
      .catch(() => {});
  // Run once after initial conversations load (isLoadingConversations flips false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingConversations]);

  // Connect WebSocket for non-chat streams (notifications, SSE) –
  // real-time chat messages now come via ejabberd / XMPP-WS.
  useEffect(() => {
    if (!xmppJid || !xmppToken) return;

    const onMessage  = (msg: XMPPMessage)    => handleNewXMPPMessage(msg);
    const onPresence = (p:   XMPPPresence)   => handleXMPPPresence(p);
    const onTyping   = (t:   XMPPTyping)     => handleXMPPTyping(t);
    const onStatus   = (online: boolean) => {
      setIsConnected(online);
      if (online) {
        if (hasConnectedOnce.current) setIsReconnecting(false);
        hasConnectedOnce.current = true;
        // Probe presence for all DIRECT conversation peers to get live status
        conversationsRef.current
          .filter(c => c.type === 'DIRECT' && c.otherUser?.userId)
          .forEach(c => xmppClient.sendPresenceProbe(c.otherUser!.userId));
      } else if (hasConnectedOnce.current) {
        setIsReconnecting(true);
      }
    };

    const onReceipt = (r: XMPPDeliveryReceipt) => handleDeliveryReceipt(r);

    xmppClient.onMessage(onMessage);
    xmppClient.onPresence(onPresence);
    xmppClient.onTyping(onTyping);
    xmppClient.onStatusChange(onStatus);
    xmppClient.onDeliveryReceipt(onReceipt);

    xmppClient.connect(xmppJid, xmppToken).catch(async (err) => {
      const msg = String(err?.message ?? err).toLowerCase();
      const isBackendUnavailable = msg.includes('econnerror') || msg.includes('backend unavailable') || msg.includes('connection refused');
      if (isBackendUnavailable) {
        // Local/dev fallback: chat backend is down, keep app usable and avoid noisy hard errors.
        setIsConnected(false);
        setIsReconnecting(false);
        console.warn('[chat] xmpp backend unavailable');
        return;
      }
      console.error('[chat] xmpp connect failed', err);
      // If ejabberd rejects our credentials the XMPP token is expired/invalid.
      // Attempt a token refresh to get fresh XMPP credentials — the refresh
      // endpoint returns a new xmppToken which updates auth-context state,
      // re-triggering this effect with valid credentials.
      const rawMsg = String(err?.message ?? err);
      if (rawMsg.includes('not-authorized') || rawMsg.includes('not authorized')) {
        const ok = await refreshAccessToken();
        if (!ok) {
          // Refresh also failed — clear stale tokens; user must re-login.
          localStorage.removeItem('xmppToken');
          localStorage.removeItem('xmppJid');
        }
      }
    });

    return () => {
      xmppClient.offMessage(onMessage);
      xmppClient.offPresence(onPresence);
      xmppClient.offTyping(onTyping);
      xmppClient.offStatusChange(onStatus);
      xmppClient.offDeliveryReceipt(onReceipt);
      xmppClient.disconnect();
    };
  }, [xmppJid, xmppToken, refreshAccessToken, handleNewXMPPMessage, handleXMPPPresence, handleXMPPTyping, handleDeliveryReceipt]);

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      messages,
      typingUsers,
      typingConversationIds,
      isConnected,
      isReconnecting,
      isLoadingConversations,
      isLoadingMessages,
      setActiveConversation,
      sendMessage,
      editMessage,
      deleteMessage,
      addReaction,
      removeReaction,
      markAsRead,
      sendTyping,
      createConversation,
      uploadFile,
      loadMoreMessages,
      refreshConversations: fetchConversations,
      forwardMessage,
      starMessage,
      pinMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}

// ==================== Helpers ====================

function enrichConversation(conv: Conversation, currentUserId: string): Conversation {
  if (conv.type === 'DIRECT') {
    const other = conv.participants.find(p => p.userId !== currentUserId);
    return {
      ...conv,
      name: other?.fullName || other?.username || 'Unknown',
      otherUser: other,
    };
  }
  return conv;
}
