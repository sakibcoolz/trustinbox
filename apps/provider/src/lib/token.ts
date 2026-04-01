'use client';

import { REFRESH_TOKEN_MUTATION } from '@/lib/graphql/auth';

// ─── JWT Decode (client-side only, no verification) ─────

function decodeJWT(token: string): { exp: number; sub: string; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

function getTokenExpiresIn(token: string): number {
  const payload = decodeJWT(token);
  if (!payload?.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
}

// ─── Token Manager ──────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export const tokenManager = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },

  getActiveSpId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('activeSpId');
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // Set auth-status cookie for middleware
    document.cookie = 'auth-status=1; path=/; max-age=604800; SameSite=Lax';
    // Schedule silent refresh
    tokenManager.scheduleRefresh();
  },

  setActiveSpId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('activeSpId', id);
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeSpId');
    localStorage.removeItem('userSPs');
    // Clear auth-status cookie
    document.cookie = 'auth-status=; path=/; max-age=0';
    // Cancel scheduled refresh
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  },

  isAuthenticated(): boolean {
    const token = tokenManager.getAccessToken();
    if (!token) return false;
    return !isTokenExpired(token);
  },

  getTokenPayload(): { exp: number; sub: string; role?: string } | null {
    const token = tokenManager.getAccessToken();
    if (!token) return null;
    return decodeJWT(token);
  },

  /** Schedule a silent refresh 60 seconds before expiry */
  scheduleRefresh(): void {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    const token = tokenManager.getAccessToken();
    if (!token) return;

    const expiresIn = getTokenExpiresIn(token);
    // Refresh 60 seconds before expiry, but at least 5 seconds from now
    const refreshIn = Math.max(expiresIn - 60_000, 5_000);

    if (expiresIn <= 0) return; // Already expired

    refreshTimer = setTimeout(() => {
      tokenManager.refresh();
    }, refreshIn);
  },

  /**
   * Refresh the access token. De-duplicates concurrent calls.
   * Returns true if refresh succeeded, false otherwise.
   */
  async refresh(): Promise<boolean> {
    // De-duplicate concurrent refresh attempts
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) return false;

      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const result = await response.json();

        if (result.accessToken) {
          const { accessToken, refreshToken: newRefreshToken } = result;
          tokenManager.setTokens(accessToken, newRefreshToken);
          return true;
        }

        return false;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },
};
