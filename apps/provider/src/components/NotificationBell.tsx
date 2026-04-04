'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, PhoneCall, MessageSquare, Send, FileText, Webhook, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, AppNotification } from '@/contexts/NotificationContext';

// ─── Event Type Icons ──────────────────────────────────

const EVENT_ICONS: Record<string, typeof Bell> = {
  callback_created: PhoneCall,
  callback_updated: PhoneCall,
  notification_delivered: Send,
  notification_read: Check,
  message_received: MessageSquare,
  campaign_progress: Send,
  document_shared: FileText,
  webhook_delivery: Webhook,
  team_update: Users,
};

const EVENT_COLORS: Record<string, string> = {
  callback_created: 'text-accent-orange bg-accent-orange/10',
  callback_updated: 'text-accent-blue bg-accent-blue/10',
  notification_delivered: 'text-status-success bg-status-success/10',
  notification_read: 'text-text-muted bg-bg-hover',
  message_received: 'text-accent-purple bg-accent-purple/10',
  campaign_progress: 'text-accent-cyan bg-accent-cyan/10',
  document_shared: 'text-accent-blue bg-accent-blue/10',
  webhook_delivery: 'text-text-secondary bg-bg-hover',
  team_update: 'text-accent-green bg-accent-green/10',
};

// ─── Time Formatting ───────────────────────────────────

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Notification Item ─────────────────────────────────

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: () => void;
}) {
  const Icon = EVENT_ICONS[notification.eventType] || Bell;
  const colorClass = EVENT_COLORS[notification.eventType] || 'text-text-muted bg-bg-hover';

  return (
    <button
      onClick={onRead}
      className={cn(
        'flex items-start gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-bg-hover',
        !notification.read && 'bg-accent-blue/5',
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-xs font-medium truncate', notification.read ? 'text-text-secondary' : 'text-text-primary')}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-[11px] text-text-muted truncate mt-0.5">{notification.body}</p>
        )}
        <p className="text-[10px] text-text-muted mt-1">{timeAgo(notification.timestamp)}</p>
      </div>
    </button>
  );
}

// ─── NotificationBell ──────────────────────────────────

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors relative"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-status-error text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-bg-card border border-border-primary rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue text-[10px] font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-status-error/5 transition-colors"
                  title="Clear all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center mb-3">
                  <Bell size={20} className="text-text-muted" />
                </div>
                <p className="text-sm text-text-secondary font-medium">No notifications yet</p>
                <p className="text-xs text-text-muted mt-1">Real-time updates will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border-primary">
                {notifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onRead={() => markAsRead(notif.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
