# 01 — System Architecture

> High-level C4-style context diagram showing actors, frontends, gateway, backend services, and infrastructure.

## System Context Diagram

```mermaid
graph TB
    subgraph Actors
        Customer["👤 Customer<br/>(End User)"]
        SPUser["🏢 Service Provider<br/>(SP Admin / Agent / Analyst)"]
        PlatformAdmin["🛡️ Platform Admin"]
    end

    subgraph Frontend["Frontend Apps"]
        WebApp["📱 Web App<br/>Customer Portal<br/>Next.js 14 · React 18<br/>:3000"]
        ProviderApp["💼 Provider Portal<br/>Service Provider Dashboard<br/>Next.js 15 · React 19<br/>:6060"]
        AdminApp["⚙️ Admin Dashboard<br/>Platform Administration<br/>Next.js 14 · React 18<br/>:3001"]
    end

    subgraph Gateway["API Gateway"]
        GW["🌐 GraphQL BFF<br/>Gateway<br/>Go · gqlgen · Chi<br/>:4000"]
    end

    subgraph Services["Go Microservices (gRPC)"]
        Auth["🔐 Auth<br/>:50051"]
        User["👤 User<br/>:50052"]
        Policy["🛡️ Policy<br/>:50053"]
        Org["🏢 Organization<br/>:50054"]
        Notif["📬 Notification<br/>:50055"]
        Comm["💬 Communication<br/>:50056"]
        AI["🤖 AI<br/>:50057"]
        Worker["⚙️ Worker<br/>:50058"]
        Bot["🤖 Bot<br/>:50059"]
        Webhook["🔗 Webhook<br/>:50060"]
        Analytics["📊 Analytics<br/>:50061"]
        Doc["📄 Document<br/>:50062"]
        Industry["🏭 Industry<br/>:50063"]
    end

    subgraph Infrastructure["Infrastructure"]
        PG["🐘 PostgreSQL 16<br/>:5432"]
        Redis["⚡ Redis 7<br/>:6379"]
        MinIO["📦 MinIO<br/>:9000"]
        XMPP["💬 ejabberd<br/>:5222 / :5280"]
    end

    subgraph Observability["Observability"]
        OTel["📡 OTel Collector<br/>:4317 / :4318"]
        Jaeger["🔍 Jaeger<br/>:16686"]
        Prom["📈 Prometheus<br/>:9091"]
        Grafana["📊 Grafana<br/>:3100"]
    end

    Customer --> WebApp
    SPUser --> ProviderApp
    PlatformAdmin --> AdminApp

    WebApp -->|"HTTP/GraphQL<br/>+ XMPP WebSocket"| GW
    ProviderApp -->|"HTTP/REST<br/>+ SSE"| GW
    AdminApp -->|"HTTP/GraphQL"| GW

    GW -->|"gRPC"| Auth
    GW -->|"gRPC"| User
    GW -->|"gRPC"| Policy
    GW -->|"gRPC"| Org
    GW -->|"gRPC"| Notif
    GW -->|"gRPC"| Comm
    GW -->|"gRPC"| AI
    GW -->|"gRPC"| Bot
    GW -->|"gRPC"| Webhook
    GW -->|"gRPC"| Analytics
    GW -->|"gRPC"| Doc
    GW -->|"gRPC"| Industry
    GW -->|"WebSocket Proxy"| XMPP

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
    Doc --> MinIO
    Industry --> PG

    Notif --> Redis
    Worker --> Redis
    Webhook --> Redis
    Analytics --> Redis

    Worker -->|"Consume Redis Streams"| Redis

    Auth -.->|"OTLP"| OTel
    User -.->|"OTLP"| OTel
    Policy -.->|"OTLP"| OTel
    GW -.->|"OTLP"| OTel
    OTel --> Jaeger
    OTel --> Prom
    Prom --> Grafana
```

## Container Diagram — Gateway Detail

```mermaid
graph LR
    subgraph "GraphQL BFF Gateway (:4000)"
        direction TB
        CORS["CORS Middleware"]
        RBAC["RBAC Middleware<br/>JWT Validation"]
        Tenant["Tenant Middleware<br/>RLS Context"]
        RateLimit["Rate Limiter<br/>500 req/min"]

        subgraph "Endpoints"
            GraphQL["/graphql<br/>GraphQL BFF"]
            REST["/api/v1/*<br/>Provider REST API"]
            WS["/api/ws<br/>WebSocket Hub"]
            SSE["/api/notifications/stream<br/>SSE"]
            Upload["/api/upload<br/>File Upload"]
            AuthAPI["/api/auth/*<br/>Auth Routes"]
            XMPPWS["/api/xmpp-ws<br/>XMPP Proxy"]
        end

        subgraph "gRPC Clients"
            SC["ServiceClients<br/>13 gRPC connections"]
        end

        CORS --> RBAC --> Tenant
        Tenant --> GraphQL
        Tenant --> REST
        RBAC --> WS
        RBAC --> SSE
        RBAC --> Upload
        AuthAPI
        RateLimit --> REST

        GraphQL --> SC
        REST --> SC
    end
```

## Deployment Topology

```mermaid
graph TB
    subgraph "Docker Compose Stack"
        subgraph "Infrastructure Layer"
            PG["PostgreSQL 16<br/>:5432<br/>Volume: pgdata"]
            Redis["Redis 7<br/>:6379<br/>Volume: redisdata"]
            MinIO["MinIO<br/>:9000/:9001<br/>Bucket: trustinbox"]
            Ejabberd["ejabberd<br/>:5222/:5280<br/>XMPP + HTTP Admin"]
        end

        subgraph "Observability Layer"
            OTel["OTel Collector<br/>:4317 gRPC / :4318 HTTP"]
            Jaeger["Jaeger<br/>:16686 UI / :14268 Ingest"]
            Prom["Prometheus<br/>:9091"]
            Grafana["Grafana<br/>:3100"]
        end

        subgraph "Application Layer"
            GW["graphql-bff<br/>:4000"]
            S1["auth-service :50051"]
            S2["user-service :50052"]
            S3["policy-service :50053"]
            S4["org-service :50054"]
            S5["notification-service :50055"]
            S6["communication-service :50056"]
            S7["ai-service :50057"]
            S8["worker-service :50058"]
            S9["bot-service :50059"]
            S10["webhook-service :50060"]
            S11["analytics-service :50061"]
            S12["document-service :50062"]
            S13["industry-service :50063"]
        end

        subgraph "Frontend Layer (Dev)"
            Web["web :3000"]
            Provider["provider :6060"]
            Admin["admin :3001"]
        end
    end

    GW --> S1 & S2 & S3 & S4 & S5 & S6 & S7 & S9 & S10 & S11 & S12 & S13
    S1 & S2 & S3 & S4 & S5 & S6 & S9 & S10 & S11 & S12 & S13 --> PG
    S5 & S8 & S10 & S11 --> Redis
    S12 --> MinIO
    GW --> Ejabberd
    Web & Provider & Admin --> GW
```
