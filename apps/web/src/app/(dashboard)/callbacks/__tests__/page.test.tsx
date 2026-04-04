/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockApprove = vi.fn().mockResolvedValue(undefined);
const mockReject = vi.fn().mockResolvedValue(undefined);

const mockCallbacks = [
  { id: 'cb1', reason: 'Account consultation', details: 'Need to discuss account options', status: 'PENDING', requestedAt: new Date().toISOString(), respondedAt: null, approvedSlotStart: null, approvedSlotEnd: null, serviceProvider: { id: 'sp1', name: 'Acme Bank', industry: 'Banking', verificationStatus: 'VERIFIED' } },
  { id: 'cb2', reason: 'Insurance renewal', details: null, status: 'APPROVED', requestedAt: new Date().toISOString(), respondedAt: new Date().toISOString(), approvedSlotStart: '2024-02-01T10:00:00Z', approvedSlotEnd: '2024-02-01T10:30:00Z', serviceProvider: { id: 'sp2', name: 'InsureCo', industry: 'Insurance', verificationStatus: 'VERIFIED' } },
  { id: 'cb3', reason: 'Rejected test', details: null, status: 'REJECTED', requestedAt: new Date().toISOString(), respondedAt: new Date().toISOString(), approvedSlotStart: null, approvedSlotEnd: null, serviceProvider: { id: 'sp3', name: 'SpamCo', industry: 'Marketing', verificationStatus: 'PENDING' } },
];

vi.mock('@/hooks/useCallbacks', () => ({
  useCallbacks: () => ({
    callbacks: mockCallbacks,
    totalCount: 3,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    approve: mockApprove,
    reject: mockReject,
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
  usePathname: () => '/callbacks',
  useSearchParams: () => new URLSearchParams(),
}));

import CallbackRequestsPage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CallbackRequestsPage', () => {
  it('renders callback list', async () => {
    render(<CallbackRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('Account consultation')).toBeInTheDocument();
    });
    expect(screen.getByText('Insurance renewal')).toBeInTheDocument();
  });

  it('renders status tabs', async () => {
    render(<CallbackRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText(/^All/)).toBeInTheDocument();
    });
    // 'Pending' appears in both tab and badge, so use getAllByText
    const pendingEls = screen.getAllByText('Pending');
    expect(pendingEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders service provider names', async () => {
    render(<CallbackRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Bank')).toBeInTheDocument();
    });
    expect(screen.getByText('InsureCo')).toBeInTheDocument();
  });

  it('renders status badges', async () => {
    render(<CallbackRequestsPage />);
    await waitFor(() => {
      // Status badges use statusConfig labels (e.g. 'Pending' not 'PENDING')
      const pendingEls = screen.getAllByText('Pending');
      const approvedEls = screen.getAllByText('Approved');
      expect(pendingEls.length).toBeGreaterThanOrEqual(1);
      expect(approvedEls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
