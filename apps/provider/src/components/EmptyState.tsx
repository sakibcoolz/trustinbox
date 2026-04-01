import Link from 'next/link';
import { cn } from '@/lib/utils';

// --- Types ---
interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string };
  secondaryAction?: { label: string; onClick: () => void };
}

// --- Component ---
export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-bg-hover flex items-center justify-center mb-4">
        <Icon size={48} className="text-text-muted" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>

      {/* Description */}
      <p className="text-sm text-text-secondary max-w-sm">{description}</p>

      {/* Actions */}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}

      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="mt-3 text-xs text-text-secondary hover:text-text-link transition-colors"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
