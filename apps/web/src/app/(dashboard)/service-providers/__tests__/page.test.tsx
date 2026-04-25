/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';

// Mock Apollo before any imports — the page calls useQuery directly
vi.mock('@apollo/client', () => {
  const nodes = [
    { id: 'sp1', slug: 'acme-bank', name: 'Acme Bank', industry: 'Banking', description: 'A bank', verificationStatus: 'VERIFIED', status: 'ACTIVE', website: 'https://acme.com', trustScore: 90, followerCount: 5, logoUrl: null },
    { id: 'sp2', slug: 'widget-inc', name: 'Widget Inc', industry: 'Technology', description: 'Tech', verificationStatus: 'PENDING', status: 'ACTIVE', website: null, trustScore: 60, followerCount: 1, logoUrl: null },
  ];
  return {
    useQuery: () => ({
      data: {
        serviceProviderDirectory: { nodes, totalCount: 2 },
        followedServiceProviders: { nodes: [], totalCount: 0 },
        nearbyServiceProviders: { nodes: [], totalCount: 0 },
        myCurrentAddress: null,
        bots: { nodes: [], totalCount: 0 },
      },
      loading: false,
      error: undefined,
    }),
    useMutation: () => [vi.fn(), { loading: false }],
    gql: (strings: TemplateStringsArray) => strings.join(''),
  };
});

const mockProviders = [
  { id: 'sp1', slug: 'acme-bank', name: 'Acme Bank', industry: 'Banking', description: 'A bank', verificationStatus: 'VERIFIED', status: 'ACTIVE', website: 'https://acme.com' },
  { id: 'sp2', slug: 'widget-inc', name: 'Widget Inc', industry: 'Technology', description: 'Tech company', verificationStatus: 'PENDING', status: 'ACTIVE', website: null },
];

vi.mock('@/hooks/useServiceProviders', () => ({
  useServiceProviders: () => ({
    providers: mockProviders,
    totalCount: 2,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    block: vi.fn().mockResolvedValue(undefined),
    unblock: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/useBlockedProviders', () => ({
  useBlockedProviders: () => ({
    blockedProviders: [],
    totalCount: 0,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    unblock: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/hooks/useDetailParam', () => ({
  useDetailParam: () => ({
    selectedId: null,
    setSelectedId: vi.fn(),
    clearSelectedId: vi.fn(),
  }),
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/service-providers',
  useSearchParams: () => new URLSearchParams(),
}));

import ServiceProvidersPage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ServiceProvidersPage', () => {
  it('renders provider names', async () => {
    render(<ServiceProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText('Acme Bank')).toBeInTheDocument();
    });
    expect(screen.getByText('Widget Inc')).toBeInTheDocument();
  });

  it('renders search input', async () => {
    render(<ServiceProvidersPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('renders industry labels', async () => {
    render(<ServiceProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText('Banking')).toBeInTheDocument();
    });
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });
});
