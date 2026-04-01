import { cn } from '@/lib/utils';

// --- Variant Styles ---
const VARIANTS = {
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  error: 'bg-status-error/10 text-status-error',
  info: 'bg-status-info/10 text-status-info',
  neutral: 'bg-bg-hover text-text-secondary',
  purple: 'bg-accent-purple/10 text-accent-purple',
  cyan: 'bg-accent-cyan/10 text-accent-cyan',
} as const;

const DOT_COLORS = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
  info: 'bg-status-info',
  neutral: 'bg-text-muted',
  purple: 'bg-accent-purple',
  cyan: 'bg-accent-cyan',
} as const;

const SIZES = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
} as const;

// --- Status → Variant Map ---
const STATUS_MAP: Record<string, keyof typeof VARIANTS> = {
  DELIVERED: 'success',
  ACTIVE: 'success',
  VERIFIED: 'success',
  COMPLETED: 'success',
  CONNECTED: 'success',
  RESOLVED: 'success',
  PENDING: 'warning',
  SCHEDULED: 'warning',
  RECONNECTING: 'warning',
  QUEUED: 'cyan',
  RATE_LIMITED: 'cyan',
  FAILED: 'error',
  REJECTED: 'error',
  EXPIRED: 'error',
  DISCONNECTED: 'error',
  DENIED: 'error',
  IN_PROGRESS: 'info',
  PROCESSING: 'info',
  OPEN: 'info',
  SENT: 'info',
  DRAFT: 'neutral',
  ARCHIVED: 'neutral',
  PAUSED: 'neutral',
  BLOCKED: 'neutral',
  INACTIVE: 'neutral',
};

export function getStatusVariant(status: string): keyof typeof VARIANTS {
  return STATUS_MAP[status] || 'neutral';
}

// --- Types ---
interface BadgeProps {
  variant: keyof typeof VARIANTS;
  children: React.ReactNode;
  dot?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}

// --- Components ---
export function Badge({ variant, children, dot, size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = getStatusVariant(status);
  const label = status.replace(/_/g, ' ');
  return <Badge variant={variant} dot>{label}</Badge>;
}
