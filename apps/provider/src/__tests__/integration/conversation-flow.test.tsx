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

function ConversationList() {
  const { data, loading, error } = useData<{ nodes: any[]; totalCount: number }>('/api/conversations?limit=10&offset=0');
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  const conversations = data?.nodes ?? [];
  return (
    <div data-testid="conv-list">
      <span data-testid="total">{data?.totalCount}</span>
      {conversations.map((c: any, i: number) => (
        <div key={c.id ?? i} data-testid={`conv-${i}`}>
          <span data-testid={`name-${i}`}>{c.participantName}</span>
          <span data-testid={`status-${i}`}>{c.status}</span>
          <span data-testid={`unread-${i}`}>{c.unreadCount}</span>
        </div>
      ))}
    </div>
  );
}

function ConversationDetail({ id }: { id: string }) {
  const { data, loading } = useData<any>(`/api/conversations/${id}`);
  if (loading) return <div data-testid="detail-loading">Loading...</div>;
  return (
    <div data-testid="conv-detail">
      <span data-testid="participant">{data?.participantName}</span>
      <span data-testid="msg-count">{data?.messages?.nodes?.length ?? 0}</span>
    </div>
  );
}

describe('Conversation Flow Integration', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); vi.restoreAllMocks(); });

  it('loads and displays conversation list', async () => {
    cleanup = setupFetchMock([{
      url: '/api/conversations',
      response: {
        nodes: [
          { id: 'c-1', participantName: 'Jane Doe', status: 'ACTIVE', unreadCount: 3 },
          { id: 'c-2', participantName: 'John Smith', status: 'CLOSED', unreadCount: 0 },
        ],
        totalCount: 2,
      },
    }]);

    render(<ConversationList />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('conv-list')).toBeInTheDocument());
    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('name-0')).toHaveTextContent('Jane Doe');
    expect(screen.getByTestId('unread-0')).toHaveTextContent('3');
  });

  it('loads conversation detail', async () => {
    cleanup = setupFetchMock([{
      url: '/api/conversations/c-1',
      response: {
        id: 'c-1',
        participantName: 'Jane Doe',
        messages: { nodes: [{ id: 'm-1', body: 'Hello' }], totalCount: 1 },
      },
    }]);

    render(<ConversationDetail id="c-1" />);
    await waitFor(() => expect(screen.getByTestId('conv-detail')).toBeInTheDocument());
    expect(screen.getByTestId('participant')).toHaveTextContent('Jane Doe');
    expect(screen.getByTestId('msg-count')).toHaveTextContent('1');
  });

  it('handles error gracefully', async () => {
    cleanup = setupFetchMock([{
      url: '/api/conversations',
      response: { error: 'Timeout' },
      status: 500,
    }]);

    render(<ConversationList />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });
});
