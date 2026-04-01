import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { CALLBACK_REQUESTS_QUERY, CALLBACK_STATS_QUERY } from '@/lib/graphql/callbacks';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'SP_ADMIN', fullName: 'Admin' },
    role: 'SP_ADMIN',
    isAuthenticated: true,
    loading: false,
    activeServiceProvider: { id: 'sp-1', companyName: 'Test' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Simple component that uses the callback query
import { useQuery } from '@apollo/client';

function CallbackList() {
  const { data, loading, error } = useQuery(CALLBACK_REQUESTS_QUERY, {
    variables: { limit: 10, offset: 0 },
  });

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;

  const callbacks = data?.callbackRequests?.nodes ?? [];
  return (
    <div data-testid="callback-list">
      <span data-testid="count">{data?.callbackRequests?.totalCount}</span>
      {callbacks.map((cb: any, i: number) => (
        <div key={cb.id ?? i} data-testid={`callback-${i}`}>
          <span data-testid={`reason-${i}`}>{cb.reason}</span>
          <span data-testid={`status-${i}`}>{cb.status}</span>
          <span data-testid={`priority-${i}`}>{cb.priority}</span>
        </div>
      ))}
    </div>
  );
}

function CallbackStatsDisplay() {
  const { data, loading } = useQuery(CALLBACK_STATS_QUERY, {
    variables: { serviceProviderId: 'sp-1' },
  });

  if (loading) return <div data-testid="stats-loading">Loading</div>;
  return (
    <div data-testid="stats">
      <span data-testid="pending">{data?.callbackStats?.pending}</span>
      <span data-testid="approved">{data?.callbackStats?.approved}</span>
    </div>
  );
}

const callbackListMock: MockedResponse = {
  request: {
    query: CALLBACK_REQUESTS_QUERY,
    variables: { limit: 10, offset: 0 },
  },
  result: {
    data: {
      callbackRequests: {
        nodes: [
          {
            __typename: 'CallbackRequest',
            id: 'cb-1',
            userId: 'u-100',
            customerVirtualId: 'VID-001',
            serviceProviderId: 'sp-1',
            reason: 'Account inquiry',
            details: null,
            status: 'PENDING',
            priority: 'HIGH',
            requestedAt: '2024-01-15T10:00:00Z',
            respondedAt: null,
            assignedAgentId: null,
            assignedAgentName: null,
            approvedSlotStart: null,
            approvedSlotEnd: null,
            rejectionReason: null,
            outcome: null,
            callDuration: null,
            completionNotes: null,
            followUpDate: null,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
          {
            __typename: 'CallbackRequest',
            id: 'cb-2',
            userId: 'u-200',
            customerVirtualId: 'VID-002',
            serviceProviderId: 'sp-1',
            reason: 'Billing question',
            details: 'Overcharged',
            status: 'APPROVED',
            priority: 'NORMAL',
            requestedAt: '2024-01-14T08:00:00Z',
            respondedAt: '2024-01-14T09:00:00Z',
            assignedAgentId: 'agent-1',
            assignedAgentName: 'Agent Smith',
            approvedSlotStart: '2024-01-15T14:00:00Z',
            approvedSlotEnd: '2024-01-15T14:30:00Z',
            rejectionReason: null,
            outcome: null,
            callDuration: null,
            completionNotes: null,
            followUpDate: null,
            createdAt: '2024-01-14T08:00:00Z',
            updatedAt: '2024-01-14T09:00:00Z',
          },
        ],
        totalCount: 2,
      },
    },
  },
};

const statsMock: MockedResponse = {
  request: {
    query: CALLBACK_STATS_QUERY,
    variables: { serviceProviderId: 'sp-1' },
  },
  result: {
    data: {
      callbackStats: {
        pending: 7,
        approved: 12,
        rejected: 3,
        expired: 1,
        rescheduled: 2,
        completedThisWeek: 15,
        scheduledToday: 5,
      },
    },
  },
};

describe('Callback Flow Integration', () => {
  it('loads and displays callback requests', async () => {
    render(
      <MockedProvider mocks={[callbackListMock]} addTypename={false}>
        <CallbackList />
      </MockedProvider>,
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('callback-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('reason-0')).toHaveTextContent('Account inquiry');
    expect(screen.getByTestId('status-0')).toHaveTextContent('PENDING');
    expect(screen.getByTestId('priority-0')).toHaveTextContent('HIGH');
    expect(screen.getByTestId('reason-1')).toHaveTextContent('Billing question');
    expect(screen.getByTestId('status-1')).toHaveTextContent('APPROVED');
  });

  it('loads and displays callback stats', async () => {
    render(
      <MockedProvider mocks={[statsMock]} addTypename={false}>
        <CallbackStatsDisplay />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('stats')).toBeInTheDocument();
    });

    expect(screen.getByTestId('pending')).toHaveTextContent('7');
    expect(screen.getByTestId('approved')).toHaveTextContent('12');
  });

  it('handles query error gracefully', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: CALLBACK_REQUESTS_QUERY,
        variables: { limit: 10, offset: 0 },
      },
      error: new Error('Network error'),
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <CallbackList />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Network error');
  });
});
