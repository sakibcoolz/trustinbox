import { cn } from '@/lib/utils';

// --- Base Skeleton ---
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-md', className)} {...props} />;
}

// --- KPI Card Skeleton ---
export function SkeletonKPI() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-16 mb-2" />
      <Skeleton className="h-2.5 w-24" />
    </div>
  );
}

// --- Table Skeleton ---
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border-primary overflow-hidden">
      {/* Header */}
      <div className="bg-bg-secondary flex gap-4 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" style={{ maxWidth: `${60 + (i % 3) * 40}px` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 px-4 py-3 border-t border-border-primary">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="h-3 flex-1"
              style={{ maxWidth: `${80 + ((colIdx + rowIdx) % 3) * 30}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- Chart Skeleton ---
export function SkeletonChart() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${20 + Math.random() * 80}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// --- Text Block Skeleton ---
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}

// --- Avatar Skeleton ---
export function SkeletonAvatar({ size = 32 }: { size?: number }) {
  return <Skeleton className="rounded-full shrink-0" style={{ width: size, height: size }} />;
}

// --- List Item Skeleton ---
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-2">
      <SkeletonAvatar size={40} />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-48" />
      </div>
    </div>
  );
}

// --- Card Skeleton ---
export function SkeletonCard() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}
