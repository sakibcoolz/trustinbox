# 07 — Frontend Architecture

> Provider Portal, Web App, and Admin dashboard architecture, routing, data flows, and component patterns.

## Three-App Architecture

```mermaid
graph TB
    subgraph "Frontend Applications"
        subgraph "Provider Portal (:6060)"
            PP["Next.js 15 + React 19<br/>App Router<br/>Server Components First"]
            PPAuth["httpOnly Cookies<br/>accessToken · refreshToken<br/>auth-status · activeSpId"]
            PPSSE["Real-time: SSE<br/>useLiveNotifications()<br/>useLiveDashboard()"]
        end

        subgraph "Web App (:3000)"
            WA["Next.js 14 + React 18<br/>App Router<br/>Client Components + Apollo"]
            WAAuth["localStorage<br/>token · refreshToken<br/>xmppToken · user"]
            WAXMPP["Real-time: XMPP<br/>ejabberd WebSocket<br/>Apollo Subscriptions"]
        end

        subgraph "Admin Dashboard (:3001)"
            AD["Next.js 14 + React 18<br/>App Router (stub)<br/>~5% implemented"]
        end
    end

    subgraph "Backend"
        GW["Gateway (:4000)<br/>GraphQL + REST + SSE + WebSocket"]
        EJ["ejabberd (:5222 / :5280)<br/>XMPP Chat Server"]
    end

    PP --> GW
    WA --> GW
    WA --> EJ
    AD --> GW
```

## Provider Portal Route Map

```mermaid
graph TB
    subgraph "Public Routes"
        Login["/auth/login"]
        Register["/auth/register"]
    end

    subgraph "Protected Routes (requireAuth)"
        Dash["/dashboard"]
        Notif["/notifications"]
        NotifNew["/notifications/new"]
        NotifDetail["/notifications/[id]"]
        CB["/callbacks"]
        CBDetail["/callbacks/[id]"]
        Conv["/conversations"]
        ConvDetail["/conversations/[id]"]
        Camp["/campaigns"]
        CampNew["/campaigns/new"]
        CampDetail["/campaigns/[id]"]
        Cust["/customers"]
        CustDetail["/customers/[id]"]
        Bots["/bots"]
        BotNew["/bots/new"]
        BotDetail["/bots/[id]"]
        Docs["/documents"]
        WH["/webhooks"]
        Anal["/analytics"]
        Comp["/compliance"]
        Set["/settings<br/>/profile · /team · /api-keys<br/>/notifications · /webhooks<br/>/industry"]
    end

    Login --> Dash
    Register --> Dash
    Dash --> Notif & CB & Conv & Camp & Cust & Bots & Docs & WH & Anal & Comp & Set
    Notif --> NotifNew & NotifDetail
    CB --> CBDetail
    Conv --> ConvDetail
    Camp --> CampNew & CampDetail
    Cust --> CustDetail
```

## Provider Portal Data Flow

```mermaid
sequenceDiagram
    participant Page as Server Component<br/>(page.tsx)
    participant API as API Route<br/>(/api/gateway/[...path])
    participant GW as Gateway (:4000)
    participant Svc as Backend Service

    Note over Page,Svc: === Server-Side Fetch ===
    Page->>Page: gatewayFetch('/api/v1/notifications')
    Page->>GW: GET /api/v1/notifications<br/>Cookie: accessToken=...
    GW->>Svc: gRPC ListNotifications()
    Svc-->>GW: NotificationList
    GW-->>Page: JSON response
    Page->>Page: Render with <Suspense>

    Note over Page,Svc: === Client-Side Fetch ===
    activate Page
    Page->>API: useData('/api/gateway/notifications')
    API->>GW: GET /api/v1/notifications<br/>Cookie forwarded
    GW->>Svc: gRPC ListNotifications()
    Svc-->>GW: NotificationList
    GW-->>API: JSON
    API-->>Page: JSON
    deactivate Page

    Note over Page,Svc: === Mutation ===
    Page->>API: fetch('/api/gateway/notifications', POST, body)
    API->>GW: POST /api/v1/notifications
    GW->>Svc: gRPC CreateNotification()
    Svc-->>GW: Notification
    GW-->>API: JSON 201
    API-->>Page: JSON 201
    Page->>Page: Invalidate useData cache
```

## Provider Portal Component Architecture

```mermaid
graph TB
    subgraph "Layout Shell"
        RootLayout["RootLayout<br/>ThemeProvider · AuthProvider<br/>SSEProvider · ToastProvider"]
        Sidebar["AppSidebar<br/>SidebarProvider · Navigation<br/>Role-based menu items"]
        Header["Header<br/>BreadcrumbNav · Search<br/>LiveNotificationBell · UserMenu"]
    end

    subgraph "Shared Components (src/components/)"
        UI["ui/<br/>Button · Card · Badge · Input<br/>Dialog · DropdownMenu · Tabs<br/>Table · Select · Textarea"]
        Data["data/<br/>DataTable · DataFilters · Pagination<br/>EmptyState · LoadingState"]
        Forms["forms/<br/>FormField · FormSection<br/>Validation helpers"]
        Charts["charts/<br/>AreaChart · BarChart · DonutChart<br/>MetricCard · TrendIndicator"]
        Live["live/<br/>LiveNotificationBell<br/>LiveDashboardMetrics<br/>LiveCallbackAlerts"]
    end

    subgraph "Hooks (src/lib/hooks/)"
        useAuth["useAuth() — session state"]
        useData["useData(url) — SWR-like fetching"]
        usePermission["usePermission(perm) — RBAC check"]
        useSSE["useSSE() — server-sent events"]
        useLive["useLiveNotifications()<br/>useLiveDashboard()<br/>useLiveCallbacks()"]
    end

    RootLayout --> Sidebar & Header
    Header --> Live
    Live --> useSSE & useLive
    useData --> UI & Data
```

