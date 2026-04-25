# TrustInbox — Web App

Customer-facing Next.js 14 application for the TrustInbox platform. Runs on port **:3000**.

## Stack

| Concern | Package |
|---------|---------|
| Framework | Next.js 14 / React 18 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| API | Apollo Client 3 (GraphQL) |
| Auth | localStorage tokens (access + refresh) |
| Real-time | SSE (notifications) · XMPP (chat) |
| Testing | Vitest + Testing Library + jsdom |
| E2E | Playwright |

## Features

- **Inbox** — notification feed with category tabs and real-time updates
- **Conversations** — XMPP-backed secure messaging
- **Callbacks** — approve / reject / schedule callback requests
- **Documents** — upload and share documents via presigned URLs
- **Friends** — friend request management
- **Service Providers** — directory, follow, block, profile detail
- **Settings** — DND rules, availability slots, addresses, privacy preferences, notification sounds
- **Profile** — avatar, name, bio, career history

## Getting Started

```bash
npm install
npm run dev        # starts on :3000
```

Requires gateway running at `http://localhost:4000` (set `NEXT_PUBLIC_GRAPHQL_URL`).

## Environment Variables

```
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_LOG_LEVEL=info
```

## Testing

```bash
npm test                 # run all Vitest tests (watch mode)
npm run test:run         # run once and exit
npm run test:coverage    # coverage report
npm run test:e2e         # Playwright E2E (requires dev server)
```

Tests are co-located with source files under `__tests__/` subdirectories.

## Directory Layout

```
src/
  app/
    (dashboard)/   # authenticated pages (inbox, conversations, settings, …)
    auth/          # login, register, verify-email, forgot-password
    api/           # Next.js API routes (proxies to gateway)
  components/      # shared UI components
  features/        # feature-specific components (dashboard, notifications, …)
  hooks/           # React hooks (useData, usePerformanceMonitor, …)
  lib/             # auth-context, chat-context, Apollo client, graphql queries
  providers/       # top-level React context providers
```
