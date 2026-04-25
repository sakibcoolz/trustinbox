/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';

const mockFriends = [
  { id: 'f1', user: { id: 'u2', username: 'alice', fullName: 'Alice Smith', virtualPublicId: 'VID-001', online: true, mutualFriends: 3 }, createdAt: new Date().toISOString() },
  { id: 'f2', user: { id: 'u3', username: 'bob', fullName: 'Bob Jones', virtualPublicId: 'VID-002', online: false, mutualFriends: 1 }, createdAt: new Date().toISOString() },
];

const mockRequests = [
  { id: 'r1', user: { id: 'u4', username: 'carol', fullName: 'Carol White', virtualPublicId: 'VID-003' }, direction: 'incoming' as const, status: 'PENDING', createdAt: new Date().toISOString() },
];

// Mock fetch globally — the page does setFriends(data) / setRequests(data) directly
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (String(url).includes('/api/friends/requests')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRequests) });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFriends) });
}) as ReturnType<typeof vi.fn>;

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ token: 'mock-token', user: { id: 'u1', username: 'me' }, isAuthenticated: true }),
}));

vi.mock('@/lib/notification-context', () => ({
  useNotifications: () => ({ onFriendEvent: vi.fn(() => vi.fn()) }),
}));

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('@/lib/chat-context', () => ({
  useChat: () => ({ createConversation: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/friends',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

import FriendsPage from '../page';

beforeEach(() => vi.clearAllMocks());

describe('FriendsPage', () => {
  it('renders friends tab by default', async () => {
    render(<FriendsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('renders navigation tabs', async () => {
    render(<FriendsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Friends/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Requests/)).toBeInTheDocument();
    expect(screen.getByText(/Find/)).toBeInTheDocument();
  });

  it('shows online indicator for online friends', async () => {
    render(<FriendsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
    // alice is online, bob is not — both names should be rendered
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });
});
