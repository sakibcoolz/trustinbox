import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission, usePermissions, useFeatureAccess } from '@/hooks/usePermission';

// Mock the AuthContext to control role in tests
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('usePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when role has the permission', () => {
    mockUseAuth.mockReturnValue({ role: 'SP_ADMIN' });
    const { result } = renderHook(() => usePermission('webhooks:manage'));
    expect(result.current).toBe(true);
  });

  it('returns false when role lacks the permission', () => {
    mockUseAuth.mockReturnValue({ role: 'ANALYST' });
    const { result } = renderHook(() => usePermission('webhooks:manage'));
    expect(result.current).toBe(false);
  });

  it('returns false when role is null', () => {
    mockUseAuth.mockReturnValue({ role: null });
    const { result } = renderHook(() => usePermission('dashboard:view'));
    expect(result.current).toBe(false);
  });

  it('AGENT can manage callbacks', () => {
    mockUseAuth.mockReturnValue({ role: 'AGENT' });
    const { result } = renderHook(() => usePermission('callbacks:manage'));
    expect(result.current).toBe(true);
  });

  it('CONTENT_MANAGER cannot launch campaigns', () => {
    mockUseAuth.mockReturnValue({ role: 'CONTENT_MANAGER' });
    const { result } = renderHook(() => usePermission('campaigns:launch'));
    expect(result.current).toBe(false);
  });
});

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns permission map for role', () => {
    mockUseAuth.mockReturnValue({ role: 'AGENT' });
    const { result } = renderHook(() =>
      usePermissions(['callbacks:manage', 'webhooks:manage', 'dashboard:view']),
    );
    expect(result.current['callbacks:manage']).toBe(true);
    expect(result.current['webhooks:manage']).toBe(false);
    expect(result.current['dashboard:view']).toBe(true);
  });

  it('returns all false when role is null', () => {
    mockUseAuth.mockReturnValue({ role: null });
    const { result } = renderHook(() =>
      usePermissions(['callbacks:manage', 'dashboard:view']),
    );
    expect(result.current['callbacks:manage']).toBe(false);
    expect(result.current['dashboard:view']).toBe(false);
  });
});

describe('useFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SP_ADMIN has full webhook access', () => {
    mockUseAuth.mockReturnValue({ role: 'SP_ADMIN' });
    const { result } = renderHook(() => useFeatureAccess('webhooks'));
    expect(result.current.canView).toBe(true);
    expect(result.current.canManage).toBe(true);
  });

  it('ANALYST has only view access to dashboard', () => {
    mockUseAuth.mockReturnValue({ role: 'ANALYST' });
    const { result } = renderHook(() => useFeatureAccess('dashboard'));
    expect(result.current.canView).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canManage).toBe(false);
    expect(result.current.canDelete).toBe(false);
  });

  it('returns no access when role is null', () => {
    mockUseAuth.mockReturnValue({ role: null });
    const { result } = renderHook(() => useFeatureAccess('campaigns'));
    expect(result.current.canView).toBe(false);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canManage).toBe(false);
    expect(result.current.canDelete).toBe(false);
  });
});
