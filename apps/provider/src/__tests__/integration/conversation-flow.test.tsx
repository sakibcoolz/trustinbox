import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { CONVERSATION_LIST_QUERY, CONVERSATION_DETAIL_QUERY } from '@/lib/graphql/conversations';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'AGENT' },
    role: 'AGENT',
    isAuthenticated: true,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useQuery } from '@apollo/client';

function ConversationList() {
  const { data, loading, error } = useQuery(CONVERSATION_LIST_QUERY, {
    variables: { limit: 20, offset: 0 },
  });

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;

  const conversations = data?.conversations?.nodes ?? [];
  return (
    <div data-testid="conversation-list">
      <span data-testid="total">{data?.conversations?.totalCount}</span>
      {conversations.map((conv: any) => (
        <div key={conv.id} data-testid={`conv-${conv.id}`}>
          <span data-testid={`name-${conv.id}`}>{conv.participantName}</span>
          <span data-testid={`msg-${conv.id}`}>{conv.lastMessage}</span>
          <span data-testid={`unread-${conv.id}`}>{conv.unreadCount}</span>
        </div>
      ))}
    </div>
  );
}

const conversationListMock: MockedResponse = {
  request: {
    query: CONVERSATION_LIST_QUERY,
    variables: { limit: 20, offset: 0 },
  },
  result: {
    data: {
      conversations: {
        nodes: [
          {
            id: 'conv-1',
            participantVirtualId: 'VID-001',
            participantName: 'Jane Doe',
            lastMessage: 'Thanks for the help!',
            lastMessageAt: '2024-01-15T11:00:00Z',
            unreadCount: 2,
            status: 'ACTIVE',
            assignedAgentId: 'u1',
            assignedAgentName: 'Agent Smith',
            createdAt: '2024-01-10T08:00:00Z',
          },
          {
            id: 'conv-2',
            participantVirtualId: 'VID-002',
            participantName: 'John Smith',
            lastMessage: 'When will my order arrive?',
            lastMessageAt: '2024-01-15T10:30:00Z',
            unreadCount: 0,
            status: 'ACTIVE',
            assignedAgentId: null,
            assignedAgentName: null,
            createdAt: '2024-01-14T14:00:00Z',
          },
        ],
        totalCount: 2,
      },
    },
  },
};

describe('Conversation Flow Integration', () => {
  it('loads and displays conversations', async () => {
    render(
      <MockedProvider mocks={[conversationListMock]} addTypename={false}>
        <ConversationList />
      </MockedProvider>,
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('total')).toHaveTextContent('2');
    expect(screen.getByTestId('name-conv-1')).toHaveTextContent('Jane Doe');
    expect(screen.getByTestId('msg-conv-1')).toHaveTextContent('Thanks for the help!');
    expect(screen.getByTestId('unread-conv-1')).toHaveTextContent('2');
    expect(screen.getByTestId('name-conv-2')).toHaveTextContent('John Smith');
    expect(screen.getByTestId('unread-conv-2')).toHaveTextContent('0');
  });

  it('handles network error', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: CONVERSATION_LIST_QUERY,
        variables: { limit: 20, offset: 0 },
      },
      error: new Error('Connection lost'),
    };

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <ConversationList />
      </MockedProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Connection lost');
  });
});
