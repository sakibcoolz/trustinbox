/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRules = [
  { id: 'r1', scopeType: 'GLOBAL', scopeRefId: null, startTime: '22:00', endTime: '07:00', daysOfWeek: [1, 2, 3, 4, 5], isActive: true },
  { id: 'r2', scopeType: 'GLOBAL', scopeRefId: null, startTime: '13:00', endTime: '14:00', daysOfWeek: [0, 6], isActive: true },
];
const mockCreateRule = vi.fn().mockResolvedValue(undefined);
const mockUpdateRule = vi.fn().mockResolvedValue(undefined);
const mockDeleteRule = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useDNDRules', () => ({
  useDNDRules: () => ({
    rules: mockRules,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    createRule: mockCreateRule,
    updateRule: mockUpdateRule,
    deleteRule: mockDeleteRule,
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import DNDSettingsPage from '../../dnd/page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DNDSettingsPage', () => {
  it('renders page title', () => {
    render(<DNDSettingsPage />);
    expect(screen.getByText('Do Not Disturb')).toBeInTheDocument();
  });

  it('renders existing rules', () => {
    render(<DNDSettingsPage />);
    expect(screen.getByText('22:00 – 07:00')).toBeInTheDocument();
    expect(screen.getByText('13:00 – 14:00')).toBeInTheDocument();
  });

  it('renders Add Rule button', () => {
    render(<DNDSettingsPage />);
    expect(screen.getByText('Add Rule')).toBeInTheDocument();
  });

  it('shows form when Add Rule is clicked', async () => {
    const user = userEvent.setup();
    render(<DNDSettingsPage />);

    await user.click(screen.getByText('Add Rule'));

    expect(screen.getByText('Create Rule')).toBeInTheDocument();
  });

  it('calls deleteRule when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<DNDSettingsPage />);

    // Find delete buttons by title attribute
    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);
    expect(mockDeleteRule).toHaveBeenCalledWith('r1');
  });

  it('renders back link to settings', () => {
    render(<DNDSettingsPage />);
    const links = screen.getAllByRole('link');
    const backLink = links.find((a) => a.getAttribute('href') === '/settings');
    expect(backLink).toBeTruthy();
  });
});
