'use client';

import { type LucideIcon } from 'lucide-react';

const SIZES = {
  sm: { wrapper: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5', padding: 'py-8 px-4' },
  md: { wrapper: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6', padding: 'py-12 px-4' },
  lg: { wrapper: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8', padding: 'py-16 px-4' },
} as const;

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  size?: keyof typeof SIZES;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, size = 'md', className = '' }: EmptyStateProps) {
  const s = SIZES[size];
  return (
    <div className={`flex flex-col items-center justify-center text-center ${s.padding} ${className}`}>
      <div className={`${s.wrapper} bg-bg-tertiary flex items-center justify-center mb-3`}>
        <Icon className={`${s.icon} text-text-muted`} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="text-2xs text-accent-blue hover:underline mt-2">
          {action.label}
        </button>
      )}
    </div>
  );
}
