import { NextResponse } from 'next/server';

// CMS media is a frontend scaffold — no backend table yet.
// Return empty results so the page renders without 404.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? 50);
  const offset = Number(searchParams.get('offset') ?? 0);

  return NextResponse.json({ items: [], total: 0 });
}

export async function POST() {
  return NextResponse.json(
    { error: 'CMS media upload not yet implemented' },
    { status: 501 },
  );
}
