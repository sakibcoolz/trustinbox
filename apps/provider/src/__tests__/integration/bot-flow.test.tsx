import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GET_BOTS, GET_BOT } from '@/lib/graphql/bots';

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

function BotList() {
  const { data, loading, error } = useQuery(GET_BOTS);

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;

  const bots = data?.bots ?? [];
  return (
    <div data-testid="bot-list">
      {bots.map((bot: any) => (
        <div key={bot.id} data-testid={`bot-${bot.id}`}>
          <span data-testid={`name-${bot.id}`}>{bot.name}</span>
          <span data-testid={`status-${bot.id}`}>{bot.status}</span>
          <span data-testid={`model-${bot.id}`}>{bot.model}</span>
        </div>
      ))}
    </div>
  );
}

function BotDetail({ botId }: { botId: string }) {
  const { data, loading } = useQuery(GET_BOT, { variables: { id: botId } });
  if (loading) return <div data-testid="detail-loading">Loading...</div>;
  const bot = data?.bot;
  return (
    <div data-testid="bot-detail">
      <span data-testid="bot-name">{bot?.name}</span>
      <span data-testid="bot-desc">{bot?.description}</span>
    </div>
  );
}

const botsListMock: MockedResponse = {
  request: { query: GET_BOTS },
  result: {
    data: {
      bots: [
        {
          id: 'bot-1',
          name: 'Support Bot',
          description: 'Customer support chatbot',
          status: 'ACTIVE',
          model: 'gpt-4',
          totalInteractions: 1024,
          lastActiveAt: '2024-01-15T12:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'bot-2',
          name: 'Sales Bot',
          description: 'Lead qualification bot',
          status: 'INACTIVE',
          model: 'gpt-3.5-turbo',
          totalInteractions: 0,
          lastActiveAt: null,
          createdAt: '2024-06-01T00:00:00Z',
        },
      ],
    },
  },
};

const botDetailMock: MockedResponse = {
  request: { query: GET_BOT, variables: { id: 'bot-1' } },
  result: {
    data: {
      bot: {
        id: 'bot-1',
        name: 'Support Bot',
        description: 'Customer support chatbot',
        status: 'ACTIVE',
        model: 'gpt-4',
        systemPrompt: 'You are helpful.',
        temperature: 0.7,
        maxTokens: 2048,
        totalInteractions: 1024,
        lastActiveAt: '2024-01-15T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
      },
    },
  },
};

describe('Bot Flow Integration', () => {
  it('loads and displays bot list', async () => {
    render(
      <MockedProvider mocks={[botsListMock]} addTypename={false}>
        <BotList />
      </MockedProvider>,
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('bot-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('name-bot-1')).toHaveTextContent('Support Bot');
    expect(screen.getByTestId('status-bot-1')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('model-bot-1')).toHaveTextContent('gpt-4');
    expect(screen.getByTestId('name-bot-2')).toHaveTextContent('Sales Bot');
    expect(screen.getByTestId('status-bot-2')).toHaveTextContent('INACTIVE');
  });

  it('loads bot detail', async () => {
    render(
      <MockedProvider mocks={[botDetailMock]} addTypename={false}>
        <BotDetail botId="bot-1" />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('bot-detail')).toBeInTheDocument();
    });

    expect(screen.getByTestId('bot-name')).toHaveTextContent('Support Bot');
    expect(screen.getByTestId('bot-desc')).toHaveTextContent('Customer support chatbot');
  });

  it('handles query error', async () => {
    const errorMock: MockedResponse = {
      request: { query: GET_BOTS },
      error: new Error('Bot service unavailable'),
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <BotList />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Bot service unavailable');
  });
});
