import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = req.nextUrl.search;
  return gatewayResponse(`/api/conversations/${encodeURIComponent(id)}/messages${q}`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  return gatewayResponse(`/api/conversations/${encodeURIComponent(id)}/messages`, 'POST', body);
}
