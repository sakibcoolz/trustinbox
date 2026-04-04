/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';

const mockLogin = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/auth/login',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    token: null,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('renders login form with email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders TrustInbox title', () => {
    render(<LoginPage />);
    expect(screen.getByText('TrustInbox')).toBeInTheDocument();
  });

  it('shows sign up link', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'bad@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows submitting state while login is in progress', async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    mockLogin.mockReturnValueOnce(new Promise<void>((r) => { resolveLogin = r; }));
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    resolveLogin!();
  });

  it('redirects to inbox when user is already logged in', async () => {
    vi.mocked(await import('@/lib/auth-context')).useAuth = vi.fn().mockReturnValue({
      login: mockLogin,
      user: { id: 'u1', email: 'x@x.com', fullName: 'X' },
      isLoading: false,
      isAuthenticated: true,
      token: 'tok',
    }) as ReturnType<typeof vi.fn>;

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/inbox');
    });
  });
});
