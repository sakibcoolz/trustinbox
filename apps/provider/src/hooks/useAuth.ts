'use client';

// Re-export from AuthContext — all auth state comes from a single context provider
export { useAuth, useRequireAuth } from '@/contexts/AuthContext';

// Legacy compat: CMS permissions
import { useAuth } from '@/contexts/AuthContext';
import { getCMSPermissions, type Role } from '@/lib/roles';

export function useCMSPermissions() {
  const { user, loading } = useAuth();
  const permissions = getCMSPermissions(user?.role ?? 'ANALYST');
  return { user, loading, permissions, role: (user?.role ?? 'ANALYST') as Role };
}
