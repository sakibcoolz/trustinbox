'use client';

import { RefreshCw, CheckCircle, XCircle, Clock, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { useNotificationDetail, useRetryNotification, type NotificationDetail } from '@/lib/graphql/notifications';
import { usePermission } from '@/hooks/usePermission';
import { formatRelativeTime } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

interface NotificationDetailPanelProps {
  notificationId: string;
}

export function NotificationDetailPanel({ notificationId }: NotificationDetailPanelProps) {
  const { data, loading } = useNotificationDetail(notificationId);
  const { retry, loading: retrying } = useRetryNotification();
  const canRetry = usePermission('notifications:send');

  const notification = data?.notification;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!notification) return <p className="text-sm text-text-muted">No details available</p>;

  return (
    <div className="space-y-4">
      {/* Full Body */}
      <div>
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Content</h4>
        <div className="p-3 bg-bg-primary rounded-lg">
          <p className="text-sm font-medium text-text-primary">{notification.title}</p>
          <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{notification.body}</p>
        </div>
      </div>

      {/* Recipient */}
      <div>
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Recipient</h4>
        <Link
          href={`/customers/${notification.recipientVirtualId}`}
          className="text-sm text-accent-blue hover:underline font-mono"
        >
          {notification.recipientVirtualId}
        </Link>
      </div>

      {/* Delivery Attempts Timeline */}
      {notification.deliveryAttempts && notification.deliveryAttempts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Delivery Attempts</h4>
          <div className="flex items-center gap-2">
            {notification.deliveryAttempts.map((attempt) => {
              const isSuccess = attempt.status === 'DELIVERED';
              const isFailed = attempt.status === 'FAILED';
              const isPending = attempt.status === 'PENDING';
              return (
                <div key={attempt.attemptNumber} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                      isSuccess
                        ? 'bg-status-success/20 text-status-success'
                        : isFailed
                        ? 'bg-status-error/20 text-status-error'
                        : 'bg-status-warning/20 text-status-warning'
                    }`}
                  >
                    {attempt.attemptNumber}
                  </div>
                  <div className="text-xs">
                    <StatusBadge status={attempt.status} />
                    <span className="text-text-muted ml-1">{formatRelativeTime(attempt.timestamp)}</span>
                    {attempt.errorMessage && (
                      <p className="text-[10px] text-status-error mt-0.5">{attempt.errorMessage}</p>
                    )}
                  </div>
                  {attempt.attemptNumber < notification.deliveryAttempts.length && (
                    <span className="w-4 h-px bg-border-primary" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Policy Decision */}
      {notification.policyDecision && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Policy Decision</h4>
          <div
            className={`flex items-start gap-2 p-3 rounded-lg ${
              notification.policyDecision.allowed
                ? 'bg-status-success/10 border border-status-success/20'
                : 'bg-status-error/10 border border-status-error/20'
            }`}
          >
            {notification.policyDecision.allowed ? (
              <CheckCircle size={14} className="text-status-success mt-0.5 shrink-0" />
            ) : (
              <XCircle size={14} className="text-status-error mt-0.5 shrink-0" />
            )}
            <div>
              <p
                className={`text-xs font-medium ${
                  notification.policyDecision.allowed ? 'text-status-success' : 'text-status-error'
                }`}
              >
                {notification.policyDecision.allowed ? 'Allowed' : `Blocked: ${notification.policyDecision.decisionCode}`}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{notification.policyDecision.reason}</p>
              {notification.policyDecision.appliedRules.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {notification.policyDecision.appliedRules.map((rule) => (
                    <span
                      key={rule}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        notification.policyDecision.allowed
                          ? 'bg-status-success/10 text-status-success'
                          : 'bg-status-error/10 text-status-error'
                      }`}
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {notification.metadata && Object.keys(notification.metadata).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Metadata</h4>
          <pre className="p-3 bg-bg-primary rounded-lg text-[11px] text-text-secondary overflow-x-auto">
            {JSON.stringify(notification.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* Retry Action (5.5) */}
      {notification.status === 'FAILED' && canRetry && (
        <div className="pt-2 border-t border-border-primary">
          <button
            onClick={() => retry(notification.id)}
            disabled={retrying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
          >
            {retrying ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Retry Delivery
          </button>
        </div>
      )}
    </div>
  );
}
