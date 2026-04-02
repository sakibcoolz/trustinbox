import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupFetchMock } from '../helpers';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/auth/login',
  useSearchParams: () => new URLSearchParams(),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AuthConsumer() {
  const { user, loading, isAuthenticated, role, error } = useAuth();
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;
  if (!isAuthenticated) return <div data-testid="unauth">Not authenticated</div>;
  return (
    <div data-testid="auth">
      <span data-testid="user-name">{user?.fullName}</span>
      <span data-testid="user-role">{role}</span>
      <span data-testid="user-email">{user?.email}</span>
    </div>
  );
}

const meResponse = {
  id: 'user-1',
  email: 'admin@test.com',
  fullName: 'Admin User',
  username: 'admin',
  role: 'SP_ADMIN',
  avatarUrl: null,
  phone: null,
  createdAt: '2024-01-01T00:00:00Z',
  serviceProviders: [
    { id: 'sp-1', name: 'Test Corp', industry: 'HEALTHCARE', role: 'SP_ADMIN', status: 'ACTIVE' },
  ],
  activeServiceProvider: {
    id: 'sp-1', name: 'Test Corp', industry: 'HEALTHCARE', status: 'ACTIVE', memberCount: 10, createdAt: '2024-01-01T00:00:00Z',
  },
};

describe('Auth Flow Integration', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    vi.restoreAllMocks();
  });

  it('shows unauthenticated state when /api/auth/me fails', async () => {
    cleanup = setupFetchMock([
      { url: '/api/auth/me', response: { error: 'Unauthorized' }, status: 401 },
    ]);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('unauth')).toBeInTheDocument();
    });
  });

  it('fetches and displays user when authenticated', async () => {
    // Set auth-status cookie so AuthContext proceeds with fetch
    Object.defineProperty(document, 'cookie', { writable: true, value: 'auth-status=1' });

    cleanup = setupFetchMock([
      { url: '/api/auth/me', response: meResponse },
      { url: '/api/auth/service-providers', response: { serviceProviders: meResponse.serviceProviders } },
    ]);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Admin User');
    expect(screen.getByTestId('user-role')).toHaveTextContent('SP_ADMIN');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@test.com');
  });
});
