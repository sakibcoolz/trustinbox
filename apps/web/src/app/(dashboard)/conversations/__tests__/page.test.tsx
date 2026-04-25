/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';

const mockConversations = [
  { id: 'c1', participants: [], lastMessage: { content: 'Hello there', createdAt: new Date().toISOString() }, unreadCount: 1 },
  { id: 'c2', participants: [], lastMessage: null, unreadCount: 0 },
];

vi.mock('@/lib/chat-context', () => ({
  useChat: () => ({
    activeConversation: null,
    setActiveConversation: vi.fn(),
    conversations: mockConversations,
    isLoadingConversations: false,
    refreshConversations: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/conversations',
  useSearchParams: () => new URLSearchParams(),
}));

// Stub heavy sub-components to keep tests unit-level
vi.mock('@/components/chat/conversation-list', () => ({
  ConversationList: ({ activeId }: { activeId: string | null }) => (
    <div data-testid="conversation-list" data-active={activeId} />
  ),
}));

vi.mock('@/components/chat/chat-area', () => ({
  ChatArea: ({ conversation }: { conversation: unknown }) => (
    <div data-testid="chat-area" data-has-conversation={String(conversation !== null)} />
  ),
}));

import ConversationsPage from '../page';

beforeEach(() => vi.clearAllMocks());

describe('ConversationsPage', () => {
  it('renders without errors', () => {
    render(<ConversationsPage />);
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
  });

  it('renders conversation list panel', () => {
    render(<ConversationsPage />);
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
  });

  it('renders chat area placeholder when no conversation selected', () => {
    render(<ConversationsPage />);
    const chatArea = screen.getByTestId('chat-area');
    expect(chatArea).toBeInTheDocument();
    expect(chatArea.dataset.hasConversation).toBe('false');
  });
});
