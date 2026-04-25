/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSlots = [
  { id: 's1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotType: 'Callback', isActive: true },
  { id: 's2', dayOfWeek: 3, startTime: '10:00', endTime: '12:00', slotType: 'Meeting', isActive: true },
];

const mockCreate = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useAvailabilitySlots', () => ({
  useAvailabilitySlots: () => ({
    slots: mockSlots,
    loading: false,
    error: undefined,
    createSlot: mockCreate,
    deleteSlot: mockDelete,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import AvailabilitySettingsPage from '../page';

beforeEach(() => vi.clearAllMocks());

describe('AvailabilitySettingsPage', () => {
  it('renders page heading', () => {
    render(<AvailabilitySettingsPage />);
    expect(screen.getByText('Availability')).toBeInTheDocument();
  });

  it('renders add slot button', () => {
    render(<AvailabilitySettingsPage />);
    expect(screen.getByText('Add Slot')).toBeInTheDocument();
  });

  it('renders existing slot times', async () => {
    render(<AvailabilitySettingsPage />);
    await waitFor(() => {
      // Renders as "09:00 – 17:00" (em dash with spaces)
      expect(screen.getByText(/09:00.*17:00/)).toBeInTheDocument();
    });
    expect(screen.getByText(/10:00.*12:00/)).toBeInTheDocument();
  });

  it('shows slot form when Add Slot clicked', async () => {
    const user = userEvent.setup();
    render(<AvailabilitySettingsPage />);
    const addBtns = screen.getAllByText('Add Slot');
    await user.click(addBtns[0]);
    await waitFor(() => {
      // Form has a unique heading only visible when showForm=true
      expect(screen.getByText('New Availability Slot')).toBeInTheDocument();
    });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
