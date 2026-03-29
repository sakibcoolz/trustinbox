/**
 * SSE proxy Route Handler
 *
 * Next.js rewrites use http-proxy which has a hard 30-second `proxyTimeout`.
 * File-based Route Handlers take priority over rewrites, so this file shadows
 * the /api/notifications/stream rewrite and proxies the SSE stream using the
 * Fetch API — which supports streaming responses without any artificial timeout.
 *
 * The `request.signal` is forwarded to the upstream fetch so that when the
 * browser closes the EventSource the Go server's r.Context() is also cancelled.
 */

import { NextRequest } from 'next/server';

// Must opt out of static generation — this is a live stream.
export const dynamic   = 'force-dynamic';
// Use Node.js runtime so that ReadableStream piping and AbortSignal work correctly.
export const runtime   = 'nodejs';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:4000';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!token) {
    return new Response('unauthorized', { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${GATEWAY_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`,
      {
        headers: {
          Accept:        'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        // Propagate the client disconnect so the Go goroutine exits immediately.
        signal: request.signal,
      },
    );
  } catch {
    return new Response('stream unavailable', { status: 503 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('stream unavailable', { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type':       'text/event-stream',
      'Cache-Control':      'no-cache, no-transform',
      'Connection':         'keep-alive',
      // Tell nginx / any upstream proxy not to buffer this response.
      'X-Accel-Buffering':  'no',
    },
  });
}
