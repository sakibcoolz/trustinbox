'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  login: () => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
  switchServiceProvider: (spId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Cookie helper ──────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Provider ───────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(() => getCookie('auth-status') === '1');
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    if (getCookie('auth-status') !== '1') return;
    setLoading(true);
    try {
      // Fetch user profile and service providers in parallel (cookies auto-sent)
      const [meRes, spRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/auth/service-providers').catch(() => null),
      ]);

      if (!meRes.ok) {
        if (meRes.status === 401) {
          // Try refreshing
          const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
          if (refreshRes.ok) {
            // Retry after refresh
            const retryMe = await fetch('/api/auth/me');
            if (!retryMe.ok) throw new Error('401');
            const meData = await retryMe.json();
            const retrySpRes = await fetch('/api/auth/service-providers').catch(() => null);
            const spData = retrySpRes?.ok ? await retrySpRes.json() : { serviceProviders: [] };
            buildUser(meData, spData);
            return;
          }
          throw new Error('401');
        }
        throw new Error(`Failed: ${meRes.status}`);
      }

      const meData = await meRes.json();
      const spData = spRes?.ok ? await spRes.json() : { serviceProviders: [] };
      buildUser(meData, spData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        setLoggedIn(false);
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function buildUser(
    meData: { id: string; email: string; fullName: string; username: string; role?: string },
    spData: { serviceProviders?: Array<Record<string, string>> } | Array<Record<string, string>>,
  ) {
    const rawSps = Array.isArray(spData)
      ? spData
      : (spData?.serviceProviders || []);

    const memberships: ServiceProviderMembership[] = rawSps.map((sp) => ({
      id: sp.id,
      name: sp.name,
      industry: sp.industry,
      role: sp.role,
      status: sp.verificationStatus ?? sp.verification_status ?? 'ACTIVE',
    } as ServiceProviderMembership));

    // Determine active SP from cookie
    const activeSpId = getCookie('activeSpId');
    const activeMembership = activeSpId
      ? memberships.find((sp) => sp.id === activeSpId)
      : memberships[0];

    // Auto-set active SP cookie if not set
    if (!activeSpId && activeMembership) {
      fetch('/api/auth/active-sp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spId: activeMembership.id }),
      }).catch(() => {});
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

    const role = activeMembership?.role ?? meData.role ?? 'CUSTOMER';

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
  }

  // Fetch user on mount and when loggedIn changes
  useEffect(() => {
    if (loggedIn) {
      fetchMe();
    } else {
      setUser(null);
    }
  }, [loggedIn, fetchMe]);

  // Schedule periodic token refresh (every 12 minutes)
  useEffect(() => {
    if (!loggedIn) return;
    const timer = setInterval(() => {
      fetch('/api/auth/refresh', { method: 'POST' }).catch(() => {});
    }, 12 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loggedIn]);

  const login = useCallback(() => {
    setLoggedIn(true);
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setLoggedIn(false);
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (res.ok) {
      fetchMe();
    } else {
      logout();
    }
  }, [fetchMe, logout]);

  const switchServiceProvider = useCallback(
    async (spId: string) => {
      await fetch('/api/auth/active-sp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spId }),
      });
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
