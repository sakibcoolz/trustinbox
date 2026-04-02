import { cookies } from 'next/headers';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

// ─── Cookie helpers ─────────────────────────────────────

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const accessToken = cookieStore.get('accessToken')?.value;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const spId = cookieStore.get('activeSpId')?.value;
  if (spId) headers['X-Service-Provider-Id'] = spId;

  return headers;
}

// ─── Gateway fetch with auto-refresh on 401 ────────────

export interface GatewayResult {
  data: unknown;
  status: number;
  /** If a token refresh occurred, these are the new cookie values to set on the response */
  refreshedTokens?: { accessToken: string; refreshToken: string };
  /** True when 401 and refresh token is also rejected — user must re-login */
  refreshFailed?: boolean;
}

/**
 * Fetch from the gateway with automatic token refresh on 401.
 * API routes should use this instead of raw fetch + getAuthHeaders.
 */
export async function gatewayFetch(
  path: string,
  method = 'GET',
  body?: string,
): Promise<GatewayResult> {
  const headers = await getAuthHeaders();
  const url = `${GATEWAY}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      ...(body ? { body } : {}),
      cache: 'no-store',
    });
  } catch (err) {
    console.error(`[gatewayFetch] Network error on ${method} ${path}:`, err);
    return { data: { error: 'Gateway unavailable' }, status: 502 };
  }

  if (res.status === 401) {
    // Attempt to refresh the token
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${GATEWAY}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshBody = await refreshRes.json();
          const newToken = refreshBody.accessToken || refreshBody.access_token;
          const newRefresh = refreshBody.refreshToken || refreshBody.refresh_token || refreshToken;

          if (newToken) {
            // Retry with the new token
            const retryHeaders: Record<string, string> = {
              ...headers,
              Authorization: `Bearer ${newToken}`,
            };
            res = await fetch(url, {
              method,
              headers: retryHeaders,
              ...(body ? { body } : {}),
              cache: 'no-store',
            });

            const data = await res.json().catch(() => ({}));
            return {
              data,
              status: res.status,
              refreshedTokens: {
                accessToken: newToken,
                refreshToken: newRefresh,
              },
            };
          }
        } else {
          const data = await res.json().catch(() => ({}));
          return { data, status: 401, refreshFailed: true };
        }
      } catch (err) {
        console.error(`[gatewayFetch] refresh error:`, err);
      }
    }
  }

  const data = await res.json().catch(() => ({}));
  return { data, status: res.status };
}

/**
 * Convenience: call gatewayFetch and return a NextResponse with cookies set.
 */
export async function gatewayResponse(
  path: string,
  method = 'GET',
  body?: string,
): Promise<import('next/server').NextResponse> {
  const { NextResponse } = await import('next/server');
  const { setAuthCookies } = await import('@/lib/auth-cookies');

  const result = await gatewayFetch(path, method, body);
  const res = result.status >= 400
    ? NextResponse.json({ error: (result.data as any)?.error || `Gateway ${result.status}` }, { status: result.status })
    : NextResponse.json(result.data);

  if (result.refreshFailed) {
    // Both tokens invalid — clear cookies so client redirects to login
    const { clearAuthCookies } = await import('@/lib/auth-cookies');
    clearAuthCookies(res);
  } else if (result.refreshedTokens) {
    setAuthCookies(res, result.refreshedTokens.accessToken, result.refreshedTokens.refreshToken);
  }

  return res;
}

// ─── Server-side fetch to gateway ───────────────────────

export async function serverFetch<T>(
  path: string,
  opts?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const headers = opts?.skipAuth
    ? { 'Content-Type': 'application/json', ...opts?.headers }
    : { ...(await getAuthHeaders()), ...opts?.headers };

  const res = await fetch(`${GATEWAY}${path}`, {
    ...opts,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ServerFetchError(
      body.error || body.message || `Gateway ${res.status}`,
      res.status,
    );
  }

  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export class ServerFetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ─── Key transform helper ───────────────────────────────

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/gi, (_, c) => c.toUpperCase());
}

export function transformKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result;
  }
  return obj;
}
