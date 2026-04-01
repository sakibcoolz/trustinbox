# Provider Portal — End-to-End Development Plan

> **App**: `[provider-ui]` — `apps/provider` on port 6060  
> **Stack**: Next.js 15 App Router + TypeScript + Tailwind CSS + Apollo Client  
> **Theme**: VS Code dark-inspired enterprise design  
> **Gateway**: GraphQL BFF at `http://localhost:4000`  
> **Excluded Tabs**: Content, Media Library, CMS Roles (out of scope)

---

## Table of Contents

1. [Foundation & Shell](#1-foundation--shell)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Dashboard](#3-dashboard)
4. [Customers](#4-customers)
5. [Notifications](#5-notifications)
6. [Conversations](#6-conversations)
7. [Callback Requests](#7-callback-requests)
8. [Documents](#8-documents)
9. [Campaigns](#9-campaigns)
10. [Bots (AI Studio)](#10-bots-ai-studio)
11. [Analytics](#11-analytics)
12. [Webhooks](#12-webhooks)
13. [Compliance](#13-compliance)
14. [Integrations](#14-integrations)
15. [Settings](#15-settings)
16. [Real-Time & Subscriptions](#16-real-time--subscriptions)
17. [Cross-Cutting Concerns](#17-cross-cutting-concerns)
18. [Testing & QA](#18-testing--qa)
19. [Deployment & DevOps](#19-deployment--devops)

---

## 1. Foundation & Shell

### Layout & Navigation

- [x] **1.1** Root layout (`layout.tsx`) — dark theme, Inter/JetBrains Mono fonts, global CSS
- [x] **1.2** `LayoutShell` component — auth guard wrapper, redirect to `/auth/login` if unauthenticated
- [x] **1.3** Sidebar component — collapsible, role-aware navigation with icon + label groups
  - Main: Dashboard, Customers, Notifications, Conversations, Callbacks, Documents, Campaigns, Bots
  - Platform: Analytics, Webhooks (SP_ADMIN), Compliance, Integrations (SP_ADMIN), Settings
  - Active route highlighting with `border-active` accent
- [x] **1.4** Header component — org switcher dropdown, search bar, notification bell with badge, user avatar menu
- [x] **1.5** Mobile responsive nav — bottom tab bar for mobile breakpoints, drawer for tablet
- [x] **1.6** Breadcrumb component — auto-generated from route segments
- [x] **1.7** Toast/notification system — success, error, warning, info stacked toasts with auto-dismiss
- [x] **1.8** Loading skeleton components — shimmer cards, table rows, chart placeholders
- [x] **1.9** Empty state components — illustration + CTA for each feature area
- [x] **1.10** Error boundary — global error page with retry, per-section error cards

### Design System Tokens

- [x] **1.11** Color palette applied — bg-primary (#0b0d0f), bg-surface (#10141a), bg-elevated (#1c2028), accent-blue (#3b82f6)
- [x] **1.12** Card component — `bg-surface` with `border-primary` rounded-lg with hover elevation
- [x] **1.13** Table component — sortable headers, row hover, pagination, bulk select
- [x] **1.14** Filter chip bar — combinable filter pills with clear-all
- [x] **1.15** Drawer component — right-slide panel for detail views
- [x] **1.16** Modal/Dialog component — centered overlay with backdrop blur
- [x] **1.17** Tab component — underline-style tabs with lazy-loaded content
- [x] **1.18** Badge/Status pill — color-coded status indicators (delivered, pending, failed, blocked)
- [x] **1.19** Timeline component — vertical event timeline for audit/history

---

## 2. Authentication & Authorization

### Auth Flow

- [x] **2.1** Login page (`/auth/login`) — email + password form, validation, error display, "Forgot password" link
- [x] **2.2** Registration page (`/auth/register`) — org name, admin email, password, confirm password, terms checkbox
- [x] **2.3** Invite acceptance page (`/auth/invite/[token]`) — token validation, set password, join organization
- [x] **2.4** `useAuth` hook — login, logout, refreshToken, isAuthenticated, currentUser, currentOrg
- [x] **2.5** Token management — store accessToken + refreshToken in localStorage, auto-refresh on 401
- [x] **2.6** Apollo Client auth link — inject `Authorization: Bearer <token>` + `X-Service-Provider-Id: <spId>` headers
- [x] **2.7** Auth middleware (`middleware.ts`) — redirect unauthenticated users to login, protect all non-auth routes

### RBAC

- [x] **2.8** Role definitions — PLATFORM_ADMIN > SP_ADMIN > CONTENT_MANAGER > AGENT > ANALYST
- [x] **2.9** Permission matrix implementation — 25+ permissions mapped to roles
- [x] **2.10** `usePermission(permission)` hook — returns boolean for conditional rendering
- [x] **2.11** `<ProtectedRoute requiredRole={...}>` wrapper — redirects if insufficient role
- [x] **2.12** Sidebar items hide/show based on role (Webhooks, Integrations → SP_ADMIN+)
- [x] **2.13** Field-level auth — disable edit buttons, hide action columns for read-only roles

### Connected Backend

- [x] **2.14** GraphQL mutations: `login`, `register`, `refreshToken`
- [x] **2.15** GraphQL mutations: `acceptInvitation`
- [x] **2.16** GraphQL query: `me` — current user + service provider context
- [x] **2.17** GraphQL query: `myServiceProviders` — org switcher data

---

## 3. Dashboard

### Route: `/`

- [x] **3.1** KPI summary cards (DashboardSummary component):
  - Total notifications sent (today/week/month)
  - Delivery rate percentage with trend arrow
  - Active callback requests count
  - Open conversations count
  - Active campaigns count
  - Bot interactions count
- [x] **3.2** Delivery chart — Recharts area/line chart showing notifications sent vs delivered vs failed over last 30 days
- [x] **3.3** Policy decision breakdown — pie/donut chart: allowed, blocked by DND, blocked by preference, rate-limited
- [x] **3.4** Recent activity timeline — last 10 events (notification delivered, callback approved, campaign launched, etc.)
- [x] **3.5** Quick actions panel — "Compose Notification", "Create Campaign", "Create Bot" shortcut buttons
- [x] **3.6** Date range selector — today, last 7d, last 30d, custom range
- [x] **3.7** Auto-refresh toggle — poll every 30s or use subscription for live updates

### Connected Backend

- [x] **3.8** GraphQL query: `dashboardAnalytics(spId, dateRange)` → KPIs, charts, timeline
- [x] **3.9** GraphQL subscription: `providerNotificationDelivered(spId)` → real-time counter updates

---

## 4. Customers

### Route: `/customers`

- [x] **4.1** Customer list table — virtual ID (never real phone), name, last contact date, status, category
- [x] **4.2** Search bar — search by virtual ID or name
- [x] **4.3** Filter chips — by category (Personal, Organizational, Advertisement), by status (Active, Blocked, DND)
- [x] **4.4** Sort by — last contacted, name, total interactions
- [x] **4.5** Pagination — cursor-based with page size selector (10, 25, 50)
- [x] **4.6** Bulk actions toolbar — appears on multi-select: "Send Notification", "Add to Campaign"

### Route: `/customers/[virtualId]`

- [x] **4.7** Customer detail drawer/page — profile card with virtual ID, display name, avatar
- [x] **4.8** Privacy status display — shows user's preference category for this org (allowed, restricted, blocked)
- [x] **4.9** Communication timeline — chronological list of all notifications, callbacks, messages, documents shared
- [x] **4.10** Quick actions — "Send Notification", "Request Callback", "Start Conversation", "Share Document"
- [x] **4.11** Policy check indicator — shows if current communication would be allowed before sending
- [x] **4.12** Notes/tags — internal org notes on customer (local to org, never shared with user)

### Connected Backend

- [x] **4.13** GraphQL query: `conversations(spId, filters, pagination)` → customer list derived from conversation participants
- [x] **4.14** GraphQL query: `checkCommunicationPolicy(spId, userId, category, channel)` → real-time policy check
- [x] **4.15** CustomerLookup component — integrated with `serviceProvider(id)` context

---

## 5. Notifications

### Route: `/notifications`

- [x] **5.1** Notification history table — columns: recipient (virtual ID), subject, category, channel, status, sent_at
- [x] **5.2** Status badges — Delivered (green), Pending (yellow), Failed (red), Blocked (gray), Rate-limited (orange)
- [x] **5.3** Filter bar — by status, category (Personal/Org/Ad), channel (push/sms/email), date range
- [x] **5.4** Click-to-expand row — shows full notification body, delivery attempts, policy decision details
- [x] **5.5** Retry action — for failed notifications, re-trigger with policy re-evaluation
- [x] **5.6** Export — CSV download of filtered notification logs

### Route: `/notifications/compose`

- [x] **5.7** NotificationComposer component:
  - Recipient selector — search by virtual ID, multi-select
  - Category dropdown — Personal, Organizational, Advertisement
  - Channel selector — push notification, SMS, email
  - Subject line input
  - Body editor — rich text or plain text toggle
  - Priority selector — low, normal, high, urgent
  - Schedule toggle — send now or schedule future delivery
- [x] **5.8** Policy pre-check — before send, call `checkCommunicationPolicy` and show result
- [x] **5.9** Preview panel — shows how notification appears on user's device
- [x] **5.10** Send confirmation modal — summary of recipients, policy verdicts, "Send" or "Schedule" CTA
- [x] **5.11** Draft save — auto-save drafts to localStorage, restore on revisit

### Connected Backend

- [x] **5.12** GraphQL query: `notifications(spId, filters, pagination)` → history
- [x] **5.13** GraphQL mutation: `sendNotification(input)` → create + enqueue through policy engine
- [x] **5.14** GraphQL query: `checkCommunicationPolicy(...)` → pre-send validation
- [x] **5.15** GraphQL subscription: `providerNotificationDelivered(spId)` → live status updates in table

---

## 6. Conversations

### Route: `/conversations`

- [x] **6.1** Conversation list — left panel showing all active conversations with customer virtual ID, last message preview, unread badge, timestamp
- [x] **6.2** Search conversations — by customer name/virtual ID or message content
- [x] **6.3** Filter — by status (active, archived), unread only, date range
- [x] **6.4** Sort — by last message time (default), by unread first

### Route: `/conversations/[id]`

- [x] **6.5** ConversationPanel component — chat-style message thread:
  - Message bubbles — sent (right, blue) vs received (left, gray)
  - Timestamps between message groups
  - Read receipts
  - File attachment previews (images inline, docs as cards)
  - System messages (callback approved, policy blocked, etc.)
- [x] **6.6** Message composer bar — text input, file attach button, emoji picker, send button
- [x] **6.7** File attachment — upload via DocumentManager, show preview before send
- [x] **6.8** Typing indicator — shows when customer is typing
- [x] **6.9** Conversation actions toolbar — "Request Callback", "Share Document", "Archive", "Assign to Agent"
- [x] **6.10** Agent assignment — assign conversation to team member (agent role)
- [x] **6.11** Conversation info sidebar — customer profile card, shared documents list, callback history

### Connected Backend

- [x] **6.12** GraphQL query: `conversations(spId)` → list with latest message
- [x] **6.13** GraphQL query: `conversation(id)` → messages with pagination (cursor-based, latest first)
- [x] **6.14** GraphQL mutation: `sendMessage(conversationId, content, attachments)` → policy-checked message
- [x] **6.15** GraphQL subscription: `providerMessageReceived(spId)` → real-time new message
- [x] **6.16** GraphQL subscription: `messageReceived(conversationId)` → per-conversation live updates

---

## 7. Callback Requests

### Route: `/callbacks`

- [x] **7.1** CallbackRequestTable component — columns: customer (virtual ID), requested_at, preferred_time, status, assigned_agent, actions
- [x] **7.2** Status badges — Pending (yellow), Approved (green), Rejected (red), Expired (gray), Completed (blue)
- [x] **7.3** Filter bar — by status, date range, assigned agent
- [x] **7.4** Request detail expansion — shows customer preference, DND windows, policy evaluation result
- [x] **7.5** Create callback request — button opens form: select customer, preferred time slots, reason/notes
- [x] **7.6** 48-hour expiry indicator — countdown/progress bar showing time remaining for pending requests
- [x] **7.7** Assign to agent — dropdown to assign callback to a specific team member
- [x] **7.8** Complete callback — mark as completed with notes (call duration, outcome)
- [x] **7.9** Bulk actions — approve/reject selected requests

### Connected Backend

- [x] **7.10** GraphQL query: `callbackRequests(spId, filters, pagination)` → list
- [x] **7.11** GraphQL mutation: `approveCallbackRequest(id)` / `rejectCallbackRequest(id, reason)`
- [x] **7.12** GraphQL subscription: `providerCallbackRequestCreated(spId)` → real-time new requests
- [x] **7.13** Policy integration — `CheckCallbackPermission(userId, spId)` pre-check before creation

---

## 8. Documents

### Route: `/documents`

- [x] **8.1** DocumentManager component — grid/list toggle view of uploaded documents
- [x] **8.2** Upload zone — drag-and-drop area + file picker, multi-file upload with progress bars
- [x] **8.3** Document card — thumbnail/icon, filename, size, upload date, classification badge, share count
- [x] **8.4** Classification tags — auto-classified (invoice, ID, contract, report, general)
- [x] **8.5** Search — by filename, classification, date range
- [x] **8.6** Document preview — in-app preview for images/PDFs in modal or drawer
- [x] **8.7** Share document — select customer(s), share via conversation with signed URL
- [x] **8.8** Version history — show document versions, download previous versions
- [x] **8.9** Delete document — soft delete with confirmation modal
- [x] **8.10** Bulk download — select multiple documents, download as zip

### Connected Backend

- [x] **8.11** Document upload → presigned URL from document-service → direct upload to MinIO
- [x] **8.12** GraphQL queries for document listing, versioning, shared documents
- [x] **8.13** Signed URL generation for secure document sharing with customers

---

## 9. Campaigns

### Route: `/campaigns`

- [ ] **9.1** Campaign list table — name, status (Draft/Scheduled/Active/Completed/Cancelled), target audience size, delivery stats, created_at
- [ ] **9.2** Status filter chips — Draft, Scheduled, Active, Completed, Cancelled
- [ ] **9.3** Search by campaign name
- [ ] **9.4** Campaign performance mini-chart — sparkline showing delivery progress for active campaigns

### Route: `/campaigns/new`

- [ ] **9.5** CampaignBuilder component — multi-step wizard:
  - **Step 1 — Basics**: Name, description, category (Organizational/Advertisement)
  - **Step 2 — Audience**: Filter by tags, segments, or manual selection of customer virtual IDs
  - **Step 3 — Content**: Notification subject, body (rich text), channel selection
  - **Step 4 — Schedule**: Send immediately, or schedule date/time with timezone
  - **Step 5 — Review**: Summary of all settings, audience count, estimated delivery rate
- [ ] **9.6** Policy preview — `previewCampaignPolicy(input)` → shows how many recipients would be allowed vs blocked
- [ ] **9.7** Save as draft — persist campaign without launching
- [ ] **9.8** Launch confirmation — modal with final audience count, policy summary, "Launch Campaign" CTA

### Route: `/campaigns/[id]`

- [ ] **9.9** Campaign detail view — full settings, audience breakdown, delivery progress
- [ ] **9.10** Delivery progress bar — sent / delivered / failed / blocked counts with progress percentage
- [ ] **9.11** Recipient table — per-recipient delivery status with timestamps
- [ ] **9.12** Campaign actions — Edit (if draft), Cancel (if active/scheduled), Clone
- [ ] **9.13** Campaign analytics — delivery rate, open rate (if trackable), policy block reasons breakdown

### Connected Backend

- [ ] **9.14** GraphQL query: `campaigns(spId, filters)` → list
- [ ] **9.15** GraphQL mutation: `createCampaign(input)` → draft
- [ ] **9.16** GraphQL mutation: `updateCampaign(id, input)` → edit draft
- [ ] **9.17** GraphQL mutation: `launchCampaign(id)` → trigger worker fan-out
- [ ] **9.18** GraphQL mutation: `cancelCampaign(id)` → stop delivery
- [ ] **9.19** GraphQL query: `previewCampaignPolicy(input)` → pre-launch policy evaluation
- [ ] **9.20** GraphQL query: `campaignAnalytics(campaignId)` → performance metrics
- [ ] **9.21** GraphQL subscription: `providerCampaignProgressUpdated(spId)` → real-time delivery progress

---

## 10. Bots (AI Studio)

### Route: `/bots`

- [ ] **10.1** Bot list — cards showing bot name, avatar, status (Active/Inactive/Draft), model, last active, total interactions
- [ ] **10.2** Create bot button → navigates to `/bots/new`
- [ ] **10.3** Quick toggle — activate/deactivate bot directly from list
- [ ] **10.4** Search/filter — by status, model type

### Route: `/bots/new`

- [ ] **10.5** BotStudioWizard component — multi-step:
  - **Step 1 — Basics**: Name, description, avatar upload, category
  - **Step 2 — Model**: Select AI model (GPT-4, Claude, etc.), temperature, max tokens
  - **Step 3 — Prompt**: System prompt editor with syntax highlighting, test prompt panel
  - **Step 4 — Permissions**: What actions can the bot perform (send notifications, schedule callbacks, share documents)
  - **Step 5 — Deploy**: Activate/schedule, assign to conversation routing rules
- [ ] **10.6** Test panel — send test message and see bot response in real-time during prompt editing

### Route: `/bots/[id]`

- [ ] **10.7** BotConfigEditor component — edit all bot settings (same fields as wizard, single-page form)
- [ ] **10.8** Activity log — recent bot interactions with conversation links
- [ ] **10.9** Status toggle — activate/deactivate with confirmation
- [ ] **10.10** Delete bot — confirmation modal with warning about active conversations

### Route: `/bots/[id]/knowledge`

- [ ] **10.11** Knowledge base editor — list of knowledge sources (documents, URLs, text snippets)
- [ ] **10.12** Add knowledge source — upload document, paste URL, or write raw text
- [ ] **10.13** Source status — indexed, pending, failed with retry
- [ ] **10.14** Remove knowledge source — with confirmation

### Route: `/bots/[id]/analytics`

- [ ] **10.15** Bot analytics dashboard:
  - Total interactions (line chart over time)
  - Average response time
  - User satisfaction rating (if tracked)
  - Handoff rate (bot → human agent)
  - Top action types triggered
  - Policy block rate
- [ ] **10.16** Action audit log — table of all actions bot performed with timestamps, results, policy decisions

### Connected Backend

- [ ] **10.17** GraphQL mutations: `createBot`, `updateBot`, `deleteBot`
- [ ] **10.18** GraphQL mutation: `updateBotConfiguration(botId, config)`
- [ ] **10.19** GraphQL mutation: `setBotPermission(botId, action, allowed)`
- [ ] **10.20** GraphQL mutations: `addKnowledgeSource`, `removeKnowledgeSource`
- [ ] **10.21** GraphQL mutation: `executeBotAction(botId, action, params)` → policy-gated
- [ ] **10.22** GraphQL queries: `bot(id)`, `bots(spId)`, `botConfiguration`, `botPermissions`, `botKnowledgeSources`, `botActionLogs`, `botAnalytics`
- [ ] **10.23** GraphQL subscription: `providerBotActionExecuted(spId)` → real-time action feed

---

## 11. Analytics

### Route: `/analytics`

- [ ] **11.1** Date range selector — today, 7d, 30d, 90d, custom with calendar picker
- [ ] **11.2** Notification analytics panel:
  - Total sent, delivered, failed, blocked (KPI cards)
  - Delivery rate over time (line chart)
  - Breakdown by category (bar chart)
  - Breakdown by channel (donut chart)
- [ ] **11.3** Callback analytics panel:
  - Total requests, approved, rejected, expired, completed
  - Average response time
  - Completion rate trend
- [ ] **11.4** Campaign analytics panel:
  - Active campaigns count
  - Total recipients reached
  - Delivery success rate by campaign
  - Best performing campaign highlight card
- [ ] **11.5** Bot analytics panel:
  - Total interactions
  - Handoff rate
  - Average response time
  - Top-performing bots ranking
- [ ] **11.6** Policy analytics panel:
  - Allowed vs blocked ratio (pie chart)
  - Block reasons breakdown (DND, preference, rate-limit, suspended)
  - Recommendations — which categories have highest block rates
- [ ] **11.7** Daily analytics table — `dailyAnalytics(spId, range)` → tabular breakdown by date
- [ ] **11.8** Export analytics — download as CSV or PDF report

### Connected Backend

- [ ] **11.9** GraphQL queries: `dashboardAnalytics`, `dailyAnalytics`, `notificationAnalytics`, `callbackAnalytics`, `campaignAnalytics`, `botPerformanceAnalytics`
- [ ] **11.10** All queries scoped by `spId` + date range

---

## 12. Webhooks

### Route: `/webhooks` (SP_ADMIN only)

- [ ] **12.1** WebhookManager component — table of webhook subscriptions: URL, events, status (active/paused), success rate
- [ ] **12.2** Create webhook form:
  - Endpoint URL (validated HTTPS)
  - Event type multi-select — NotificationDelivered, CallbackCreated, CallbackApproved, MessageReceived, CampaignCompleted, BotActionExecuted, etc.
  - Secret key auto-generation + display (HMAC signing)
  - Active/paused toggle
- [ ] **12.3** Edit webhook — update URL, events, status
- [ ] **12.4** Delete webhook — confirmation modal
- [ ] **12.5** Test webhook — sends test payload to endpoint URL, shows response status/body
- [ ] **12.6** Delivery log table — per-webhook delivery history: event, status code, response time, attempts, timestamp
- [ ] **12.7** Retry failed delivery — manually retry a failed webhook delivery
- [ ] **12.8** Webhook health indicator — success rate badge, last successful delivery timestamp

### Connected Backend

- [ ] **12.9** GraphQL mutations: `createWebhookSubscription`, `updateWebhookSubscription`, `deleteWebhookSubscription`, `testWebhookSubscription`, `retryWebhookDelivery`
- [ ] **12.10** GraphQL queries: `webhookSubscriptions(spId)`, `webhookSubscription(id)`, `webhookDeliveries(subscriptionId)`
- [ ] **12.11** GraphQL subscription: `providerWebhookDeliveryCompleted(spId)` → real-time delivery log

---

## 13. Compliance

### Route: `/compliance`

- [ ] **13.1** ComplianceViewer component — tabbed interface:
  - **Policy Status tab** — current org verification status, compliance score, outstanding requirements
  - **Audit Log tab** — all admin actions (team changes, webhook updates, campaign launches, bot config changes) with actor, action, timestamp, details
  - **Communication Audit tab** — filterable log of all policy decisions (allowed/blocked) with reason codes
- [ ] **13.2** Verification status card — org verification badge, documents submitted, pending review items
- [ ] **13.3** Compliance checklist — required items checked off (verified identity, ToS accepted, data processing agreement, etc.)
- [ ] **13.4** Export audit log — filtered CSV export for regulatory compliance
- [ ] **13.5** Spam report summary — count of spam reports received, trend, impacted communications

### Connected Backend

- [ ] **13.6** Audit log data from analytics-service + event trail
- [ ] **13.7** Verification status from organization-service
- [ ] **13.8** Policy decision logs from policy-service

---

## 14. Integrations

### Route: `/integrations` (SP_ADMIN only)

- [ ] **14.1** APIKeyManager component:
  - List existing API keys — name, created date, last used, status (active/revoked)
  - Create API key — name input, generate key + secret, show once modal
  - Revoke API key — confirmation modal with impact warning
- [ ] **14.2** Available integrations grid — cards for supported integrations (Slack, Salesforce, HubSpot, Zendesk, custom)
  - Status: Connected, Not Connected, Coming Soon
  - Configure button → opens integration-specific settings drawer
- [ ] **14.3** Integration logs — recent sync events, errors, data flow summary
- [ ] **14.4** Rate limit dashboard — current API usage vs limits, throttle warnings

### Connected Backend

- [ ] **14.5** GraphQL queries: `apiKeys(spId)` → list
- [ ] **14.6** GraphQL mutations: `createAPIKey(spId, name)`, `revokeAPIKey(keyId)`
- [ ] **14.7** Third-party integration config stored in organization-service metadata

---

## 15. Settings

### Route: `/settings`

- [ ] **15.1** Settings overview page — navigation cards to sub-sections

### Route: `/settings/profile`

- [ ] **15.2** Organization profile form:
  - Org name, display name, logo upload
  - Description, website URL
  - Contact email, support phone (org-facing, not customer-exposed)
  - Address fields
- [ ] **15.3** Branding settings — primary color, notification template customization
- [ ] **15.4** Save profile → updates organization-service via GraphQL

### Route: `/settings/industry`

- [ ] **15.5** Industry profile selector — dropdown of available industry profiles (Banking, Healthcare, Insurance, Real Estate, Hospitality, Logistics, Recruitment)
- [ ] **15.6** Industry-specific configuration — workflow templates, default notification categories, callback rules
- [ ] **15.7** Preview industry defaults — shows what policies and templates will be applied

### Route: `/settings/team`

- [ ] **15.8** TeamManager component:
  - Team member list — name, email, role, status (active/invited/deactivated), last active
  - Invite member — email input, role selector, send invitation email
  - Change role — dropdown to reassign role (SP_ADMIN, CONTENT_MANAGER, AGENT, ANALYST)
  - Remove member — confirmation modal with reassignment prompt for assigned conversations
  - Pending invitations — list with resend/revoke actions
- [ ] **15.9** Activity log — team actions (logins, role changes, invitations)

### Connected Backend

- [ ] **15.10** GraphQL mutations: `inviteTeamMember`, `acceptInvitation`, `revokeInvitation`, `changeTeamMemberRole`, `removeTeamMember`
- [ ] **15.11** GraphQL queries: `teamMembers(spId)`, `pendingInvitations(spId)`
- [ ] **15.12** GraphQL query: `industryProfile(key)`, `industryProfiles()`
- [ ] **15.13** Organization profile CRUD via organization-service

---

## 16. Real-Time & Subscriptions

- [ ] **16.1** Apollo Client WebSocket link — `graphql-ws` transport for subscriptions
- [ ] **16.2** Subscription connections:
  - `providerNotificationDelivered(spId)` → update notification table, dashboard KPIs
  - `providerCallbackRequestCreated(spId)` → add to callback list, show toast
  - `providerMessageReceived(spId)` → update conversation list, unread badges
  - `providerWebhookDeliveryCompleted(spId)` → update webhook delivery log
  - `providerBotActionExecuted(spId)` → update bot activity log
  - `providerCampaignProgressUpdated(spId)` → update campaign progress bars
- [ ] **16.3** Connection state indicator — green dot (connected), yellow (reconnecting), red (disconnected) in header
- [ ] **16.4** Reconnection logic — exponential backoff with max retry, fallback to polling
- [ ] **16.5** Notification sounds — optional audio cue for new callbacks and messages (user setting)
- [ ] **16.6** Browser push notifications — service worker for background tab alerts

---

## 17. Cross-Cutting Concerns

### Apollo Client Setup

- [ ] **17.1** Apollo Client provider — HTTP link + WebSocket link (split by operation type)
- [ ] **17.2** Cache normalization — `__typename + id` for all entity types
- [ ] **17.3** Optimistic updates — for send message, approve/reject callback, toggle bot status
- [ ] **17.4** Error link — global GraphQL error handler (auth errors → logout, rate limit → toast)
- [ ] **17.5** Request batching — batch multiple queries in single HTTP request where appropriate

### State Management

- [ ] **17.6** React Context for auth state (user, org, tokens)
- [ ] **17.7** Apollo cache as primary data store (no duplicate state in Redux/Zustand)
- [ ] **17.8** URL state for filters, pagination, tabs (useSearchParams)
- [ ] **17.9** localStorage for user preferences (sidebar collapsed, date range, table page size)

### Accessibility

- [ ] **17.10** Keyboard navigation — all interactive elements focusable, tab order logical
- [ ] **17.11** ARIA labels — buttons, modals, drawers, alerts properly labeled
- [ ] **17.12** Color contrast — WCAG AA compliance on all text/bg combinations
- [ ] **17.13** Screen reader support — live regions for real-time updates (new messages, toasts)
- [ ] **17.14** Focus trap — modals and drawers trap focus correctly

### Performance

- [ ] **17.15** Route-based code splitting — Next.js dynamic imports for heavy components (Recharts, editors)
- [ ] **17.16** Virtual scrolling — for long lists (conversations, notifications, customers) using `react-window` or similar
- [ ] **17.17** Image optimization — Next.js `<Image>` for avatars, logos, document thumbnails
- [ ] **17.18** Debounced search — 300ms debounce on all search inputs
- [ ] **17.19** Memoization — `useMemo`/`useCallback` for expensive computations and callback props

### Logging & Observability

- [ ] **17.20** Client-side logger (`lib/logger.ts`) — structured logs with user context, org context
- [ ] **17.21** Error tracking — capture and report unhandled exceptions
- [ ] **17.22** Performance monitoring — track page load times, query latencies
- [ ] **17.23** User action tracking — anonymized event tracking for UX analytics (clicks, navigation patterns)

---

## 18. Testing & QA

### Unit Tests

- [ ] **18.1** Hook tests — `useAuth`, `usePermission` with mock providers
- [ ] **18.2** Component tests — render tests for all major components:
  - DashboardSummary, CallbackRequestTable, NotificationComposer
  - CampaignBuilder (each wizard step), BotStudioWizard (each wizard step)
  - WebhookManager, TeamManager, DocumentManager, APIKeyManager
  - ConversationPanel, CustomerLookup, ComplianceViewer
- [ ] **18.3** Utility tests — role permission checks, date formatting, policy status mapping

### Integration Tests

- [ ] **18.4** Apollo Mock Provider tests — full page renders with mocked GraphQL responses
- [ ] **18.5** Auth flow integration — login → dashboard → sidebar navigation → logout
- [ ] **18.6** Campaign creation flow — wizard step-by-step with policy preview
- [ ] **18.7** Bot creation flow — wizard step-by-step with test panel
- [ ] **18.8** Conversation flow — open conversation → send message → receive reply
- [ ] **18.9** Webhook lifecycle — create → test → view deliveries → retry → delete

### E2E Tests

- [ ] **18.10** Playwright or Cypress setup for provider app
- [ ] **18.11** Critical paths:
  - Login → Dashboard loads with data
  - Navigate to Notifications → Compose → Send → Verify in list
  - Navigate to Campaigns → Create campaign → Launch → See progress
  - Navigate to Callbacks → View requests → Approve → Complete
  - Navigate to Bots → Create bot → Configure → Test → Activate
  - Navigate to Settings → Invite member → Verify in list
- [ ] **18.12** Cross-browser testing — Chrome, Firefox, Safari, Edge
- [ ] **18.13** Mobile viewport testing — responsive layout verification

---

## 19. Deployment & DevOps

- [ ] **19.1** Dockerfile (`infra/docker/next.Dockerfile`) — multi-stage build for provider app
- [ ] **19.2** docker-compose service — `provider-ui` with port 6060, linked to gateway
- [ ] **19.3** Environment variables:
  - `GATEWAY_URL` — GraphQL BFF endpoint
  - `NEXT_PUBLIC_WS_URL` — WebSocket endpoint for subscriptions
  - `NEXT_PUBLIC_APP_ENV` — development/staging/production
- [ ] **19.4** CI pipeline — lint → type-check → unit tests → build → E2E tests
- [ ] **19.5** Preview deployments — per-PR preview environment
- [ ] **19.6** Production deployment — container registry → orchestrator rollout
- [ ] **19.7** Health check endpoint — `/api/health` returning app + gateway connectivity status

---

## Summary Metrics

| Section | Total Items |
|---------|-------------|
| 1. Foundation & Shell | 19 |
| 2. Auth & RBAC | 17 |
| 3. Dashboard | 9 |
| 4. Customers | 15 |
| 5. Notifications | 15 |
| 6. Conversations | 16 |
| 7. Callback Requests | 13 |
| 8. Documents | 13 |
| 9. Campaigns | 21 |
| 10. Bots (AI Studio) | 23 |
| 11. Analytics | 10 |
| 12. Webhooks | 11 |
| 13. Compliance | 8 |
| 14. Integrations | 7 |
| 15. Settings | 13 |
| 16. Real-Time | 6 |
| 17. Cross-Cutting | 23 |
| 18. Testing & QA | 13 |
| 19. Deployment | 7 |
| **TOTAL** | **258** |

---

## Dependency Map — Recommended Build Order

```
Phase A — Foundation (must do first)
  1. Foundation & Shell (layout, sidebar, design system)
  2. Authentication & Authorization (login, RBAC, Apollo setup)
  17. Cross-Cutting Concerns (Apollo Client, state, logging)

Phase B — Core Features (parallel tracks)
  Track 1: 3. Dashboard → 11. Analytics
  Track 2: 4. Customers → 5. Notifications → 6. Conversations
  Track 3: 7. Callback Requests → 8. Documents

Phase C — Advanced Features (after Phase B)
  9. Campaigns (depends on Customers + Notifications)
  10. Bots (depends on Conversations + Policy)
  12. Webhooks

Phase D — Platform & Compliance
  13. Compliance
  14. Integrations
  15. Settings (can start in Phase B for team management)

Phase E — Polish & Ship
  16. Real-Time & Subscriptions (progressive enhancement throughout)
  18. Testing & QA
  19. Deployment & DevOps
```
