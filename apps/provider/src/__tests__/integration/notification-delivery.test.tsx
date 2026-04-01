import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import {
  NOTIFICATION_LIST_QUERY,
  NOTIFICATION_STATS_QUERY,
  SEND_NOTIFICATION_MUTATION,
} from '@/lib/graphql/notifications';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'SP_ADMIN' },
    role: 'SP_ADMIN',
    isAuthenticated: true,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useQuery, useMutation } from '@apollo/client';

function NotificationList() {
  const { data, loading, error } = useQuery(NOTIFICATION_LIST_QUERY, {
    variables: { limit: 10, offset: 0 },
  });

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;

  const notifications = data?.notifications?.nodes ?? [];
  return (
    <div data-testid="notification-list">
      <span data-testid="total">{data?.notifications?.totalCount}</span>
      {notifications.map((n: any) => (
        <div key={n.id} data-testid={`notif-${n.id}`}>
          <span data-testid={`subject-${n.id}`}>{n.subject}</span>
          <span data-testid={`status-${n.id}`}>{n.status}</span>
          <span data-testid={`channel-${n.id}`}>{n.channel}</span>
        </div>
      ))}
    </div>
  );
}

function NotificationStats() {
  const { data, loading } = useQuery(NOTIFICATION_STATS_QUERY, {
    variables: { serviceProviderId: 'sp-1' },
  });
  if (loading) return <div data-testid="stats-loading">Loading</div>;
  return (
    <div data-testid="stats">
      <span data-testid="sent">{data?.notificationStats?.totalSent}</span>
      <span data-testid="delivered">{data?.notificationStats?.totalDelivered}</span>
      <span data-testid="failed">{data?.notificationStats?.totalFailed}</span>
    </div>
  );
}

const notifListMock: MockedResponse = {
  request: {
    query: NOTIFICATION_LIST_QUERY,
    variables: { limit: 10, offset: 0 },
  },
  result: {
    data: {
      notifications: {
        nodes: [
          {
            id: 'n-1',
            subject: 'Appointment Reminder',
            body: 'Your appointment is tomorrow at 2pm',
            category: 'PERSONAL',
            channel: 'PUSH',
            status: 'DELIVERED',
            recipientVirtualId: 'VID-001',
            priority: 'NORMAL',
            createdAt: '2024-01-15T08:00:00Z',
            deliveredAt: '2024-01-15T08:01:00Z',
          },
          {
            id: 'n-2',
            subject: 'Security Alert',
            body: 'Suspicious login detected',
            category: 'ORGANIZATIONAL',
            channel: 'EMAIL',
            status: 'FAILED',
            recipientVirtualId: 'VID-002',
            priority: 'HIGH',
            createdAt: '2024-01-15T07:00:00Z',
            deliveredAt: null,
          },
        ],
        totalCount: 2,
      },
    },
  },
};

const statsMock: MockedResponse = {
  request: {
    query: NOTIFICATION_STATS_QUERY,
    variables: { serviceProviderId: 'sp-1' },
  },
  result: {
    data: {
      notificationStats: {
        totalSent: 1500,
        totalDelivered: 1450,
        totalFailed: 50,
        deliveryRate: 96.7,
      },
    },
  },
};

describe('Notification Delivery Integration', () => {
  it('loads and displays notification list', async () => {
    render(
      <MockedProvider mocks={[notifListMock]} addTypename={false}>
        <NotificationList />
      </MockedProvider>,
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('notification-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('subject-n-1')).toHaveTextContent('Appointment Reminder');
    expect(screen.getByTestId('status-n-1')).toHaveTextContent('DELIVERED');
    expect(screen.getByTestId('channel-n-1')).toHaveTextContent('PUSH');
    expect(screen.getByTestId('subject-n-2')).toHaveTextContent('Security Alert');
    expect(screen.getByTestId('status-n-2')).toHaveTextContent('FAILED');
    expect(screen.getByTestId('channel-n-2')).toHaveTextContent('EMAIL');
  });

  it('loads notification stats', async () => {
    render(
      <MockedProvider mocks={[statsMock]} addTypename={false}>
        <NotificationStats />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('stats')).toBeInTheDocument();
    });

    expect(screen.getByTestId('sent')).toHaveTextContent('1500');
    expect(screen.getByTestId('delivered')).toHaveTextContent('1450');
    expect(screen.getByTestId('failed')).toHaveTextContent('50');
  });

  it('handles network error', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: NOTIFICATION_LIST_QUERY,
        variables: { limit: 10, offset: 0 },
      },
      error: new Error('Notification service down'),
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <NotificationList />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Notification service down');
  });
});
