import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

/**
 * Catch-all gateway proxy.
 * Maps /api/gateway/v1/foo?bar → GATEWAY/api/v1/foo?bar
 * Used by client-side useData() for GET and useMutationHelper() for mutations.
 */

function buildUrl(req: NextRequest, path: string[]) {
  const gatewayPath = `/api/${path.join('/')}`;
  const q = req.nextUrl.searchParams.toString();
  return `${gatewayPath}${q ? `?${q}` : ''}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return gatewayResponse(buildUrl(req, path));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const body = await req.text();
  return gatewayResponse(buildUrl(req, path), 'POST', body || undefined);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const body = await req.text();
  return gatewayResponse(buildUrl(req, path), 'PUT', body || undefined);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return gatewayResponse(buildUrl(req, path), 'DELETE');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const body = await req.text();
  return gatewayResponse(buildUrl(req, path), 'PATCH', body || undefined);
}
