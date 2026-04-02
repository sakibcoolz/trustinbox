import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupFetchMock } from '../helpers';
import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'SP_ADMIN' },
    role: 'SP_ADMIN',
    isAuthenticated: true,
    loading: false,
    activeServiceProvider: { id: 'sp-1' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function NotificationList() {
  const { data, loading, error } = useData<{ nodes: any[]; totalCount: number }>('/api/notifications?limit=10&offset=0');
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  const notifs = data?.nodes ?? [];
  return (
    <div data-testid="notif-list">
      <span data-testid="total">{data?.totalCount}</span>
      {notifs.map((n: any, i: number) => (
        <div key={n.id ?? i} data-testid={`notif-${i}`}>
          <span data-testid={`subject-${i}`}>{n.subject}</span>
          <span data-testid={`status-${i}`}>{n.status}</span>
          <span data-testid={`channel-${i}`}>{n.channel}</span>
        </div>
      ))}
    </div>
  );
}

function NotificationStats() {
  const { data, loading } = useData<any>('/api/notifications/stats');
  if (loading) return <div data-testid="stats-loading">Loading</div>;
  return (
    <div data-testid="stats">
      <span data-testid="sent">{data?.sent}</span>
      <span data-testid="delivered">{data?.delivered}</span>
      <span data-testid="failed">{data?.failed}</span>
    </div>
  );
}

describe('Notification Delivery Integration', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); vi.restoreAllMocks(); });

  it('loads and displays notifications', async () => {
    cleanup = setupFetchMock([{
      url: '/api/notifications',
      response: {
        nodes: [
          { id: 'n-1', subject: 'Welcome', status: 'DELIVERED', channel: 'PUSH' },
          { id: 'n-2', subject: 'Reminder', status: 'PENDING', channel: 'SMS' },
        ],
        totalCount: 2,
      },
    }]);

    render(<NotificationList />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('notif-list')).toBeInTheDocument());
    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('subject-0')).toHaveTextContent('Welcome');
    expect(screen.getByTestId('status-0')).toHaveTextContent('DELIVERED');
    expect(screen.getByTestId('channel-0')).toHaveTextContent('PUSH');
  });

  it('loads notification stats', async () => {
    cleanup = setupFetchMock([{
      url: '/api/notifications/stats',
      response: { sent: 100, delivered: 95, failed: 5 },
    }]);

    render(<NotificationStats />);
    await waitFor(() => expect(screen.getByTestId('stats')).toBeInTheDocument());
    expect(screen.getByTestId('sent')).toHaveTextContent('100');
    expect(screen.getByTestId('delivered')).toHaveTextContent('95');
    expect(screen.getByTestId('failed')).toHaveTextContent('5');
  });

  it('handles error', async () => {
    cleanup = setupFetchMock([{
      url: '/api/notifications',
      response: { error: 'Service down' },
      status: 500,
    }]);

    render(<NotificationList />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });
});
