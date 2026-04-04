/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockMarkRead = vi.fn().mockResolvedValue(undefined);
const mockArchive = vi.fn().mockResolvedValue(undefined);
const mockMarkAllRead = vi.fn().mockResolvedValue(undefined);
const mockRefetch = vi.fn();

const mockNotifications = [
  { id: 'n1', title: 'Payment processed', body: 'Your payment of $50 was processed', category: 'SERVICE_PROVIDER', status: 'UNREAD', priority: 'NORMAL', metadata: null, serviceProvider: { id: 'sp1', name: 'Acme Bank', industry: 'Banking', verificationStatus: 'VERIFIED' }, createdAt: new Date().toISOString() },
  { id: 'n2', title: 'Promo offer', body: 'Special discount for you', category: 'ADVERTISEMENT', status: 'READ', priority: 'LOW', metadata: null, serviceProvider: { id: 'sp2', name: 'Shop Inc', industry: 'Retail', verificationStatus: 'VERIFIED' }, createdAt: new Date().toISOString() },
  { id: 'n3', title: 'Friend request', body: 'New friend request', category: 'PERSONAL', status: 'UNREAD', priority: 'NORMAL', metadata: null, serviceProvider: null, createdAt: new Date().toISOString() },
];

vi.mock('@/hooks/useNotificationsGql', () => ({
  useNotificationsGql: () => ({
    notifications: mockNotifications,
    totalCount: 3,
    loading: false,
    error: undefined,
    refetch: mockRefetch,
    markRead: mockMarkRead,
    archive: mockArchive,
    markAllRead: mockMarkAllRead,
  }),
}));

vi.mock('@/lib/notification-context', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 2,
    fetchNotifications: vi.fn(),
    markAllRead: vi.fn(),
    markRead: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDetailParam', () => ({
  useDetailParam: () => ({
    selectedId: null,
    setSelectedId: vi.fn(),
    clearSelectedId: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/inbox',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

import InboxPage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InboxPage', () => {
  it('renders inbox page with tabs', async () => {
    render(<InboxPage />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByText('Ads')).toBeInTheDocument();
  });

  it('renders notification titles', async () => {
    render(<InboxPage />);
    await waitFor(() => {
      expect(screen.getByText('Payment processed')).toBeInTheDocument();
    });
    expect(screen.getByText('Promo offer')).toBeInTheDocument();
    expect(screen.getByText('Friend request')).toBeInTheDocument();
  });

  it('renders notification body text', async () => {
    render(<InboxPage />);
    await waitFor(() => {
      expect(screen.getByText('Your payment of $50 was processed')).toBeInTheDocument();
    });
    expect(screen.getByText('Special discount for you')).toBeInTheDocument();
  });

  it('renders category tabs for filtering', async () => {
    render(<InboxPage />);
    await waitFor(() => {
      const tabs = ['All', 'Personal', 'Business', 'Ads'];
      tabs.forEach((tab) => {
        expect(screen.getByText(tab)).toBeInTheDocument();
      });
    });
  });
});
