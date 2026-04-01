'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole, hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/roles';
import type { Role, Permission } from '@/lib/roles';
import { useToast } from '@/hooks/useToast';

interface ProtectedRouteProps {
  requiredRole?: Role;
  requiredPermission?: Permission | Permission[];
  permissionMode?: 'all' | 'any';
  fallback?: 'redirect' | 'forbidden';
  children: React.ReactNode;
}

export function ProtectedRoute({
  requiredRole,
  requiredPermission,
  permissionMode = 'all',
  fallback = 'redirect',
  children,
}: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const isAllowed = (() => {
    if (!user || !role) return false;
    if (requiredRole && !hasRole(role, requiredRole)) return false;
    if (requiredPermission) {
      const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const r = role as Role;
      if (permissionMode === 'all' && !hasAllPermissions(r, perms)) return false;
      if (permissionMode === 'any' && !hasAnyPermission(r, perms)) return false;
    }
    return true;
  })();

  useEffect(() => {
    if (!loading && user && !isAllowed && fallback === 'redirect') {
      toast.error('Access denied', 'You do not have permission to view this page.');
      router.push('/');
    }
  }, [loading, user, isAllowed, fallback, router, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAllowed) {
    if (fallback === 'forbidden') return <ForbiddenPage />;
    return null; // redirect effect above handles this
  }

  return <>{children}</>;
}

function ForbiddenPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <ShieldX size={48} className="mx-auto text-status-error mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">Access Denied</h2>
        <p className="text-sm text-text-muted mb-6">
          You don&apos;t have permission to access this page. Contact your administrator for access.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
