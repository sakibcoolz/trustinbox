import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupFetchMock } from '../helpers';
import { useData } from '@/lib/hooks/useData';

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

function BotList() {
  const { data, loading, error } = useData<any[]>('/api/bots');
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  const bots = data ?? [];
  return (
    <div data-testid="bot-list">
      {bots.map((bot: any) => (
        <div key={bot.id} data-testid={`bot-${bot.id}`}>
          <span data-testid={`name-${bot.id}`}>{bot.name}</span>
          <span data-testid={`status-${bot.id}`}>{bot.status}</span>
        </div>
      ))}
    </div>
  );
}

function BotDetail({ botId }: { botId: string }) {
  const { data, loading } = useData<any>(`/api/bots/${botId}`);
  if (loading) return <div data-testid="detail-loading">Loading...</div>;
  return (
    <div data-testid="bot-detail">
      <span data-testid="bot-name">{data?.name}</span>
      <span data-testid="bot-desc">{data?.description}</span>
    </div>
  );
}

describe('Bot Flow Integration', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); vi.restoreAllMocks(); });

  it('loads and displays bot list', async () => {
    cleanup = setupFetchMock([{
      url: '/api/bots',
      response: [
        { id: 'bot-1', name: 'Support Bot', status: 'ACTIVE' },
        { id: 'bot-2', name: 'Sales Bot', status: 'INACTIVE' },
      ],
    }]);

    render(<BotList />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('bot-list')).toBeInTheDocument());
    expect(screen.getByTestId('name-bot-1')).toHaveTextContent('Support Bot');
    expect(screen.getByTestId('status-bot-1')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('name-bot-2')).toHaveTextContent('Sales Bot');
  });

  it('loads bot detail', async () => {
    cleanup = setupFetchMock([{
      url: '/api/bots/bot-1',
      response: { id: 'bot-1', name: 'Support Bot', description: 'Customer support chatbot' },
    }]);

    render(<BotDetail botId="bot-1" />);
    await waitFor(() => expect(screen.getByTestId('bot-detail')).toBeInTheDocument());
    expect(screen.getByTestId('bot-name')).toHaveTextContent('Support Bot');
    expect(screen.getByTestId('bot-desc')).toHaveTextContent('Customer support chatbot');
  });

  it('handles fetch error', async () => {
    cleanup = setupFetchMock([{
      url: '/api/bots',
      response: { error: 'Service unavailable' },
      status: 500,
    }]);

    render(<BotList />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });
});
