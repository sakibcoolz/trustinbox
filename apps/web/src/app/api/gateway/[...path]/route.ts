import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

function buildGatewayUrl(req: NextRequest, path: string[]): string {
  const gatewayPath = `/api/${path.join('/')}`;
  const queryString = req.nextUrl.searchParams.toString();
  return `${GATEWAY_URL}${gatewayPath}${queryString ? `?${queryString}` : ''}`;
}

function forwardHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  return headers;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path;
  try {
    const res = await fetch(buildGatewayUrl(req, path), {
      method: 'GET',
      headers: forwardHeaders(req),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path;
  try {
    const body = await req.text();
    const res = await fetch(buildGatewayUrl(req, path), {
      method: 'POST',
      headers: forwardHeaders(req),
      body: body || undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path;
  try {
    const body = await req.text();
    const res = await fetch(buildGatewayUrl(req, path), {
      method: 'PUT',
      headers: forwardHeaders(req),
      body: body || undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path;
  try {
    const res = await fetch(buildGatewayUrl(req, path), {
      method: 'DELETE',
      headers: forwardHeaders(req),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path;
  try {
    const body = await req.text();
    const res = await fetch(buildGatewayUrl(req, path), {
      method: 'PATCH',
      headers: forwardHeaders(req),
      body: body || undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
  }
}
