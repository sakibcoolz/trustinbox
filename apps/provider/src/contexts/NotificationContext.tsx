'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSSE, SSEEvent, SSEStatus } from '@/lib/hooks/useSSE';

// ─── Types ──────────────────────────────────────────────

export interface AppNotification {
  id: string;
  eventType: string;
  title: string;
  body?: string;
  entityId?: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  status: SSEStatus;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

// ─── Event → Notification Mapping ──────────────────────

const EVENT_LABELS: Record<string, { title: string; body?: string }> = {
  callback_created: { title: 'New Callback Request', body: 'A customer has requested a callback.' },
  callback_updated: { title: 'Callback Updated', body: 'A callback request status has changed.' },
  notification_delivered: { title: 'Notification Delivered', body: 'A notification was delivered to a customer.' },
  notification_read: { title: 'Notification Read', body: 'A customer read your notification.' },
  message_received: { title: 'New Message', body: 'A new message has been received.' },
  campaign_progress: { title: 'Campaign Update', body: 'Your campaign status has been updated.' },
  document_shared: { title: 'Document Shared', body: 'A document was shared.' },
  webhook_delivery: { title: 'Webhook Delivery', body: 'A webhook delivery event occurred.' },
  team_update: { title: 'Team Update', body: 'Your team has been updated.' },
};

function mapEventToNotification(event: SSEEvent): AppNotification | null {
  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const labels = EVENT_LABELS[event.type];
  if (!labels) return null;

  // Build the title from event payload if available, else use default
  const title = (data.title as string) ||
    (data.reason as string) ||
    labels.title;

  const body = (data.body as string) ||
    (data.details as string) ||
    (data.status ? `Status: ${data.status}` : undefined) ||
    labels.body;

  return {
    id: (data.id as string) || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType: event.type,
    title,
    body,
    entityId: data.entityId as string | undefined,
    timestamp: (data.timestamp as string) || new Date().toISOString(),
    read: false,
    data,
  };
}

// ─── Sound ──────────────────────────────────────────────

const NOTIFICATION_SOUND_EVENTS = new Set([
  'callback_created',
  'callback_updated',
  'notification_delivered',
  'message_received',
]);

function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a short, pleasant notification tone using AudioContext
    // This avoids needing a sound asset file
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new AudioContext();
      const duration = 0.15;
      const sampleRate = audioCtx.sampleRate;
      const length = sampleRate * duration * 2; // two tones
      const buffer = audioCtx.createBuffer(1, Math.ceil(length), sampleRate);
      const channel = buffer.getChannelData(0);

      // Tone 1: 880Hz for 150ms
      for (let i = 0; i < sampleRate * duration; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 12);
        channel[i] = Math.sin(2 * Math.PI * 880 * t) * envelope * 0.3;
      }
      // Tone 2: 1175Hz for 150ms (higher pitch, pleasant ding)
      const offset = Math.ceil(sampleRate * duration);
      for (let i = 0; i < sampleRate * duration; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 10);
        channel[offset + i] = Math.sin(2 * Math.PI * 1175 * t) * envelope * 0.3;
      }

      // Encode buffer to WAV for HTMLAudioElement playback
      const wavBlob = audioBufferToWav(buffer);
      const url = URL.createObjectURL(wavBlob);
      audioRef.current = new Audio(url);
      audioRef.current.volume = 0.5;

      audioCtx.close();
    } catch {
      // AudioContext not available — sound will be silently skipped
    }
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser may block audio before user interaction — silently ignore
      });
    }
  }, []);

  return play;
}

/** Minimal WAV encoder for a mono AudioBuffer */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;
  const data = buffer.getChannelData(0);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = data.length * (bitsPerSample / 8);
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < data.length; i++, offset += 2) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// ─── Context Provider ───────────────────────────────────

const MAX_NOTIFICATIONS = 50;

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const playSound = useNotificationSound();

  const onEvent = useCallback(
    (event: SSEEvent) => {
      const notif = mapEventToNotification(event);
      if (!notif) return;

      setNotifications((prev) => {
        const next = [notif, ...prev];
        return next.length > MAX_NOTIFICATIONS ? next.slice(0, MAX_NOTIFICATIONS) : next;
      });

      // Play sound for important events
      if (NOTIFICATION_SOUND_EVENTS.has(event.type)) {
        playSound();
      }
    },
    [playSound],
  );

  const { status } = useSSE(onEvent);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, status, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
