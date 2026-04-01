import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tokenManager } from '@/lib/token';

describe('tokenManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('setTokens / getAccessToken / getRefreshToken', () => {
    it('stores and retrieves tokens', () => {
      tokenManager.setTokens('access-abc', 'refresh-xyz');
      expect(tokenManager.getAccessToken()).toBe('access-abc');
      expect(tokenManager.getRefreshToken()).toBe('refresh-xyz');
    });
  });

  describe('clearTokens', () => {
    it('removes all tokens from localStorage', () => {
      tokenManager.setTokens('a', 'b');
      tokenManager.setActiveSpId('sp-1');
      tokenManager.clearTokens();
      expect(tokenManager.getAccessToken()).toBeNull();
      expect(tokenManager.getRefreshToken()).toBeNull();
      expect(tokenManager.getActiveSpId()).toBeNull();
    });
  });

  describe('setActiveSpId / getActiveSpId', () => {
    it('stores and retrieves active SP', () => {
      tokenManager.setActiveSpId('sp-42');
      expect(tokenManager.getActiveSpId()).toBe('sp-42');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token', () => {
      expect(tokenManager.isAuthenticated()).toBe(false);
    });

    it('returns false when token is expired', () => {
      // Create a JWT with expired timestamp
      const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600, sub: 'u1' }));
      const fakeToken = `header.${payload}.sig`;
      localStorage.setItem('accessToken', fakeToken);
      expect(tokenManager.isAuthenticated()).toBe(false);
    });

    it('returns true for non-expired token', () => {
      const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: 'u1' }));
      const fakeToken = `header.${payload}.sig`;
      localStorage.setItem('accessToken', fakeToken);
      expect(tokenManager.isAuthenticated()).toBe(true);
    });
  });

  describe('getTokenPayload', () => {
    it('returns null when no token', () => {
      expect(tokenManager.getTokenPayload()).toBeNull();
    });

    it('decodes token payload', () => {
      const claims = { exp: 9999999999, sub: 'user-42', role: 'SP_ADMIN' };
      const payload = btoa(JSON.stringify(claims));
      localStorage.setItem('accessToken', `h.${payload}.s`);
      const result = tokenManager.getTokenPayload();
      expect(result?.sub).toBe('user-42');
      expect(result?.role).toBe('SP_ADMIN');
    });
  });
});
