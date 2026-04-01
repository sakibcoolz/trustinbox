'use client';

import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, hasAllPermissions, hasAnyPermission, type Permission, type Role } from '@/lib/roles';

export function usePermission(permission: Permission): boolean {
  const { role } = useAuth();
  if (!role) return false;
  return hasPermission(role as Role, permission);
}

export function usePermissions(permissions: Permission[]): Record<string, boolean> {
  const { role } = useAuth();
  if (!role) return Object.fromEntries(permissions.map((p) => [p, false]));
  return Object.fromEntries(permissions.map((p) => [p, hasPermission(role as Role, p)]));
}

export function useFeatureAccess(feature: string) {
  const { role } = useAuth();
  if (!role) return { canView: false, canCreate: false, canManage: false, canDelete: false };
  const r = role as Role;
  return {
    canView: hasPermission(r, `${feature}:view` as Permission),
    canCreate: hasPermission(r, `${feature}:create` as Permission),
    canManage: hasPermission(r, `${feature}:manage` as Permission),
    canDelete: hasPermission(r, `${feature}:delete` as Permission),
  };
}
