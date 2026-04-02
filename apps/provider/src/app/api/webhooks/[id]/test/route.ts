import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return gatewayResponse(`/api/v1/webhooks/${encodeURIComponent(id)}/test`, 'POST');
}
