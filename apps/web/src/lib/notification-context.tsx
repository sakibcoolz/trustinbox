'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast-context';
import { playNotificationSoundDebounced } from '@/lib/sounds';
import { showBrowserNotification, registerServiceWorker } from '@/lib/push-notifications';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
  suppressed?: boolean;
  soundEnabled?: boolean;
  entityId?: string;
}

/** Payload pushed via SSE when a chat message is persisted server-side.
 *  Shape matches the wsOutgoing struct in the Go gateway. */
export interface ChatMessagePayload {
  type:           string;   // "new_message"
  conversationId: string;
  messageId:      string;
  senderId:       string;
  senderName:     string;
  content:        string;
  replyToId?:     string;
  timestamp:      string;
  messageType:    string;
  status:         string;
  attachments?:   unknown[];
}

export interface PresencePayload {
  type:   string;
  userId: string;
  online: boolean;
}

export interface MessageReadPayload {
  conversationId: string;
  readByUserId:   string;
  lastReadAt:     string;
  messageId:      string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  onFriendEvent: (cb: () => void) => () => void;
  /** Register a listener for SSE-pushed chat messages (new_message events). */
  onChatMessage: (cb: (msg: ChatMessagePayload) => void) => () => void;
  /** Register a listener for SSE-pushed presence updates. */
  onPresenceUpdate: (cb: (p: PresencePayload) => void) => () => void;
  /** Register a listener for SSE-pushed read receipts. */
  onMessageRead: (cb: (p: MessageReadPayload) => void) => () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const { info: toastInfo, success: toastSuccess } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const friendListenersRef   = useRef<Set<() => void>>(new Set());
  const chatMsgListenersRef  = useRef<Set<(msg: ChatMessagePayload) => void>>(new Set());
  const presenceListenersRef = useRef<Set<(p: PresencePayload) => void>>(new Set());
  const messageReadListenersRef = useRef<Set<(p: MessageReadPayload) => void>>(new Set());

  const onFriendEvent = useCallback((cb: () => void) => {
    friendListenersRef.current.add(cb);
    return () => { friendListenersRef.current.delete(cb); };
  }, []);

  const onChatMessage = useCallback((cb: (msg: ChatMessagePayload) => void) => {
    chatMsgListenersRef.current.add(cb);
    return () => { chatMsgListenersRef.current.delete(cb); };
  }, []);

  const onPresenceUpdate = useCallback((cb: (p: PresencePayload) => void) => {
    presenceListenersRef.current.add(cb);
    return () => { presenceListenersRef.current.delete(cb); };
  }, []);

  const onMessageRead = useCallback((cb: (p: MessageReadPayload) => void) => {
    messageReadListenersRef.current.add(cb);
    return () => { messageReadListenersRef.current.delete(cb); };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  }, [token]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    } catch {
      // silently fail
    }
  }, [token]);

  // Fetch notifications on mount + when token changes
  useEffect(() => {
    if (isAuthLoading) return;
    if (token) fetchNotifications();
  }, [token, fetchNotifications, isAuthLoading]);

  // Register service worker for push notifications
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // SSE real-time connection
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthLoading || !token || !user) return;

    let retryDelay = 3000;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const es = new EventSource(`${API_BASE}/api/notifications/stream?token=${token}`);
      eventSourceRef.current = es;

      es.addEventListener('notification', (event) => {
        try {
          const notif: Notification = JSON.parse(event.data);
          setNotifications((prev) => [notif, ...prev]);

          // If DND-suppressed, skip toast and sound
          if (notif.suppressed) {
            // Still add to list (above), just don't alert
            if (notif.type === 'FRIEND_ACCEPTED' || notif.type === 'FRIEND_REQUEST') {
              friendListenersRef.current.forEach((cb) => cb());
            }
            return;
          }

          if (notif.type === 'FRIEND_ACCEPTED') {
            toastSuccess(notif.title, notif.body);
          } else {
            toastInfo(notif.title, notif.body);
          }

          // Play sound only if not suppressed and sound is enabled
          const shouldPlaySound = notif.soundEnabled !== false;
          if (!document.hidden && shouldPlaySound) {
            playNotificationSoundDebounced();
          } else if (document.hidden) {
            // Show browser notification when tab is hidden
            showBrowserNotification(notif.title, notif.body || '', notif.id);
          }

          if (notif.type === 'FRIEND_ACCEPTED' || notif.type === 'FRIEND_REQUEST') {
            friendListenersRef.current.forEach((cb) => cb());
          }
        } catch {
          // ignore parse errors
        }
      });

      // Real-time chat message delivery via SSE (fallback / backup to XMPP).
      // The chat-context deduplicates by message ID so double delivery is safe.
      es.addEventListener('chat_message', (event) => {
        try {
          const msg: ChatMessagePayload = JSON.parse(event.data);
          chatMsgListenersRef.current.forEach((cb) => cb(msg));
        } catch {
          // ignore parse errors
        }
      });

      // Real-time presence updates pushed by the gateway when friends go online/offline.
      es.addEventListener('presence_update', (event) => {
        try {
          const p: PresencePayload = JSON.parse(event.data);
          presenceListenersRef.current.forEach((cb) => cb(p));
        } catch {
          // ignore parse errors
        }
      });

      // Read receipts — when the other party reads messages in a conversation.
      es.addEventListener('message_read', (event) => {
        try {
          const p: MessageReadPayload = JSON.parse(event.data);
          messageReadListenersRef.current.forEach((cb) => cb(p));
        } catch {
          // ignore parse errors
        }
      });

      // Reset backoff once connected (first message received or open fires)
      es.addEventListener('open', () => { retryDelay = 3000; });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (!destroyed) {
          // Back off up to 30 s to avoid hammering the server
          retryTimerRef.current = setTimeout(() => connect(), retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [token, user, toastInfo, toastSuccess, isAuthLoading]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, fetchNotifications, markAllRead, markRead, onFriendEvent, onChatMessage, onPresenceUpdate, onMessageRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
