import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupFetchMock } from '../helpers';
import { useData } from '@/lib/hooks/useData';

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

function CallbackList() {
  const { data, loading, error } = useData<{ nodes: any[]; totalCount: number }>('/api/callbacks?limit=10&offset=0');
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  const callbacks = data?.nodes ?? [];
  return (
    <div data-testid="callback-list">
      <span data-testid="count">{data?.totalCount}</span>
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
  const { data, loading } = useData<any>('/api/callbacks/stats');
  if (loading) return <div data-testid="stats-loading">Loading</div>;
  return (
    <div data-testid="stats">
      <span data-testid="pending">{data?.pending}</span>
      <span data-testid="approved">{data?.approved}</span>
    </div>
  );
}

describe('Callback Flow Integration', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); vi.restoreAllMocks(); });

  it('loads and displays callback requests', async () => {
    cleanup = setupFetchMock([{
      url: '/api/callbacks',
      response: {
        nodes: [
          { id: 'cb-1', reason: 'Account inquiry', status: 'PENDING', priority: 'HIGH' },
          { id: 'cb-2', reason: 'Billing question', status: 'APPROVED', priority: 'NORMAL' },
        ],
        totalCount: 2,
      },
    }]);

    render(<CallbackList />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('callback-list')).toBeInTheDocument());
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('reason-0')).toHaveTextContent('Account inquiry');
    expect(screen.getByTestId('status-0')).toHaveTextContent('PENDING');
    expect(screen.getByTestId('priority-0')).toHaveTextContent('HIGH');
  });

  it('loads and displays callback stats', async () => {
    cleanup = setupFetchMock([{
      url: '/api/callbacks/stats',
      response: { pending: 7, approved: 12 },
    }]);

    render(<CallbackStatsDisplay />);
    await waitFor(() => expect(screen.getByTestId('stats')).toBeInTheDocument());
    expect(screen.getByTestId('pending')).toHaveTextContent('7');
    expect(screen.getByTestId('approved')).toHaveTextContent('12');
  });

  it('handles query error gracefully', async () => {
    cleanup = setupFetchMock([{
      url: '/api/callbacks',
      response: { error: 'Network error' },
      status: 500,
    }]);

    render(<CallbackList />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });
});
