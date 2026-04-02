import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

/**
 * PUT /api/documents/upload/[...key]
 *
 * Proxies file uploads to the gateway, attaching auth from cookies.
 * The gateway then streams the file into MinIO.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const s3Key = key.join('/');

  const cookieStore = await cookies();
  const headers: Record<string, string> = {};

  const accessToken = cookieStore.get('accessToken')?.value;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const spId = cookieStore.get('activeSpId')?.value;
  if (spId) headers['X-Service-Provider-Id'] = spId;

  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const body = await req.arrayBuffer();

  const res = await fetch(`${GATEWAY}/api/v1/documents/upload/${s3Key}`, {
    method: 'PUT',
    headers,
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'upload failed' }));
    return NextResponse.json(data, { status: res.status });
  }

  return new NextResponse(null, { status: 200 });
}
