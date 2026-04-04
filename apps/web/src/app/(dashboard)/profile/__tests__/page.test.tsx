/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', fullName: 'John Doe', email: 'john@test.com', username: 'johndoe', avatarUrl: null },
    token: 'mock-token',
    isLoading: false,
    isAuthenticated: true,
    updateAvatar: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAvatarUpload', () => ({
  useAvatarUpload: () => ({
    status: 'idle',
    error: null,
    upload: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { id: 'u1', fullName: 'John Doe', email: 'john@test.com', mobile: '1234567890', bio: 'Test bio', joinedAt: '2024-01-01T00:00:00Z' },
    stats: { spCount: 3, messagesCount: 42, policiesCount: 5, privacyScore: 85 },
    serviceProviders: [{ id: 'sp1', name: 'Acme Bank', industry: 'Banking' }],
    activity: [{ id: 'a1', type: 'notification', category: 'PERSONAL', description: 'Received notification', timestamp: new Date().toISOString() }],
    privacy: { allowPersonalNotifications: true, allowSPNotifications: true, allowAdvertisements: false, allowCallbackRequests: true, allowChat: true, allowDocumentShares: true, requireCallApproval: true },
    sessions: null,
    loading: false,
    error: null,
    updateProfile: vi.fn().mockResolvedValue(undefined),
    updatePrivacy: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCareer', () => ({
  useCareer: () => ({
    workExperience: [],
    education: [],
    skills: [],
    loading: false,
    saving: false,
    error: null,
    saveWork: vi.fn(),
    deleteWork: vi.fn(),
    saveEducation: vi.fn(),
    deleteEducation: vi.fn(),
    addSkill: vi.fn(),
    deleteSkill: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

import ProfilePage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProfilePage', () => {
  it('renders user name', () => {
    render(<ProfilePage />);
    const names = screen.getAllByText('John Doe');
    expect(names.length).toBeGreaterThanOrEqual(1);
  });

  it('renders user email', () => {
    render(<ProfilePage />);
    const emails = screen.getAllByText('john@test.com');
    expect(emails.length).toBeGreaterThanOrEqual(1);
  });

  it('renders tabs', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Privacy & ID')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Career')).toBeInTheDocument();
  });

  it('renders stats in overview', () => {
    render(<ProfilePage />);
    expect(screen.getByText('42')).toBeInTheDocument(); // messagesCount
  });

  it('can switch to Activity tab', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.click(screen.getByText('Activity'));

    // Activity tab content should be visible
    expect(screen.getByText('Received notification')).toBeInTheDocument();
  });
});
