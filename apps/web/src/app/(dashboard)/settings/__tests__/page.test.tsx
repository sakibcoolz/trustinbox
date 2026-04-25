/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';

// Settings index is a pure static server component — no hooks to mock
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import SettingsPage from '../page';

describe('SettingsPage', () => {
  it('renders settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders all settings section links', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Do Not Disturb')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('My Addresses')).toBeInTheDocument();
    expect(screen.getByText('Category Preferences')).toBeInTheDocument();
    expect(screen.getByText('Blocked Organizations')).toBeInTheDocument();
  });

  it('renders section descriptions', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Control what service providers can see/)).toBeInTheDocument();
    expect(screen.getByText(/Set quiet hours/)).toBeInTheDocument();
  });

  it('links to correct routes', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('link', { name: /Privacy/ })).toHaveAttribute('href', '/settings/privacy');
    expect(screen.getByRole('link', { name: /Do Not Disturb/ })).toHaveAttribute('href', '/settings/dnd');
  });
});
