import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = req.nextUrl.search;
  return gatewayResponse(`/api/v1/bots/${encodeURIComponent(id)}/actions${q}`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  return gatewayResponse(`/api/v1/bots/${encodeURIComponent(id)}/actions`, 'POST', body);
}
