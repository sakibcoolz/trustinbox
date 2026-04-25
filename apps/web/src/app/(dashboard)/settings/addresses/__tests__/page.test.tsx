/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockAddresses = [
  { id: 'addr1', label: 'Home', addressLine1: '123 Main St', addressLine2: null, city: 'Springfield', state: 'IL', postalCode: '62701', country: 'US', isCurrent: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'addr2', label: 'Work', addressLine1: '456 Office Park', addressLine2: 'Suite 200', city: 'Chicago', state: 'IL', postalCode: '60601', country: 'US', isCurrent: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const mockCreate = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockSetCurrent = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useAddresses', () => ({
  useAddresses: () => ({
    addresses: mockAddresses,
    loading: false,
    error: undefined,
    createAddress: mockCreate,
    updateAddress: mockUpdate,
    deleteAddress: mockDelete,
    setCurrentAddress: mockSetCurrent,
    saving: false,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import AddressSettingsPage from '../page';

beforeEach(() => vi.clearAllMocks());

describe('AddressSettingsPage', () => {
  it('renders page heading', () => {
    render(<AddressSettingsPage />);
    expect(screen.getByText('My Addresses')).toBeInTheDocument();
  });

  it('renders address list', async () => {
    render(<AddressSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders address details', async () => {
    render(<AddressSettingsPage />);
    await waitFor(() => {
      // Address is rendered as a joined line: "123 Main St, Springfield, IL, 62701, US"
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Springfield/)).toBeInTheDocument();
  });

  it('renders add address button', () => {
    render(<AddressSettingsPage />);
    expect(screen.getByText(/Add New Address/i)).toBeInTheDocument();
  });
});
