/// <reference types="vitest/globals" />
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { setupFetchMock } from '@/__tests__/helpers';
import { AuthProvider, useAuth } from '@/lib/auth-context';

// Create a mock JWT with an expiry far in the future
function createMockJwt(expiresInSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds, sub: 'test' }));
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

const MOCK_ACCESS_TOKEN = createMockJwt(3600); // expires in 1 hour
const MOCK_REFRESH_TOKEN = createMockJwt(86400); // expires in 24 hours

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  describe('initial state', () => {
    it('starts with null user and loading true', async () => {
      const cleanup = setupFetchMock([]);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      cleanup();
    });

    it('returns isAuthenticated false when no token', async () => {
      const cleanup = setupFetchMock([]);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();

      cleanup();
    });
  });

  describe('login', () => {
    it('stores token and user on successful login', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/auth/login',
          method: 'POST',
          response: {
            accessToken: MOCK_ACCESS_TOKEN,
            refreshToken: MOCK_REFRESH_TOKEN,
            user: { id: 'u1', fullName: 'Test', email: 'test@test.com', username: 'tester' },
          },
        },
      ]);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@test.com', 'password123');
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      expect(result.current.token).toBe(MOCK_ACCESS_TOKEN);
      expect(result.current.user).toBeTruthy();
      expect(result.current.user?.email).toBe('test@test.com');
      expect(localStorage.setItem).toHaveBeenCalled();

      cleanup();
    });

    it('throws on failed login', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/auth/login',
          method: 'POST',
          response: { error: 'Invalid credentials' },
          status: 401,
        },
      ]);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('bad@test.com', 'wrong');
        }),
      ).rejects.toThrow();

      expect(result.current.isAuthenticated).toBe(false);

      cleanup();
    });
  });

  describe('logout', () => {
    it('clears token and user on logout', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/auth/login',
          method: 'POST',
          response: {
            accessToken: MOCK_ACCESS_TOKEN,
            refreshToken: MOCK_REFRESH_TOKEN,
            user: { id: 'u1', fullName: 'X', email: 'x@x.com', username: 'x' },
          },
        },
      ]);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      await act(async () => {
        await result.current.login('x@x.com', 'pass');
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalled();

      cleanup();
    });
  });

  describe('register', () => {
    it('registers and logs in the user', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/auth/register',
          method: 'POST',
          response: {
            accessToken: MOCK_ACCESS_TOKEN,
            refreshToken: MOCK_REFRESH_TOKEN,
            user: { id: 'u2', fullName: 'New User', email: 'new@test.com', username: 'newuser' },
          },
        },
      ]);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      await act(async () => {
        await result.current.register({
          email: 'new@test.com',
          password: 'pass123',
          fullName: 'New User',
          mobile: '1234567890',
          username: 'newuser',
        });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      expect(result.current.user?.email).toBe('new@test.com');

      cleanup();
    });
  });

  describe('updateAvatar', () => {
    it('updates user avatarUrl', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/auth/login',
          method: 'POST',
          response: {
            accessToken: MOCK_ACCESS_TOKEN,
            refreshToken: MOCK_REFRESH_TOKEN,
            user: { id: 'u1', fullName: 'X', email: 'x@x.com', username: 'x', avatarUrl: null },
          },
        },
      ]);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      await act(async () => {
        await result.current.login('x@x.com', 'pass');
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      act(() => {
        result.current.updateAvatar('https://example.com/avatar.jpg');
      });

      await waitFor(() => {
        expect(result.current.user?.avatarUrl).toBe('https://example.com/avatar.jpg');
      });

      cleanup();
    });
  });

  describe('token refresh', () => {
    it('refreshAccessToken returns true on success', async () => {
      // Seed localStorage with a refresh token
      localStorage.setItem('refreshToken', MOCK_REFRESH_TOKEN);

      const cleanup = setupFetchMock([
        {
          url: '/api/auth/refresh',
          method: 'POST',
          response: {
            accessToken: MOCK_ACCESS_TOKEN,
            refreshToken: MOCK_REFRESH_TOKEN,
            user: { id: 'u1', fullName: 'X', email: 'x@x.com', username: 'x' },
          },
        },
      ]);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => { expect(result.current.isLoading).toBe(false); });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.refreshAccessToken();
      });

      expect(success).toBe(true);

      cleanup();
    });
  });
});
