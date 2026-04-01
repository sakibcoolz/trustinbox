'use client';

import { useEffect, useState } from 'react';
import { auth, ApiError } from '@/lib/api';
import { getCMSPermissions, type Role } from '@/lib/roles';

interface AuthState {
  user: { id: string; email: string; fullName: string; username: string; role: string } | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    auth.me()
      .then((user) => setState({ user, loading: false, error: null }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        setState({ user: null, loading: false, error: err.message });
      });
  }, []);

  return state;
}

export function useCMSPermissions() {
  const { user, loading } = useAuth();
  const permissions = getCMSPermissions(user?.role ?? 'ANALYST');
  return { user, loading, permissions, role: (user?.role ?? 'ANALYST') as Role };
}

export function useRequireAuth(redirectTo = '/auth/login') {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo;
    }
  }, [loading, user, redirectTo]);

  return { user, loading };
}
