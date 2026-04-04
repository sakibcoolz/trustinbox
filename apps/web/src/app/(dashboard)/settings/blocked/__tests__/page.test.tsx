/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockBlockedProviders = [
  { id: 'sp1', name: 'Acme Corp', industry: 'Banking', blockedAt: '2024-01-15T10:00:00Z', reason: 'Spam' },
  { id: 'sp2', name: 'Widget Inc', industry: 'Healthcare', blockedAt: '2024-01-20T10:00:00Z', reason: null },
];
const mockUnblock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useBlockedProviders', () => ({
  useBlockedProviders: () => ({
    blockedProviders: mockBlockedProviders,
    totalCount: 2,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    unblock: mockUnblock,
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import BlockedOrganizationsPage from '../../blocked/page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BlockedOrganizationsPage', () => {
  it('renders page title', () => {
    render(<BlockedOrganizationsPage />);
    expect(screen.getByText('Blocked Organizations')).toBeInTheDocument();
  });

  it('renders blocked providers list', () => {
    render(<BlockedOrganizationsPage />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Widget Inc')).toBeInTheDocument();
  });

  it('renders unblock buttons', () => {
    render(<BlockedOrganizationsPage />);
    const unblockButtons = screen.getAllByText('Unblock');
    expect(unblockButtons).toHaveLength(2);
  });

  it('calls unblock when Unblock button is clicked', async () => {
    const user = userEvent.setup();
    render(<BlockedOrganizationsPage />);

    const unblockButtons = screen.getAllByText('Unblock');
    await user.click(unblockButtons[0]);

    expect(mockUnblock).toHaveBeenCalledWith('sp1');
  });

  it('renders back link to settings', () => {
    render(<BlockedOrganizationsPage />);
    const links = screen.getAllByRole('link');
    const backLink = links.find((a) => a.getAttribute('href') === '/settings');
    expect(backLink).toBeTruthy();
  });
});
