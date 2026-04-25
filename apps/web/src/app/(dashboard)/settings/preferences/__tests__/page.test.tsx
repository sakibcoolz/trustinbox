/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  useQuery: () => ({ data: undefined, loading: false, error: undefined }),
  useMutation: () => [vi.fn(), { loading: false }],
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/sounds', () => ({
  isSoundEnabled: () => true,
  setSoundEnabled: vi.fn(),
  playNotificationSound: vi.fn(),
}));

vi.mock('@/lib/graphql/settings', () => ({
  MY_PRIVACY_PREFERENCES: 'MY_PRIVACY_PREFERENCES',
  UPDATE_PRIVACY: 'UPDATE_PRIVACY',
}));

vi.mock('@/lib/push-notifications', () => ({
  isNotificationSupported: () => false,
  getNotificationPermission: () => 'default',
  requestNotificationPermission: vi.fn(),
  isPushEnabled: () => false,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import PreferencesPage from '../page';

describe('PreferencesPage', () => {
  it('renders category preferences heading', () => {
    render(<PreferencesPage />);
    expect(screen.getByText('Category Preferences')).toBeInTheDocument();
  });

  it('renders all three categories', () => {
    render(<PreferencesPage />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Service Provider')).toBeInTheDocument();
    expect(screen.getByText('Advertisement')).toBeInTheDocument();
  });

  it('renders notification sound section', () => {
    render(<PreferencesPage />);
    expect(screen.getByText('Notification Sounds')).toBeInTheDocument();
  });

  it('renders category descriptions', () => {
    render(<PreferencesPage />);
    expect(screen.getByText(/Direct messages and personal notifications/)).toBeInTheDocument();
    expect(screen.getByText(/Promotional content/)).toBeInTheDocument();
  });
});
