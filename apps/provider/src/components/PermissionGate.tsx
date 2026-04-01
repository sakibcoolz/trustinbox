'use client';

import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, hasAllPermissions, hasAnyPermission, type Permission, type Role } from '@/lib/roles';

interface PermissionGateProps {
  permission: Permission | Permission[];
  mode?: 'all' | 'any';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  mode = 'all',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { role } = useAuth();

  if (!role) return <>{fallback}</>;

  const r = role as Role;
  const permissions = Array.isArray(permission) ? permission : [permission];

  const allowed =
    mode === 'all'
      ? hasAllPermissions(r, permissions)
      : hasAnyPermission(r, permissions);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
