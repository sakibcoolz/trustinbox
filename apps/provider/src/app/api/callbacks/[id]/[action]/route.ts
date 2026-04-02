import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return gatewayResponse(`/api/v1/callbacks/${encodeURIComponent(id)}`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  const body = await req.text();
  return gatewayResponse(`/api/v1/callbacks/${encodeURIComponent(id)}/${action}`, 'POST', body || undefined);
}
