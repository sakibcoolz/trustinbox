# TrustInbox Gateway API Reference

## Current Reality

The repository is architected around a GraphQL BFF plus gRPC services, but the gateway's active frontend surface today is mostly:

- REST endpoints under `/api/*`
- Server-Sent Events for notifications and some realtime fanout
- WebSocket and XMPP for chat

`/graphql` currently exists, but it returns a placeholder response rather than the full target API.

## Base URLs

- Web app (web-app) local URL: `http://localhost:3000`
- Provider portal (provider-ui) local URL: `http://localhost:6060`
- Gateway local URL: `http://localhost:4000`
- Placeholder GraphQL endpoint: `http://localhost:4000/graphql`

In normal web development, `apps/web` proxies `/api/*` to the gateway through Next.js rewrites.

## Authentication

Authenticated endpoints expect:

```http
Authorization: Bearer <access_token>
```

Core auth endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login and issue access, refresh, and XMPP tokens |
| `POST` | `/api/auth/register` | Register a user account |
| `GET` | `/api/auth/me` | Get current user info |
| `POST` | `/api/auth/refresh` | Rotate access and refresh tokens |

## User And Social APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/users/search` | Search people by name or username |
| `POST` | `/api/friends/request` | Send friend request |
| `GET` | `/api/friends/requests` | List incoming and outgoing requests |
| `POST` | `/api/friends/respond` | Accept or reject request |
| `GET` | `/api/friends` | List friends |
| `POST` | `/api/friends/remove` | Remove a friend |

## Notifications And SSE

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/notifications` | List notifications |
| `POST` | `/api/notifications/read` | Mark selected or all notifications as read |
| `GET` | `/api/notifications/stream` | SSE stream for notification, chat, and presence events |

### SSE event types currently used by the web app

- `notification`
- `chat_message`
- `presence_update`

## Conversations, Messages, And Realtime Chat

### REST endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/conversations` | List conversations |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations/{id}` | Get one conversation |
| `GET` | `/api/conversations/{id}/messages` | List messages |
| `POST` | `/api/conversations/{id}/messages` | Send a message over REST |
| `POST` | `/api/conversations/{id}/read` | Mark conversation as read |
| `GET` | `/api/messages/{id}` | Fetch one message |
| `PUT` | `/api/messages/{id}` | Edit a message |
| `DELETE` | `/api/messages/{id}` | Delete a message |
| `POST` | `/api/messages/{id}/reactions` | Add reaction |
| `DELETE` | `/api/messages/{id}/reactions` | Remove reaction |

### Realtime endpoints

| Protocol | Path | Purpose |
| --- | --- | --- |
| WebSocket | `/api/ws` | Gateway-managed realtime chat socket |
| WebSocket proxy | `/api/xmpp-ws` | Browser-safe proxy to ejabberd XMPP WebSocket |

### Presence endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/presence/heartbeat` | Refresh presence heartbeat |
| `GET` | `/api/presence` | Query presence state |

## Files And Avatar APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/upload` | Upload message attachment |
| `GET` | `/api/files/{id}` | Serve attachment |
| `POST` | `/api/avatar/upload` | Upload avatar |
| `DELETE` | `/api/avatar/me` | Remove current avatar |
| `GET` | `/api/avatar/{userId}` | Serve avatar |

## Profile, Privacy, Career, And Sessions

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/profile` | Get profile |
| `PATCH` | `/api/profile/update` | Update profile |
| `GET` | `/api/profile/stats` | Get profile summary stats |
| `GET` | `/api/profile/service-providers` | List linked service providers |
| `GET` | `/api/profile/activity` | Get profile activity feed |
| `GET` | `/api/privacy/preferences` | Get privacy preferences |
| `PATCH` | `/api/privacy/preferences` | Update privacy preferences |
| `GET` | `/api/sessions` | Get account/session security info |
| `GET` | `/api/career` | Get career data bundle |
| `POST` / `PUT` / `DELETE` | `/api/career/work` | Manage work experience |
| `POST` / `PUT` / `DELETE` | `/api/career/education` | Manage education |
| `POST` / `DELETE` | `/api/career/skills` | Manage skills |

## Internal ejabberd Hook Endpoints

These are internal-only endpoints used by ejabberd inside the local runtime:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/internal/ejabberd/check_password` | Validate delegated XMPP auth |
| `POST` | `/internal/ejabberd/is_user` | Check whether an XMPP user exists |

## Target Contracts Still Matter

Even though the active frontend surface is mostly REST today, the longer-term service contracts still live in:

- `packages/proto/*`
- `gateway/graphql-bff/graph/schema.graphqls`

Use those when planning future service extraction or GraphQL completion, but use the gateway handlers as the source of truth for current frontend integration work.
