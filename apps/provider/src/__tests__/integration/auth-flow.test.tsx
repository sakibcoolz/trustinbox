import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ME_QUERY, LOGIN_MUTATION } from '@/lib/graphql/auth';

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

// Mock token manager so we control auth state
vi.mock('@/lib/token', () => ({
  tokenManager: {
    isAuthenticated: vi.fn(() => false),
    getAccessToken: vi.fn(() => null),
    getRefreshToken: vi.fn(() => null),
    getActiveSpId: vi.fn(() => null),
    setTokens: vi.fn(),
    setActiveSpId: vi.fn(),
    clearTokens: vi.fn(),
    scheduleRefresh: vi.fn(),
    refresh: vi.fn(() => Promise.resolve(false)),
    getTokenPayload: vi.fn(() => null),
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { tokenManager } from '@/lib/token';

// A test consumer that displays auth state
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

const meQueryMock: MockedResponse = {
  request: { query: ME_QUERY },
  result: {
    data: {
      me: {
        id: 'user-1',
        email: 'admin@test.com',
        fullName: 'Admin User',
        username: 'admin',
        role: 'SP_ADMIN',
        avatarUrl: null,
        phone: null,
        createdAt: '2024-01-01T00:00:00Z',
        serviceProviders: [
          {
            id: 'sp-1',
            name: 'Test Corp',
            industry: 'HEALTHCARE',
            role: 'SP_ADMIN',
            logoUrl: null,
            plan: 'ENTERPRISE',
            status: 'ACTIVE',
          },
        ],
        activeServiceProvider: {
          id: 'sp-1',
          name: 'Test Corp',
          industry: 'HEALTHCARE',
          logoUrl: null,
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          memberCount: 10,
          createdAt: '2024-01-01T00:00:00Z',
        },
      },
    },
  },
};

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows unauthenticated state when no token', async () => {
    vi.mocked(tokenManager.isAuthenticated).mockReturnValue(false);

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('unauth')).toBeInTheDocument();
    });
  });

  it('fetches and displays user when authenticated', async () => {
    vi.mocked(tokenManager.isAuthenticated).mockReturnValue(true);

    render(
      <MockedProvider mocks={[meQueryMock]} addTypename={false}>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </MockedProvider>,
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // After query resolves
    await waitFor(() => {
      expect(screen.getByTestId('auth')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Admin User');
    expect(screen.getByTestId('user-role')).toHaveTextContent('SP_ADMIN');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@test.com');
  });

  it('shows unauthenticated when ME_QUERY returns UNAUTHENTICATED error', async () => {
    vi.mocked(tokenManager.isAuthenticated).mockReturnValue(true);

    const errorMock: MockedResponse = {
      request: { query: ME_QUERY },
      result: {
        errors: [
          {
            message: 'Unauthenticated',
            extensions: { code: 'UNAUTHENTICATED' },
          } as any,
        ],
      },
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('unauth')).toBeInTheDocument();
    });

    expect(tokenManager.clearTokens).toHaveBeenCalled();
  });
});
