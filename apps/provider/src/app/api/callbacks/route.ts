import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.search;
  return gatewayResponse(`/api/v1/callbacks${q}`);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return gatewayResponse('/api/v1/callbacks', 'POST', body);
}
