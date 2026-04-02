import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return gatewayResponse(`/api/v1/bots/${encodeURIComponent(id)}`);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  return gatewayResponse(`/api/v1/bots/${encodeURIComponent(id)}`, 'PUT', body);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return gatewayResponse(`/api/v1/bots/${encodeURIComponent(id)}`, 'DELETE');
}
