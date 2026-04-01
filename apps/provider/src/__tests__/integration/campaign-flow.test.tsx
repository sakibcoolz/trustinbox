import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GET_CAMPAIGNS, GET_CAMPAIGN } from '@/lib/graphql/campaigns';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'SP_ADMIN' },
    role: 'SP_ADMIN',
    isAuthenticated: true,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useQuery } from '@apollo/client';

function CampaignList() {
  const { data, loading, error } = useQuery(GET_CAMPAIGNS, {
    variables: { limit: 10, offset: 0 },
  });

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;

  const campaigns = data?.campaigns?.nodes ?? [];
  return (
    <div data-testid="campaign-list">
      <span data-testid="total">{data?.campaigns?.totalCount}</span>
      {campaigns.map((c: any, i: number) => (
        <div key={c.id ?? i} data-testid={`campaign-${i}`}>
          <span data-testid={`name-${i}`}>{c.name}</span>
          <span data-testid={`status-${i}`}>{c.status}</span>
        </div>
      ))}
    </div>
  );
}

const campaignListMock: MockedResponse = {
  request: {
    query: GET_CAMPAIGNS,
    variables: { limit: 10, offset: 0 },
  },
  result: {
    data: {
      campaigns: {
        nodes: [
          {
            __typename: 'Campaign',
            id: 'camp-1',
            name: 'Spring Promotion',
            description: 'Spring campaign',
            status: 'ACTIVE',
            category: 'ORGANIZATIONAL',
            channel: 'PUSH',
            priority: 'NORMAL',
            audienceSize: 500,
            sentCount: 480,
            deliveredCount: 470,
            failedCount: 10,
            scheduledAt: '2024-03-01T10:00:00Z',
            launchedAt: '2024-03-01T10:00:00Z',
            completedAt: null,
            createdAt: '2024-02-15T08:00:00Z',
            updatedAt: '2024-03-01T10:00:00Z',
          },
          {
            __typename: 'Campaign',
            id: 'camp-2',
            name: 'Summer Sale',
            description: null,
            status: 'DRAFT',
            category: 'ADVERTISEMENT',
            channel: 'EMAIL',
            priority: 'LOW',
            audienceSize: 0,
            sentCount: 0,
            deliveredCount: 0,
            failedCount: 0,
            scheduledAt: null,
            launchedAt: null,
            completedAt: null,
            createdAt: '2024-06-01T08:00:00Z',
            updatedAt: '2024-06-01T08:00:00Z',
          },
        ],
        totalCount: 2,
      },
    },
  },
};

describe('Campaign Flow Integration', () => {
  it('loads and displays campaigns', async () => {
    render(
      <MockedProvider mocks={[campaignListMock]} addTypename={false}>
        <CampaignList />
      </MockedProvider>,
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('campaign-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('name-0')).toHaveTextContent('Spring Promotion');
    expect(screen.getByTestId('status-0')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('name-1')).toHaveTextContent('Summer Sale');
    expect(screen.getByTestId('status-1')).toHaveTextContent('DRAFT');
  });

  it('handles network error', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: GET_CAMPAIGNS,
        variables: { limit: 10, offset: 0 },
      },
      error: new Error('Failed to fetch campaigns'),
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <CampaignList />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch campaigns');
  });
});
