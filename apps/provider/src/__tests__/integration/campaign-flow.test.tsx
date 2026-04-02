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

function CampaignList() {
  const { data, loading, error } = useData<{ nodes: any[]; totalCount: number }>('/api/campaigns?limit=10&offset=0');
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  const campaigns = data?.nodes ?? [];
  return (
    <div data-testid="campaign-list">
      <span data-testid="total">{data?.totalCount}</span>
      {campaigns.map((c: any, i: number) => (
        <div key={c.id ?? i} data-testid={`campaign-${i}`}>
          <span data-testid={`name-${i}`}>{c.name}</span>
          <span data-testid={`status-${i}`}>{c.status}</span>
        </div>
      ))}
    </div>
  );
}

describe('Campaign Flow Integration', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); vi.restoreAllMocks(); });

  it('loads and displays campaigns', async () => {
    cleanup = setupFetchMock([{
      url: '/api/campaigns',
      response: {
        nodes: [
          { id: 'c-1', name: 'Spring Sale', status: 'ACTIVE' },
          { id: 'c-2', name: 'Welcome Series', status: 'DRAFT' },
        ],
        totalCount: 2,
      },
    }]);

    render(<CampaignList />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('campaign-list')).toBeInTheDocument());
    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('name-0')).toHaveTextContent('Spring Sale');
    expect(screen.getByTestId('status-0')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('name-1')).toHaveTextContent('Welcome Series');
  });

  it('handles error', async () => {
    cleanup = setupFetchMock([{
      url: '/api/campaigns',
      response: { error: 'Forbidden' },
      status: 403,
    }]);

    render(<CampaignList />);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });
});
