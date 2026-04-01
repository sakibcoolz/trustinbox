import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCMSPermissions } from '@/hooks/useAuth';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  useRequireAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('useCMSPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full CMS access for SP_ADMIN', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'SP_ADMIN', id: 'u1' },
      loading: false,
    });

    const { result } = renderHook(() => useCMSPermissions());
    expect(result.current.permissions.create).toBe(true);
    expect(result.current.permissions.edit).toBe(true);
    expect(result.current.permissions.publish).toBe(true);
    expect(result.current.permissions.delete).toBe(true);
    expect(result.current.role).toBe('SP_ADMIN');
  });

  it('returns limited CMS access for ANALYST', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'ANALYST', id: 'u2' },
      loading: false,
    });

    const { result } = renderHook(() => useCMSPermissions());
    expect(result.current.permissions.create).toBe(false);
    expect(result.current.permissions.delete).toBe(false);
    expect(result.current.role).toBe('ANALYST');
  });

  it('defaults to ANALYST when user has no role', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useCMSPermissions());
    expect(result.current.role).toBe('ANALYST');
    expect(result.current.permissions.create).toBe(false);
  });

  it('passes loading state through', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => useCMSPermissions());
    expect(result.current.loading).toBe(true);
  });
});
