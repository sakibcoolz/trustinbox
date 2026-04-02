import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const spId = cookieStore.get('activeSpId')?.value;

  if (!accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const params = new URLSearchParams();
  params.set('token', accessToken);
  if (spId) params.set('serviceProviderId', spId);

  const gatewayUrl = `${GATEWAY_URL}/api/notifications/stream?${params}`;

  // Open SSE connection to gateway and pipe through to client
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const upstream = await fetch(gatewayUrl, {
          headers: {
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${accessToken}`,
            ...(spId ? { 'X-Service-Provider-Id': spId } : {}),
          },
          signal: req.signal,
        });

        if (!upstream.ok) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Gateway connection failed' })}\n\n`));
          controller.close();
          return;
        }

        const reader = upstream.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        // Send initial connected event
        controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`));

        // Pipe upstream SSE to client
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Connection lost' })}\n\n`));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
