/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all hooks before importing the page
const mockPrivacy = {
  allowPersonalNotifications: true,
  allowSPNotifications: true,
  allowAdvertisements: false,
  allowCallbackRequests: true,
  allowChat: true,
  allowDocumentShares: true,
  requireCallApproval: true,
};
const mockUpdatePrivacy = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/usePrivacySettings', () => ({
  usePrivacySettings: () => ({
    privacy: mockPrivacy,
    loading: false,
    error: undefined,
    updatePrivacy: mockUpdatePrivacy,
    saving: false,
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import PrivacySettingsPage from '../../privacy/page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PrivacySettingsPage', () => {
  it('renders page title', () => {
    render(<PrivacySettingsPage />);
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('renders all 7 toggle labels', () => {
    render(<PrivacySettingsPage />);
    expect(screen.getByText('Allow Personal Notifications')).toBeInTheDocument();
    expect(screen.getByText('Allow Service Provider Notifications')).toBeInTheDocument();
    expect(screen.getByText('Allow Advertisements')).toBeInTheDocument();
    expect(screen.getByText('Allow Callback Requests')).toBeInTheDocument();
    expect(screen.getByText('Allow Chat Messages')).toBeInTheDocument();
    expect(screen.getByText('Allow Document Shares')).toBeInTheDocument();
    expect(screen.getByText('Require Callback Approval')).toBeInTheDocument();
  });

  it('renders Save button', () => {
    render(<PrivacySettingsPage />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('renders back link to settings', () => {
    render(<PrivacySettingsPage />);
    const backLink = screen.getByRole('link');
    expect(backLink).toHaveAttribute('href', '/settings');
  });

  it('calls updatePrivacy when Save is clicked', async () => {
    const user = userEvent.setup();
    render(<PrivacySettingsPage />);

    await user.click(screen.getByText('Save Changes'));

    expect(mockUpdatePrivacy).toHaveBeenCalled();
  });
});
