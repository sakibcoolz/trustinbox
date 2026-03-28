'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

// ==================== Types ====================

export interface Participant {
  userId: string;
  username: string;
  fullName: string;
  online: boolean;
  role: string;
  lastReadAt?: string;
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
  messageType: string;
  content?: string;
  replyToId?: string;
  replyPreview?: ReplyPreview;
  attachments?: Attachment[];
  reactions?: Reaction[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  status: string;
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
  isConnected: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (content: string, replyToId?: string, attachmentIds?: string[]) => void;
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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const activeConvRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // ==================== API Helpers ====================

  const authHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, [token]);

  // ==================== Fetch Conversations ====================

  const fetchConversations = useCallback(async () => {
    if (!token || !user) return;
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

  // ==================== WebSocket Connection ====================

  // Use a ref for the WS event dispatcher so the onmessage closure never goes stale
  const handleWSEventRef = useRef<(data: any) => void>(() => {});

  const connectWebSocket = useCallback(() => {
    if (!token || !user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE}/api/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWSEventRef.current(data);
      } catch {
        // ignore malformed messages
      }
    };
  }, [token, user]);

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

    // If this is the active conversation, add the message
    if (activeConvRef.current?.id === event.conversationId) {
      setMessages(prev => [...prev, msg]);
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

  // Keep the WS event dispatcher ref always current (avoids stale closures)
  handleWSEventRef.current = (event: any) => {
    switch (event.type) {
      case 'new_message':
        handleNewMessage(event);
        break;
      case 'typing':
        handleTypingEvent(event, true);
        break;
      case 'stop_typing':
        handleTypingEvent(event, false);
        break;
      case 'message_read':
        handleMessageRead(event);
        break;
      case 'message_edited':
        handleMessageEdited(event);
        break;
      case 'message_deleted':
        handleMessageDeleted(event);
        break;
      case 'reaction_added':
      case 'reaction_removed':
        handleReactionEvent(event);
        break;
      case 'presence_update':
        handlePresenceUpdate(event);
        break;
    }
  };

  // ==================== Actions ====================

  const wsSend = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendMessage = useCallback((content: string, replyToId?: string, attachmentIds?: string[]) => {
    if (!activeConvRef.current) return;
    wsSend({
      type: 'send_message',
      conversationId: activeConvRef.current.id,
      content,
      replyToId,
      attachmentIds,
    });
  }, [wsSend]);

  const editMessage = useCallback((messageId: string, content: string) => {
    wsSend({ type: 'edit_message', messageId, content });
  }, [wsSend]);

  const deleteMessage = useCallback((messageId: string) => {
    wsSend({ type: 'delete_message', messageId });
  }, [wsSend]);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    wsSend({ type: 'add_reaction', messageId, emoji });
  }, [wsSend]);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    wsSend({ type: 'remove_reaction', messageId, emoji });
  }, [wsSend]);

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
    if (!activeConvRef.current) return;
    if (isTyping && !typingRef.current) {
      typingRef.current = true;
      wsSend({ type: 'typing', conversationId: activeConvRef.current.id });
      // Auto-stop after 3s
      typingTimeout.current = setTimeout(() => {
        typingRef.current = false;
        wsSend({ type: 'stop_typing', conversationId: activeConvRef.current?.id });
      }, 3000);
    } else if (!isTyping && typingRef.current) {
      typingRef.current = false;
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      wsSend({ type: 'stop_typing', conversationId: activeConvRef.current.id });
    }
  }, [wsSend]);

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

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Connect WebSocket
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      messages,
      typingUsers,
      isConnected,
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
