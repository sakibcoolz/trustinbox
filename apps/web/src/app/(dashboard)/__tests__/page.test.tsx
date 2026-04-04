/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', fullName: 'John Doe', email: 'john@test.com', username: 'john' },
    isLoading: false,
    isAuthenticated: true,
    token: 'mock-token',
  }),
}));

vi.mock('@/lib/notification-context', () => ({
  useNotifications: () => ({
    unreadCount: 5,
    notifications: [],
    fetchNotifications: vi.fn(),
    markAllRead: vi.fn(),
    markRead: vi.fn(),
  }),
}));

vi.mock('@/lib/chat-context', () => ({
  useChat: () => ({
    conversations: [
      { id: 'c1', unreadCount: 2 },
      { id: 'c2', unreadCount: 0 },
    ],
  }),
}));

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({
    summary: {
      unreadNotifications: 12,
      pendingCallbacks: 3,
      activeConversations: 5,
      sharedDocuments: 8,
      blockedProviders: 1,
      dndActive: false,
      totalConversations: 5,
      pendingCallbackRequests: 3,
      totalFriends: 7,
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useNotificationsGql', () => ({
  useNotificationsGql: () => ({
    notifications: [
      { id: 'n1', title: 'Payment received', body: 'Your payment was processed', category: 'SERVICE_PROVIDER', status: 'UNREAD', priority: 'NORMAL', metadata: null, serviceProvider: { id: 'sp1', name: 'Acme Bank', industry: 'Banking', verificationStatus: 'VERIFIED' }, createdAt: new Date().toISOString() },
      { id: 'n2', title: 'Welcome aboard', body: 'Thanks for joining', category: 'PERSONAL', status: 'READ', priority: 'NORMAL', metadata: null, serviceProvider: null, createdAt: new Date().toISOString() },
    ],
    totalCount: 2,
    loading: false,
    error: undefined,
  }),
}));

vi.mock('@/features/dashboard/ai-summary-widget', () => ({
  AISummaryWidget: () => <div data-testid="ai-summary">AI Summary</div>,
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import DashboardPage from '../page';

describe('DashboardPage', () => {
  it('renders welcome greeting with user first name', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/welcome back.*john/i)).toBeInTheDocument();
  });

  it('renders stats cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Unread')).toBeInTheDocument();
    const conversationEls = screen.getAllByText('Conversations');
    expect(conversationEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pending Callbacks')).toBeInTheDocument();
    const friendsEls = screen.getAllByText('Friends');
    expect(friendsEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders stat values from summary', () => {
    render(<DashboardPage />);
    expect(screen.getByText('12')).toBeInTheDocument(); // unreadNotifications
  });

  it('renders recent notifications', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Payment received')).toBeInTheDocument();
  });

  it('renders AI summary widget', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('ai-summary')).toBeInTheDocument();
  });

  it('links stats cards to correct pages', () => {
    render(<DashboardPage />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/inbox');
    expect(hrefs).toContain('/callbacks');
  });
});
