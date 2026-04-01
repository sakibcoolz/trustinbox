'use client';

import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: Permission;
  children: React.ReactNode;
  hideWhenDenied?: boolean;
}

export function ActionButton({
  permission,
  children,
  hideWhenDenied = false,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const allowed = usePermission(permission);

  if (!allowed && hideWhenDenied) return null;

  return (
    <button
      {...props}
      disabled={disabled || !allowed}
      title={!allowed ? "You don't have permission to perform this action" : props.title}
      className={cn(
        className,
        !allowed && 'opacity-50 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}
