'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { ME_QUERY, LOGOUT_MUTATION } from '@/lib/graphql/auth';
import { tokenManager } from '@/lib/token';
import type { MeUser, ServiceProviderMembership, ServiceProviderDetail } from '@/lib/graphql/types';

// ─── Types ──────────────────────────────────────────────

interface AuthContextValue {
  user: MeUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  role: string | null;
  activeServiceProvider: ServiceProviderDetail | null;
  serviceProviders: ServiceProviderMembership[];
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
  switchServiceProvider: (spId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const client = useApolloClient();
  const [loggedIn, setLoggedIn] = useState(() => tokenManager.isAuthenticated());

  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    skip: !loggedIn,
    errorPolicy: 'all',
    onError: (err) => {
      const isAuthError = err.graphQLErrors?.some(
        (e) => e.extensions?.code === 'UNAUTHENTICATED',
      );
      if (isAuthError) {
        tokenManager.clearTokens();
        setLoggedIn(false);
      }
    },
  });

  const [logoutMutation] = useMutation(LOGOUT_MUTATION, { errorPolicy: 'ignore' });

  const user: MeUser | null = data?.me ?? null;

  // Schedule token refresh on mount
  useEffect(() => {
    if (loggedIn) tokenManager.scheduleRefresh();
  }, [loggedIn]);

  const login = useCallback(
    (accessToken: string, refreshToken: string) => {
      tokenManager.setTokens(accessToken, refreshToken);
      setLoggedIn(true);
      refetch();
    },
    [refetch],
  );

  const logout = useCallback(async () => {
    try { await logoutMutation(); } catch { /* ignore */ }
    tokenManager.clearTokens();
    setLoggedIn(false);
    await client.clearStore();
    router.push('/auth/login');
  }, [logoutMutation, client, router]);

  const refreshSession = useCallback(async () => {
    const success = await tokenManager.refresh();
    if (success) {
      refetch();
    } else {
      logout();
    }
  }, [refetch, logout]);

  const switchServiceProvider = useCallback(
    (spId: string) => {
      tokenManager.setActiveSpId(spId);
      // Refetch ME query which respects active SP context
      refetch();
      // Clear cached data from previous SP
      client.cache.evict({ fieldName: 'notifications' });
      client.cache.evict({ fieldName: 'conversations' });
      client.cache.evict({ fieldName: 'callbackRequests' });
      client.cache.evict({ fieldName: 'campaigns' });
      client.cache.gc();
    },
    [refetch, client],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: loggedIn ? loading : false,
      error: error?.message ?? null,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      activeServiceProvider: user?.activeServiceProvider ?? null,
      serviceProviders: user?.serviceProviders ?? [],
      login,
      logout,
      refreshSession,
      switchServiceProvider,
    }),
    [user, loading, error, loggedIn, login, logout, refreshSession, switchServiceProvider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hooks ──────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function useRequireAuth(redirectTo = '/auth/login') {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, isAuthenticated, redirectTo, router]);

  return { user, loading };
}
