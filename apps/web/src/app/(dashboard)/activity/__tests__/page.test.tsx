/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';

const mockActivities = [
  { id: 'a1', type: 'notification', title: 'Payment processed', description: 'Acme Bank processed your payment', href: '/inbox/n1', timestamp: new Date().toISOString(), metadata: { serviceProviderName: 'Acme Bank', status: 'DELIVERED' } },
  { id: 'a2', type: 'callback', title: 'Callback approved', description: 'Your callback was approved', href: '/callbacks/cb1', timestamp: new Date().toISOString(), metadata: { serviceProviderName: 'InsureCo', status: 'APPROVED' } },
  { id: 'a3', type: 'message', title: 'New message', description: 'You received a new message', href: '/conversations/c1', timestamp: new Date().toISOString(), metadata: { serviceProviderName: undefined, status: undefined } },
];

vi.mock('@/hooks/useActivityFeed', () => ({
  useActivityFeed: () => ({
    activities: mockActivities,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
    counts: { all: 3, notification: 1, callback: 1, message: 1 },
  }),
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

import ActivityPage from '../page';

beforeEach(() => vi.clearAllMocks());

describe('ActivityPage', () => {
  it('renders activity items', async () => {
    render(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getByText('Payment processed')).toBeInTheDocument();
    });
    expect(screen.getByText('Callback approved')).toBeInTheDocument();
    expect(screen.getByText('New message')).toBeInTheDocument();
  });

  it('renders filter tabs', async () => {
    render(<ActivityPage />);
    await waitFor(() => {
      // Tabs render as "Label (count)" — match by prefix
      expect(screen.getByText(/^All/)).toBeInTheDocument();
    });
    expect(screen.getByText(/^Notifications/)).toBeInTheDocument();
    expect(screen.getByText(/^Callbacks/)).toBeInTheDocument();
    expect(screen.getByText(/^Messages/)).toBeInTheDocument();
  });

  it('renders activity descriptions', async () => {
    render(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Bank processed your payment')).toBeInTheDocument();
    });
  });

  it('renders service provider names', async () => {
    render(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Bank')).toBeInTheDocument();
    });
    expect(screen.getByText('InsureCo')).toBeInTheDocument();
  });
});