## Web App Component Architecture

```mermaid
graph TB
    subgraph "Layout & Auth"
        WRootLayout["RootLayout<br/>ApolloProvider · AuthProvider"]
        WNavbar["Navbar · MobileNav<br/>Customer navigation"]
    end

    subgraph "Core Pages"
        WInbox["/inbox<br/>Notification list<br/>Category tabs"]
        WCallbacks["/callbacks<br/>Incoming/outgoing<br/>Availability slots"]
        WConv["/conversations<br/>Chat threads<br/>XMPP real-time"]
        WPrivacy["/privacy<br/>DND settings<br/>Blocked providers"]
        WProfile["/profile<br/>User settings<br/>Preferences"]
    end

    subgraph "Apollo Client Data Layer"
        AClient["ApolloClient<br/>httpLink → Gateway /graphql<br/>splitLink → wsLink for subscriptions"]
        ACache["InMemoryCache<br/>Type policies for pagination"]
        AHooks["useQuery · useMutation<br/>useSubscription"]
    end

    subgraph "XMPP Chat"
        XMPP["XMPP Client (strophe.js)<br/>Connect via WebSocket :5280<br/>Send/receive messages<br/>Presence updates"]
    end

    WRootLayout --> WNavbar
    WNavbar --> WInbox & WCallbacks & WConv & WPrivacy & WProfile
    WInbox --> AHooks --> AClient --> ACache
    WConv --> XMPP
```

## SSE Real-Time Architecture (Provider)

```mermaid
sequenceDiagram
    participant Browser as Provider UI
    participant SSE as SSE Endpoint<br/>/api/v1/events/stream
    participant GW as Gateway
    participant Redis as Redis Pub/Sub
    participant Svc as Backend Service

    Browser->>SSE: GET /api/v1/events/stream<br/>Accept: text/event-stream<br/>Cookie: accessToken, activeSpId

    SSE->>GW: Register SSE client<br/>(spID, userID)
    GW->>Redis: SUBSCRIBE sp:<spID>:events

    Note over Svc,Redis: Service publishes event
    Svc->>Redis: PUBLISH sp:<spID>:events<br/>{type: "notification.created", data: {...}}

    Redis-->>GW: Message received
    GW-->>SSE: data: {"type":"notification.created","payload":{...}}
    SSE-->>Browser: EventSource.onmessage

    Browser->>Browser: useLiveNotifications()<br/>Update notification bell count<br/>Show toast notification

    Note over Browser,Svc: Heartbeat every 30s to keep alive
    GW-->>Browser: : heartbeat
```

## Provider Portal Color System

```mermaid
graph TB
    subgraph "Backgrounds (Dark Theme)"
        BG1["bg-bg-primary<br/>#0b0d0f<br/>Page base"]
        BG2["bg-bg-secondary<br/>#111418<br/>Sidebar / nav"]
        BG3["bg-bg-card<br/>#151820<br/>Card surfaces"]
        BG4["bg-bg-elevated<br/>#1c2028<br/>Modals / dropdowns"]
        BG5["bg-bg-hover<br/>#1e2228<br/>Interactive hover"]
        BG6["bg-bg-input<br/>#0d1017<br/>Form inputs"]
    end

    subgraph "Typography"
        T1["text-text-primary<br/>#e4e7eb<br/>Main content"]
        T2["text-text-secondary<br/>#8b929a<br/>Descriptions"]
        T3["text-text-muted<br/>#545b65<br/>Disabled / hints"]
    end

    subgraph "Accents"
        A1["accent-blue #3b82f6"]
        A2["accent-green #22c55e"]
        A3["accent-red #ef4444"]
        A4["accent-orange #f59e0b"]
        A5["accent-purple #a855f7"]
        A6["accent-cyan #06b6d4"]
    end

    subgraph "Status Badges"
        S1["bg-status-success/10<br/>text-status-success"]
        S2["bg-status-warning/10<br/>text-status-warning"]
        S3["bg-status-error/10<br/>text-status-error"]
    end

    style BG1 fill:#0b0d0f,color:#e4e7eb
    style BG2 fill:#111418,color:#e4e7eb
    style BG3 fill:#151820,color:#e4e7eb
    style BG4 fill:#1c2028,color:#e4e7eb
    style BG5 fill:#1e2228,color:#e4e7eb
    style BG6 fill:#0d1017,color:#e4e7eb
    style A1 fill:#3b82f620,stroke:#3b82f6,color:#3b82f6
    style A2 fill:#22c55e20,stroke:#22c55e,color:#22c55e
    style A3 fill:#ef444420,stroke:#ef4444,color:#ef4444
    style A4 fill:#f59e0b20,stroke:#f59e0b,color:#f59e0b
    style A5 fill:#a855f720,stroke:#a855f7,color:#a855f7
    style A6 fill:#06b6d420,stroke:#06b6d4,color:#06b6d4
```
