/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';

const mockDocuments = [
  { id: 'd1', documentId: 'doc-001', fileName: 'Invoice-2024.pdf', fileType: 'PDF', shareContext: 'Monthly invoice', serviceProvider: { id: 'sp1', name: 'Acme Corp', industry: 'Banking', verificationStatus: 'VERIFIED' }, createdAt: new Date().toISOString(), openedAt: null },
  { id: 'd2', documentId: 'doc-002', fileName: 'Report.xlsx', fileType: 'XLS', shareContext: 'Annual report', serviceProvider: { id: 'sp2', name: 'FinanceCo', industry: 'Finance', verificationStatus: 'VERIFIED' }, createdAt: new Date().toISOString(), openedAt: new Date().toISOString() },
];

vi.mock('@/hooks/useDocuments', () => ({
  useDocuments: () => ({
    documents: mockDocuments,
    totalCount: 2,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDetailParam', () => ({
  useDetailParam: () => ({
    selectedId: null,
    setSelectedId: vi.fn(),
    clearSelectedId: vi.fn(),
  }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@test.com', fullName: 'Test User', username: 'test' },
    token: 'mock-token',
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/documents',
  useSearchParams: () => new URLSearchParams(),
}));

import DocumentsPage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DocumentsPage', () => {
  it('renders document list with filenames', async () => {
    render(<DocumentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Invoice-2024.pdf')).toBeInTheDocument();
    });
    expect(screen.getByText('Report.xlsx')).toBeInTheDocument();
  });

  it('renders service provider names', async () => {
    render(<DocumentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
    expect(screen.getByText('FinanceCo')).toBeInTheDocument();
  });

  it('renders page header', async () => {
    render(<DocumentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });
});
