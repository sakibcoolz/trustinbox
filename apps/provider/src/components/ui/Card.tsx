import { cn } from '@/lib/utils';

// --- Variants & Padding ---
const VARIANTS = {
  default: 'bg-bg-card border border-border-primary',
  elevated: 'bg-bg-elevated border border-border-secondary shadow-lg',
  interactive: 'bg-bg-card border border-border-primary hover:border-border-secondary hover:shadow-md cursor-pointer transition-all',
  outlined: 'bg-transparent border border-border-primary',
} as const;

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const;

// --- Types ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof VARIANTS;
  padding?: keyof typeof PADDING;
  noBorder?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// --- Components ---
export function Card({ variant = 'default', padding = 'none', noBorder, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl',
        VARIANTS[variant],
        PADDING[padding],
        noBorder && 'border-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-6 py-4 border-b border-border-primary', className)} {...props}>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-border-primary', className)} {...props}>
      {children}
    </div>
  );
}
