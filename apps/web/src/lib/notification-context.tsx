'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: Toast[];
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  dismissToast: (id: string) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  onFriendEvent: (cb: () => void) => () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const friendListenersRef = useRef<Set<() => void>>(new Set());

  const onFriendEvent = useCallback((cb: () => void) => {
    friendListenersRef.current.add(cb);
    return () => { friendListenersRef.current.delete(cb); };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
    if (token) fetchNotifications();
  }, [token, fetchNotifications]);

  // SSE real-time connection
  useEffect(() => {
    if (!token || !user) return;

    const es = new EventSource(`${API_BASE}/api/notifications/stream?token=${token}`);
    eventSourceRef.current = es;

    es.addEventListener('notification', (event) => {
      try {
        const notif: Notification = JSON.parse(event.data);
        setNotifications((prev) => [notif, ...prev]);
        
        // Show toast for the notification
        const toastType = notif.type === 'FRIEND_ACCEPTED' ? 'success' : 'info';
        addToast({ type: toastType, title: notif.title, body: notif.body });

        // Notify friend listeners so friends list can refresh
        if (notif.type === 'FRIEND_ACCEPTED' || notif.type === 'FRIEND_REQUEST') {
          friendListenersRef.current.forEach((cb) => cb());
        }
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      // EventSource will auto-reconnect
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [token, user, addToast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, toasts, fetchNotifications, markAllRead, markRead, dismissToast, addToast, onFriendEvent }}
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
