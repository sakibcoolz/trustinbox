'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Maximum avatar file size accepted by the BFF (5 MB). */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type AvatarUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UseAvatarUploadReturn {
  /** Current operation status. */
  status: AvatarUploadStatus;
  /** Human-readable error message when status === 'error'. */
  error: string | null;
  /** True while an upload or remove request is in-flight. */
  uploading: boolean;
  /**
   * Validate and upload a new avatar file.
   * On success, the auth context is updated with the new serving URL and
   * the URL is also returned — the caller can use it to local-preview.
   * Returns null on failure.
   */
  upload: (file: File) => Promise<string | null>;
  /** Remove the current avatar. Returns true on success. */
  remove: () => Promise<boolean>;
  /** Reset status back to idle (e.g. to dismiss an error banner). */
  reset: () => void;
}

export function useAvatarUpload(): UseAvatarUploadReturn {
  const { token, updateAvatar } = useAuth();
  const [status, setStatus] = useState<AvatarUploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      // ── client-side validation ──────────────────────────────────────────
      if (!ALLOWED_TYPES.has(file.type)) {
        setError('Only JPEG, PNG, WebP, and GIF images are allowed.');
        setStatus('error');
        return null;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        setError('File is too large — maximum size is 5 MB.');
        setStatus('error');
        return null;
      }

      setStatus('uploading');
      setError(null);

      const form = new FormData();
      form.append('avatar', file);

      try {
        const res = await fetch(`${API_BASE}/api/avatar/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as Record<string, unknown>;
          throw new Error(typeof body.error === 'string' ? body.error : `Upload failed (${res.status})`);
        }

        const data = await res.json() as { avatarUrl: string };
        // Add a timestamp-based cache-buster so the browser fetches the new image
        const bustedUrl = `${API_BASE}${data.avatarUrl}${data.avatarUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;

        updateAvatar(bustedUrl);
        setStatus('success');
        return bustedUrl;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setError(msg);
        setStatus('error');
        return null;
      }
    },
    [token, updateAvatar],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    setStatus('uploading');
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/avatar/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(typeof body.error === 'string' ? body.error : `Remove failed (${res.status})`);
      }

      updateAvatar(null);
      setStatus('idle');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Remove failed';
      setError(msg);
      setStatus('error');
      return false;
    }
  }, [token, updateAvatar]);

  return {
    status,
    error,
    uploading: status === 'uploading',
    upload,
    remove,
    reset,
  };
}
