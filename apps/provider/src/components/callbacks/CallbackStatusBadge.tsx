'use client';

import { Clock, CheckCircle2, XCircle, Calendar, AlertCircle } from 'lucide-react';
import { CallbackRequestStatus } from '@/lib/graphql/callbacks';

const statusConfig: Record<CallbackRequestStatus, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  PENDING:     { label: 'Pending',     icon: Clock,        color: 'bg-status-warning/10 text-status-warning' },
  APPROVED:    { label: 'Approved',    icon: CheckCircle2, color: 'bg-status-success/10 text-status-success' },
  REJECTED:    { label: 'Rejected',    icon: XCircle,      color: 'bg-status-error/10 text-status-error' },
  RESCHEDULED: { label: 'Rescheduled', icon: Calendar,     color: 'bg-accent-blue/10 text-accent-blue' },
  EXPIRED:     { label: 'Expired',     icon: AlertCircle,  color: 'bg-border-secondary text-text-muted' },
};

interface CallbackStatusBadgeProps {
  status: CallbackRequestStatus;
}

export default function CallbackStatusBadge({ status }: CallbackStatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon size={12} /> {config.label}
    </span>
  );
}
