'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth as authApi, profile as profileApi } from '@/lib/api';
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
  const [loggedIn, setLoggedIn] = useState(() => tokenManager.isAuthenticated());
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    if (!tokenManager.isAuthenticated()) return;
    setLoading(true);
    try {
      // Fetch user profile and service providers in parallel
      const [meData, spData] = await Promise.all([
        authApi.me(),
        profileApi.serviceProviders().catch(() => ({ serviceProviders: [] })),
      ]);

      const memberships: ServiceProviderMembership[] = (spData.serviceProviders || []).map((sp) => ({
        id: sp.id,
        name: sp.name,
        industry: sp.industry,
        role: sp.role,
        status: sp.verificationStatus ?? 'ACTIVE',
      } as ServiceProviderMembership));

      // Determine active SP
      const activeSpId = tokenManager.getActiveSpId();
      const activeMembership = activeSpId
        ? memberships.find((sp) => sp.id === activeSpId)
        : memberships[0];

      // Auto-set active SP if not set
      if (!activeSpId && activeMembership) {
        tokenManager.setActiveSpId(activeMembership.id);
      }

      const activeSP: ServiceProviderDetail | null = activeMembership
        ? {
            id: activeMembership.id,
            name: activeMembership.name,
            industry: activeMembership.industry,
            status: activeMembership.status,
            memberCount: 0,
            createdAt: '',
          }
        : null;

      // Use SP role (e.g. SP_ADMIN) instead of base user role (CUSTOMER)
      const role = activeMembership?.role ?? 'CUSTOMER';

      setUser({
        id: meData.id,
        email: meData.email,
        fullName: meData.fullName,
        username: meData.username,
        role,
        createdAt: '',
        serviceProviders: memberships,
        activeServiceProvider: activeSP,
      } as MeUser);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        tokenManager.clearTokens();
        setLoggedIn(false);
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user on mount and when loggedIn changes
  useEffect(() => {
    if (loggedIn) {
      fetchMe();
      tokenManager.scheduleRefresh();
    } else {
      setUser(null);
    }
  }, [loggedIn, fetchMe]);

  const login = useCallback(
    (accessToken: string, refreshToken: string) => {
      tokenManager.setTokens(accessToken, refreshToken);
      setLoggedIn(true);
      fetchMe();
    },
    [fetchMe],
  );

  const logout = useCallback(async () => {
    tokenManager.clearTokens();
    setLoggedIn(false);
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  const refreshSession = useCallback(async () => {
    const success = await tokenManager.refresh();
    if (success) {
      fetchMe();
    } else {
      logout();
    }
  }, [fetchMe, logout]);

  const switchServiceProvider = useCallback(
    (spId: string) => {
      tokenManager.setActiveSpId(spId);
      fetchMe();
    },
    [fetchMe],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: loggedIn ? loading : false,
      error: error ?? null,
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
