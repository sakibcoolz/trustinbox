/// <reference types="vitest/globals" />
import { renderHook, act } from '@testing-library/react';
import { setupFetchMock } from '@/__tests__/helpers';

// Mock the auth context
const mockUpdateAvatar = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    token: 'test-token',
    updateAvatar: mockUpdateAvatar,
  }),
}));

import { useAvatarUpload } from '@/hooks/useAvatarUpload';

beforeEach(() => {
  vi.clearAllMocks();
});

function createFile(name: string, type: string, sizeKB: number): File {
  const buffer = new ArrayBuffer(sizeKB * 1024);
  return new File([buffer], name, { type });
}

describe('useAvatarUpload', () => {
  describe('initial state', () => {
    it('starts in idle status', () => {
      const { result } = renderHook(() => useAvatarUpload());
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.uploading).toBe(false);
    });
  });

  describe('upload', () => {
    it('uploads a valid file and transitions to success', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/avatar/upload',
          method: 'POST',
          response: { avatarUrl: '/avatars/user-1.jpg' },
        },
      ]);

      const { result } = renderHook(() => useAvatarUpload());

      const file = createFile('avatar.jpg', 'image/jpeg', 100);
      let url: string | null = null;

      await act(async () => {
        url = await result.current.upload(file);
      });

      expect(result.current.status).toBe('success');
      expect(url).toBeTruthy();
      expect(mockUpdateAvatar).toHaveBeenCalledWith(expect.stringContaining('/avatars/user-1.jpg'));

      cleanup();
    });

    it('rejects invalid file type', async () => {
      const { result } = renderHook(() => useAvatarUpload());

      const file = createFile('doc.pdf', 'application/pdf', 100);
      let url: string | null;

      await act(async () => {
        url = await result.current.upload(file);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('JPEG, PNG, WebP, and GIF');
      expect(url!).toBeNull();
    });

    it('rejects file exceeding 5MB', async () => {
      const { result } = renderHook(() => useAvatarUpload());

      const file = createFile('huge.png', 'image/png', 6 * 1024); // 6MB
      let url: string | null;

      await act(async () => {
        url = await result.current.upload(file);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('5 MB');
      expect(url!).toBeNull();
    });

    it('handles upload failure', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/avatar/upload',
          method: 'POST',
          response: { error: 'Server error' },
          status: 500,
        },
      ]);

      const { result } = renderHook(() => useAvatarUpload());

      const file = createFile('avatar.png', 'image/png', 100);
      await act(async () => {
        await result.current.upload(file);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBeTruthy();

      cleanup();
    });
  });

  describe('remove', () => {
    it('removes avatar and calls updateAvatar(null)', async () => {
      const cleanup = setupFetchMock([
        {
          url: '/api/avatar/me',
          method: 'DELETE',
          response: {},
        },
      ]);

      const { result } = renderHook(() => useAvatarUpload());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.remove();
      });

      expect(success).toBe(true);
      expect(result.current.status).toBe('idle');
      expect(mockUpdateAvatar).toHaveBeenCalledWith(null);

      cleanup();
    });
  });

  describe('reset', () => {
    it('resets status back to idle', async () => {
      const { result } = renderHook(() => useAvatarUpload());

      // Trigger an error first
      const file = createFile('doc.pdf', 'application/pdf', 100);
      await act(async () => {
        await result.current.upload(file);
      });

      expect(result.current.status).toBe('error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });
});
