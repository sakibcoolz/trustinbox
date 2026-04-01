import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import {
  GET_WEBHOOK_SUBSCRIPTIONS,
  CREATE_WEBHOOK_SUBSCRIPTION,
  DELETE_WEBHOOK_SUBSCRIPTION,
  TEST_WEBHOOK_SUBSCRIPTION,
} from '@/lib/graphql/webhooks';

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

function WebhookList() {
  const { data, loading, error } = useQuery(GET_WEBHOOK_SUBSCRIPTIONS);

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;

  const webhooks = data?.webhookSubscriptions ?? [];
  return (
    <div data-testid="webhook-list">
      {webhooks.map((wh: any) => (
        <div key={wh.id} data-testid={`wh-${wh.id}`}>
          <span data-testid={`url-${wh.id}`}>{wh.url}</span>
          <span data-testid={`status-${wh.id}`}>{wh.status}</span>
          <span data-testid={`events-${wh.id}`}>{wh.events.join(', ')}</span>
        </div>
      ))}
    </div>
  );
}

function WebhookCreator({ onCreated }: { onCreated: (id: string) => void }) {
  const [createWebhook, { loading, error }] = useMutation(CREATE_WEBHOOK_SUBSCRIPTION);

  async function handleCreate() {
    const result = await createWebhook({
      variables: {
        input: {
          url: 'https://example.com/hook',
          events: ['NotificationDelivered'],
          secret: 'sec123',
        },
      },
    });
    if (result.data) {
      onCreated(result.data.createWebhookSubscription.id);
    }
  }

  return (
    <div>
      <button data-testid="create-btn" onClick={handleCreate} disabled={loading}>
        Create
      </button>
      {error && <span data-testid="create-error">{error.message}</span>}
    </div>
  );
}

const webhookListMock: MockedResponse = {
  request: { query: GET_WEBHOOK_SUBSCRIPTIONS },
  result: {
    data: {
      webhookSubscriptions: [
        {
          id: 'wh-1',
          url: 'https://api.example.com/webhook',
          events: ['NotificationDelivered', 'CallbackCreated'],
          status: 'ACTIVE',
          failureCount: 0,
          maxRetries: 5,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          id: 'wh-2',
          url: 'https://api.example.com/events',
          events: ['CampaignCompleted'],
          status: 'PAUSED',
          failureCount: 3,
          maxRetries: 5,
          createdAt: '2024-02-01T00:00:00Z',
          updatedAt: '2024-02-10T00:00:00Z',
        },
      ],
    },
  },
};

const createWebhookMock: MockedResponse = {
  request: {
    query: CREATE_WEBHOOK_SUBSCRIPTION,
    variables: {
      input: {
        url: 'https://example.com/hook',
        events: ['NotificationDelivered'],
        secret: 'sec123',
      },
    },
  },
  result: {
    data: {
      createWebhookSubscription: {
        id: 'wh-3',
        url: 'https://example.com/hook',
        events: ['NotificationDelivered'],
        status: 'ACTIVE',
        failureCount: 0,
        maxRetries: 5,
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      },
    },
  },
};

describe('Webhook Lifecycle Integration', () => {
  it('loads and displays webhook subscriptions', async () => {
    render(
      <MockedProvider mocks={[webhookListMock]} addTypename={false}>
        <WebhookList />
      </MockedProvider>,
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('webhook-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('url-wh-1')).toHaveTextContent('https://api.example.com/webhook');
    expect(screen.getByTestId('status-wh-1')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('events-wh-1')).toHaveTextContent('NotificationDelivered, CallbackCreated');
    expect(screen.getByTestId('url-wh-2')).toHaveTextContent('https://api.example.com/events');
    expect(screen.getByTestId('status-wh-2')).toHaveTextContent('PAUSED');
  });

  it('creates a new webhook subscription', async () => {
    const onCreated = vi.fn();
    render(
      <MockedProvider mocks={[createWebhookMock]} addTypename={false}>
        <WebhookCreator onCreated={onCreated} />
      </MockedProvider>,
    );

    const btn = screen.getByTestId('create-btn');
    btn.click();

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('wh-3');
    });
  });

  it('handles list fetch error', async () => {
    const errorMock: MockedResponse = {
      request: { query: GET_WEBHOOK_SUBSCRIPTIONS },
      error: new Error('Webhook service unreachable'),
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <WebhookList />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Webhook service unreachable');
  });
});
