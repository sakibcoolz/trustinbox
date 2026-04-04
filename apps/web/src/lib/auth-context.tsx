'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Token Utilities ────────────────────────────────────

/** Decode a JWT payload without verification. Returns null on malformed tokens. */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Returns true if the token is expired or malformed. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now();
}

/** Returns true if the token will expire within `bufferMs` milliseconds (default: 2 min). */
export function isTokenExpiringSoon(token: string, bufferMs = 120_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 - Date.now() < bufferMs;
}

// ─── Types ──────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  virtualPublicId?: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  xmppToken: string | null;
  xmppJid: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; fullName: string; mobile: string; username: string }) => Promise<void>;
  logout: () => void;
  /** Optimistically update the avatar URL in state + localStorage after upload/remove. */
  updateAvatar: (url: string | null) => void;
  /** Refresh the access token (and XMPP credentials). Returns true on success. */
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [xmppToken, setXmppToken] = useState<string | null>(null);
  const [xmppJid, setXmppJid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    const savedXmppToken = localStorage.getItem('xmppToken');
    const savedXmppJid = localStorage.getItem('xmppJid');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    // Validate the stored xmppToken is a non-expired 3-part JWT.
    const isValidJwt = (t: string | null): boolean => {
      if (!t || t.split('.').length !== 3) return false;
      return !isTokenExpired(t);
    };
    if (isValidJwt(savedXmppToken)) {
      setXmppToken(savedXmppToken);
    } else if (savedXmppToken) {
      // Stale non-JWT token — remove so user gets a fresh one on next login
      localStorage.removeItem('xmppToken');
      localStorage.removeItem('xmppJid');
    }
    if (savedXmppJid && isValidJwt(savedXmppToken)) setXmppJid(savedXmppJid);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.xmppToken) localStorage.setItem('xmppToken', data.xmppToken);
    if (data.xmppJid)   localStorage.setItem('xmppJid',   data.xmppJid);
    setToken(data.accessToken);
    setUser(data.user);
    setXmppToken(data.xmppToken ?? null);
    setXmppJid(data.xmppJid ?? null);
  }, []);

  const register = useCallback(async (input: { email: string; password: string; fullName: string; mobile: string }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }

    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.xmppToken) localStorage.setItem('xmppToken', data.xmppToken);
    if (data.xmppJid)   localStorage.setItem('xmppJid',   data.xmppJid);
    setToken(data.accessToken);
    setUser(data.user);
    setXmppToken(data.xmppToken ?? null);
    setXmppJid(data.xmppJid ?? null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('xmppToken');
    localStorage.removeItem('xmppJid');
    setToken(null);
    setUser(null);
    setXmppToken(null);
    setXmppJid(null);
    router.push('/auth/login');
  }, [router]);

  const updateAvatar = useCallback((url: string | null) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, avatarUrl: url };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Returns ms until the JWT expires, or 0 if expired/invalid.
  const msUntilExpiry = (t: string | null): number => {
    if (!t) return 0;
    const payload = decodeJwtPayload(t);
    if (!payload?.exp) return 0;
    return Math.max(0, payload.exp * 1000 - Date.now());
  };

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (!storedRefresh) return false;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setToken(data.accessToken);
      // Refresh also returns a fresh XMPP token when available
      if (data.xmppToken) {
        localStorage.setItem('xmppToken', data.xmppToken);
        setXmppToken(data.xmppToken);
      }
      if (data.xmppJid) {
        localStorage.setItem('xmppJid', data.xmppJid);
        setXmppJid(data.xmppJid);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Schedule proactive refresh 2 minutes before the access token expires.
  const scheduleRefresh = useCallback((currentToken: string | null) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const remaining = msUntilExpiry(currentToken);
    if (remaining <= 0) return;
    // Refresh when 2 minutes remain (or immediately if already within 2 min)
    const delay = Math.max(0, remaining - 2 * 60 * 1000);
    refreshTimerRef.current = setTimeout(async () => {
      const ok = await refreshAccessToken();
      if (!ok) {
        // Refresh failed — session expired, force logout
        logout();
      }
    }, delay);
  }, [refreshAccessToken, logout]);

  // On mount: if token is present but expired or expiring soon, refresh immediately.
  // Also schedule the next proactive refresh.
  useEffect(() => {
    if (!token) return;
    const remaining = msUntilExpiry(token);
    if (remaining <= 2 * 60 * 1000) {
      // Token already expired or expiring within 2 minutes — refresh now
      refreshAccessToken().then((ok) => {
        if (!ok) logout();
      });
    } else {
      scheduleRefresh(token);
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [token, refreshAccessToken, scheduleRefresh, logout]);

  const isAuthenticated = token !== null && !isTokenExpired(token);

  return (
    <AuthContext.Provider value={{ user, token, xmppToken, xmppJid, isLoading, isAuthenticated, login, register, logout, updateAvatar, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
