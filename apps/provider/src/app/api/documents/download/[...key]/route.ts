import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

/**
 * GET /api/documents/download/[...key]
 *
 * Proxies document downloads from gateway → MinIO, attaching auth from cookies.
 * Used for preview iframes, images, and direct downloads.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const path = key.join('/');

  const cookieStore = await cookies();
  const headers: Record<string, string> = {};

  const accessToken = cookieStore.get('accessToken')?.value;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const spId = cookieStore.get('activeSpId')?.value;
  if (spId) headers['X-Service-Provider-Id'] = spId;

  const res = await fetch(`${GATEWAY}/api/v1/documents/download/${path}`, {
    headers,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: 'download failed' },
      { status: res.status },
    );
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const contentDisposition = res.headers.get('content-disposition');
  const contentLength = res.headers.get('content-length');

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', contentType);
  if (contentDisposition) responseHeaders.set('Content-Disposition', contentDisposition);
  if (contentLength) responseHeaders.set('Content-Length', contentLength);

  return new NextResponse(res.body, {
    status: 200,
    headers: responseHeaders,
  });
}
