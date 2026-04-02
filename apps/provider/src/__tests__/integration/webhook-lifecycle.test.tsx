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

function WebhookList() {
  const { data, loading, error } = useData<{ nodes: any[]; totalCount: number }>('/api/webhooks?limit=10&offset=0');
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  const hooks = data?.nodes ?? [];
  return (
    <div data-testid="webhook-list">
      <span data-testid="total">{data?.totalCount}</span>
      {hooks.map((wh: any, i: number) => (
        <div key={wh.id ?? i} data-testid={`wh-${i}`}>
          <span data-testid={`url-${i}`}>{wh.url}</span>
          <span data-testid={`status-${i}`}>{wh.status}</span>
          <span data-testid={`events-${i}`}>{wh.events?.join(', ')}</span>
        </div>
      ))}
    </div>
  );
}

describe('Webhook Lifecycle Integration', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); vi.restoreAllMocks(); });

  it('loads and displays webhook subscriptions', async () => {
    cleanup = setupFetchMock([{
      url: '/api/webhooks',
      response: {
        nodes: [
          { id: 'wh-1', url: 'https://example.com/hook1', status: 'ACTIVE', events: ['NotificationDelivered'] },
          { id: 'wh-2', url: 'https://example.com/hook2', status: 'INACTIVE', events: ['CallbackCreated', 'CallbackUpdated'] },
        ],
        totalCount: 2,
      },
    }]);

    render(<WebhookList />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('webhook-list')).toBeInTheDocument());
    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('url-0')).toHaveTextContent('https://example.com/hook1');
    expect(screen.getByTestId('status-0')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('events-0')).toHaveTextContent('NotificationDelivered');
  });

  it('handles error', async () => {
    cleanup = setupFetchMock([{
      url: '/api/webhooks',
      response: { error: 'Forbidden' },
      status: 403,
    }]);

    render(<WebhookList />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });
});
