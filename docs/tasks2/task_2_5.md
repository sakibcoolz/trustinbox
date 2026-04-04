# Task 2.5 — Add Gateway Proxy API Route

> **Phase**: 2 — Web App: Foundation & Data Layer
> **File**: `apps/web/src/app/api/gateway/[...path]/route.ts` (new)
> **Reference**: `apps/provider/src/app/api/gateway/[...path]/route.ts`

---

## Objective

Create a catch-all Next.js API route that proxies requests from the web app client to the GraphQL gateway. This route serves two purposes: (1) avoids CORS issues when the client talks to the gateway directly, and (2) enables server-side token injection for future cookie-based auth migration.

---

## Current State

- **`apps/web/src/app/api/`** only contains `notifications/` routes
- No gateway proxy route exists in the web app
- The Apollo Client currently points to `NEXT_PUBLIC_GRAPHQL_URL` directly (client → gateway)
- If CORS is configured on the gateway to allow the web app origin, direct access works
- The proxy is a safety net and enables SSR data fetching in the future

### Provider App Reference
The provider app at `apps/provider/src/app/api/gateway/[...path]/route.ts` proxies all HTTP methods (GET, POST, PUT, DELETE, PATCH) through a `gatewayResponse()` helper from `@/lib/server-fetch.ts`. The web app does NOT have a `server-fetch.ts` helper, so the proxy must use raw `fetch()`.

---

## Requirements

### Catch-All Route
- [x] Create `apps/web/src/app/api/gateway/[...path]/route.ts`
- [x] Map URL: `/api/gateway/<path>` → `${GATEWAY_URL}/api/<path>`
- [x] Preserve query string parameters from the original request

### HTTP Methods
- [x] Handle `GET` — forward query params
- [x] Handle `POST` — forward request body (JSON)
- [x] Handle `PUT` — forward request body
- [x] Handle `DELETE` — no body
- [x] Handle `PATCH` — forward request body

### Auth Header Forwarding
- [x] Read `Authorization` header from incoming request
- [x] Forward it to the gateway
- [x] If no Authorization header, send request without auth (public queries)

### Response Handling
- [x] Forward the gateway's response status code
- [x] Forward response body as JSON
- [x] Forward relevant response headers (Content-Type)

### Error Handling
- [x] If gateway is unreachable, return `502 Bad Gateway` with error message
- [x] If gateway returns an error, forward the status code and body as-is
- [x] Never expose internal gateway URL to the client

### Environment Variable
- [x] Use `GATEWAY_URL` env var (server-side only, not `NEXT_PUBLIC_`)
- [x] Default: `http://localhost:4000`

---

## Implementation Details

### Web App Proxy (simpler than provider — no `server-fetch.ts` helper)
```typescript
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
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
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
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
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

// PUT, DELETE, PATCH follow same pattern...
```

### Next.js 14 `params` Note
The web app uses **Next.js 14**, so `params` is a **direct object** (not a Promise). The provider app (Next.js 15) uses `await params`. For the web app:
```typescript
// Next.js 14 style:
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path;
  // ...
}
```

---

## When to Use the Proxy vs Direct Access

| Scenario | Approach |
|----------|----------|
| Client-side Apollo queries | Direct to `NEXT_PUBLIC_GRAPHQL_URL` (simpler) |
| CORS-blocked environments | Apollo points to `/api/gateway/graphql` |
| Server Components (future) | Use proxy with server-side auth |
| REST endpoints needed client-side | `/api/gateway/v1/...` → `GATEWAY/api/v1/...` |

---

## Verification Checklist

- [x] Route file created at `apps/web/src/app/api/gateway/[...path]/route.ts`
- [x] `GET /api/gateway/v1/health` → proxies to `GATEWAY_URL/api/v1/health` and returns response
- [x] `POST /api/gateway/graphql` with body → proxies to `GATEWAY_URL/api/graphql`
- [x] Authorization header is forwarded when present
- [x] Query params are preserved
- [x] 502 returned when gateway is unreachable (not a stack trace)
- [x] No `GATEWAY_URL` value leaks to client (it's server-side only)
- [x] All 5 HTTP methods exported (GET, POST, PUT, DELETE, PATCH)

---

## Dependencies

- **Depends on**: Nothing (independent of other Phase 2 tasks)
- **Blocks**: Nothing directly, but enables CORS-free gateway access

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/api/gateway/[...path]/route.ts` | **Target file** — new |
| `apps/provider/src/app/api/gateway/[...path]/route.ts` | Reference implementation (Next.js 15 `await params`) |
| `apps/provider/src/lib/server-fetch.ts` | Provider's `gatewayResponse()` helper (web app doesn't have this) |
| `apps/web/src/app/api/notifications/` | Existing API routes in same directory |
