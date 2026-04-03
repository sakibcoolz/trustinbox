# 02 — Service Topology

> Detailed view of all 13 microservices, their gRPC ports, inter-service dependencies, and data store connections.

## Full Service Map

```mermaid
graph TB
    subgraph "API Gateway (:4000)"
        GW["GraphQL BFF<br/>Go · gqlgen · Chi Router<br/>GraphQL + REST + WebSocket + SSE"]
    end

    subgraph "Core Services"
        Auth["🔐 auth-service<br/>:50051<br/>Login · Register · JWT · Refresh"]
        User["👤 user-service<br/>:50052<br/>Profile · Privacy · DND · Availability<br/>· Blocked SPs · Virtual IDs"]
        Policy["🛡️ policy-service<br/>:50053<br/>MANDATORY Gatekeeper<br/>9-Step Evaluation Engine"]
        Org["🏢 organization-service<br/>:50054<br/>SP CRUD · Verification<br/>· Team · Invitations"]
    end

    subgraph "Communication Services"
        Notif["📬 notification-service<br/>:50055<br/>Create · Deliver · Read<br/>· Campaigns · Priorities"]
        Comm["💬 communication-service<br/>:50056<br/>Callbacks · Conversations<br/>· Messages · Spam Reports"]
        Doc["📄 document-service<br/>:50062<br/>Upload · Versions · Share<br/>· Presigned URLs · Classification"]
    end

    subgraph "Intelligence Services"
        AI["🤖 ai-service<br/>:50057<br/>Orchestrator · RAG · Categorizer<br/>· Spam Detector · Summarizer"]
        Bot["🤖 bot-service<br/>:50059<br/>Bot CRUD · Permissions<br/>· Knowledge · Actions · Analytics"]
    end

    subgraph "Platform Services"
        Worker["⚙️ worker-service<br/>:50058<br/>Delivery · Callbacks<br/>· Campaigns · Cleanup"]
        Webhook["🔗 webhook-service<br/>:50060<br/>Subscriptions · HMAC Delivery<br/>· Retry · Event Dispatch"]
        Analytics["📊 analytics-service<br/>:50061<br/>Dashboard · Daily Metrics<br/>· Domain Breakdowns"]
        Industry["🏭 industry-service<br/>:50063<br/>Templates · Compliance Hints<br/>· Bot Prompts · Presets"]
    end

    subgraph "Data Stores"
        PG[("🐘 PostgreSQL 16<br/>:5432<br/>Source of Truth")]
        Redis[("⚡ Redis 7<br/>:6379<br/>Events · Cache · Presence")]
        MinIO[("📦 MinIO<br/>:9000<br/>S3-Compatible Files")]
        XMPP[("💬 ejabberd<br/>:5222/:5280<br/>XMPP Server")]
    end

    %% Gateway → Services (gRPC)
    GW ==>|gRPC| Auth
    GW ==>|gRPC| User
    GW ==>|gRPC| Policy
    GW ==>|gRPC| Org
    GW ==>|gRPC| Notif
    GW ==>|gRPC| Comm
    GW ==>|gRPC| AI
    GW ==>|gRPC| Bot
    GW ==>|gRPC| Webhook
    GW ==>|gRPC| Analytics
    GW ==>|gRPC| Doc
    GW ==>|gRPC| Industry
    GW -.->|"WebSocket Proxy"| XMPP

    %% Inter-service calls (thin arrows)
    Notif -->|"Policy Check"| Policy
    Comm -->|"Policy Check"| Policy
    Bot -->|"Policy Check"| Policy
    Bot -->|"AI Completion"| AI

    %% Services → Data Stores
    Auth --> PG
    User --> PG
    Policy --> PG
    Org --> PG
    Notif --> PG
    Comm --> PG
    Bot --> PG
    Webhook --> PG
    Analytics --> PG
    Doc --> PG
    Industry --> PG

    Notif -.-> Redis
    Worker -.-> Redis
    Webhook -.-> Redis
    Analytics -.-> Redis

    Doc --> MinIO
```

## Service Dependency Matrix

```mermaid
graph LR
    subgraph "Depends on Policy Service (Mandatory)"
        Notif["notification-service"]
        Comm["communication-service"]
        Bot["bot-service"]
    end

    subgraph "Depends on AI Service"
        Bot2["bot-service"]
    end

    subgraph "Depends on Redis (Events)"
        Notif2["notification-service<br/>(publish)"]
        Comm2["communication-service<br/>(publish)"]
        Bot3["bot-service<br/>(publish)"]
        Webhook2["webhook-service<br/>(publish + consume)"]
        Analytics2["analytics-service<br/>(consume)"]
        Worker2["worker-service<br/>(consume)"]
        Org2["organization-service<br/>(publish)"]
        Auth2["auth-service<br/>(publish)"]
    end

    Policy["🛡️ policy-service"]
    AI["🤖 ai-service"]
    Redis[("Redis")]

    Notif -->|"EvaluateCommunication"| Policy
    Comm -->|"CheckCallbackPermission"| Policy
    Bot -->|"EvaluateBotAction"| Policy
    Bot2 -->|"ChatCompletion"| AI

    Notif2 & Comm2 & Bot3 & Org2 & Auth2 -->|"Publish"| Redis
    Redis -->|"Consume"| Worker2
    Redis -->|"Consume"| Webhook2
    Redis -->|"Consume"| Analytics2
```

## Port Allocation Map

```mermaid
graph LR
    subgraph "gRPC Ports (50051-50063)"
        P1["50051 — auth"]
        P2["50052 — user"]
        P3["50053 — policy"]
        P4["50054 — organization"]
        P5["50055 — notification"]
        P6["50056 — communication"]
        P7["50057 — ai"]
        P8["50058 — worker"]
        P9["50059 — bot"]
        P10["50060 — webhook"]
        P11["50061 — analytics"]
        P12["50062 — document"]
        P13["50063 — industry"]
    end

    subgraph "HTTP Ports"
        H1["4000 — Gateway (GraphQL + REST)"]
        H2["3000 — Web App (Customer)"]
        H3["3001 — Admin App"]
        H4["6060 — Provider App"]
    end

    subgraph "Infrastructure Ports"
        I1["5432 — PostgreSQL"]
        I2["6379 — Redis"]
        I3["9000 — MinIO (S3 API)"]
        I4["9001 — MinIO (Console)"]
        I5["5222 — ejabberd (XMPP)"]
        I6["5280 — ejabberd (HTTP/WS)"]
    end

    subgraph "Observability Ports"
        O1["4317 — OTel Collector (gRPC)"]
        O2["4318 — OTel Collector (HTTP)"]
        O3["16686 — Jaeger UI"]
        O4["9091 — Prometheus"]
        O5["3100 — Grafana"]
    end
```
