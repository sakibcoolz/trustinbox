# 08 — Observability Stack

> OpenTelemetry pipeline, tracing, metrics, logging, and monitoring infrastructure.

## Observability Infrastructure

```mermaid
graph TB
    subgraph "Go Microservices (13)"
        S1["auth-service"]
        S2["user-service"]
        S3["policy-service"]
        S4["org-service"]
        S5["notification-service"]
        S6["communication-service"]
        S7["ai-service"]
        S8["worker-service"]
        S9["bot-service"]
        S10["webhook-service"]
        S11["analytics-service"]
        S12["document-service"]
        S13["industry-service"]
    end

    subgraph "Gateway"
        GW["graphql-bff<br/>(:4000)"]
    end

    subgraph "OTel SDK (cornerstone/tracing + metrics)"
        SDK["OTLP Exporter<br/>gRPC → :4317<br/>HTTP → :4318"]
    end

    subgraph "OpenTelemetry Collector (:4317 / :4318)"
        Recv["Receivers<br/>otlp (gRPC + HTTP)<br/>prometheus (scrape)"]
        Proc["Processors<br/>batch (200ms, 512 spans)<br/>memory_limiter (400→500 MiB)"]
        Exp["Exporters<br/>otlp → Jaeger<br/>prometheus → :8889"]
    end

    subgraph "Backends"
        Jaeger["Jaeger (:16686)<br/>Distributed Tracing UI<br/>Span storage & search"]
        Prom["Prometheus (:9091)<br/>Metrics scraping<br/>15s interval"]
        Grafana["Grafana (:3100)<br/>Dashboard visualization<br/>4 pre-built dashboards"]
    end

    S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9 & S10 & S11 & S12 & S13 --> SDK
    GW --> SDK
    SDK --> Recv --> Proc --> Exp
    Exp --> Jaeger
    Exp --> Prom
    Prom --> Grafana
```

## Tracing Pipeline

```mermaid
sequenceDiagram
    participant Client as Browser
    participant GW as Gateway
    participant Svc as Backend Service
    participant DB as PostgreSQL
    participant OTel as OTel Collector
    participant Jaeger as Jaeger

    Client->>GW: POST /api/v1/notifications<br/>x-request-id: abc-123

    Note over GW: Span: gateway.CreateNotification<br/>trace_id: auto<br/>attrs: request_id, user_id, sp_id

    GW->>Svc: gRPC CreateNotification()<br/>Propagate: traceparent header

    Note over Svc: Span: notification-service.Create<br/>parent: gateway span<br/>attrs: category, priority

    Svc->>Svc: tracing.StartSpan(ctx, "notification-service", "Create")

    Svc->>DB: INSERT INTO notifications...
    Note over Svc,DB: Span: db.insert.notifications<br/>attrs: db.statement (truncated)
    DB-->>Svc: OK

    Svc->>Svc: publishEvent(notification.created)
    Note over Svc: Span: events.publish<br/>attrs: event_type

    Svc-->>GW: NotificationResponse
    GW-->>Client: 201 Created

    Note over GW,Jaeger: Async export
    GW->>OTel: OTLP/gRPC batch spans
    Svc->>OTel: OTLP/gRPC batch spans
    OTel->>Jaeger: Forward spans
```

## Span Attributes Convention

```mermaid
graph TB
    subgraph "Standard Attributes"
        SA1["rpc.system = 'grpc'"]
        SA2["rpc.service = 'notification.v1.NotificationService'"]
        SA3["rpc.method = 'CreateNotification'"]
    end

    subgraph "Business Attributes (trustinbox.*)"
        BA1["trustinbox.tenant_id"]
        BA2["trustinbox.user_id"]
        BA3["trustinbox.service_provider_id"]
        BA4["trustinbox.notification_id"]
        BA5["trustinbox.bot_id"]
        BA6["trustinbox.policy_decision"]
        BA7["trustinbox.campaign_id"]
        BA8["trustinbox.event_type"]
    end

    subgraph "DB Attributes"
        DA1["db.system = 'postgresql'"]
        DA2["db.statement = 'INSERT INTO...'"]
        DA3["db.operation = 'insert'"]
        DA4["db.sql.table = 'notifications'"]
    end
```

## Metrics Architecture

```mermaid
graph TB
    subgraph "Application Metrics (OTel SDK)"
        M1["trustinbox.notifications.sent<br/>Counter — per channel, category"]
        M2["trustinbox.notifications.delivered<br/>Counter — per channel"]
        M3["trustinbox.notifications.read<br/>Counter"]
        M4["trustinbox.notifications.rejected<br/>Counter — per reason"]
        M5["trustinbox.callbacks.requested<br/>Counter"]
        M6["trustinbox.callbacks.approved<br/>Counter"]
        M7["trustinbox.callbacks.rejected<br/>Counter"]
        M8["trustinbox.policy.evaluations<br/>Counter — per decision"]
        M9["trustinbox.policy.denials<br/>Counter — per reason"]
        M10["trustinbox.bot.actions<br/>Counter — per tool"]
        M11["trustinbox.bot.escalations<br/>Counter"]
        M12["trustinbox.webhooks.deliveries<br/>Counter — per status"]
        M13["trustinbox.webhooks.failures<br/>Counter"]
        M14["trustinbox.request.duration<br/>Histogram — per service, method"]
    end

    subgraph "Infrastructure Metrics (Prometheus Scrape)"
        IM1["go_goroutines"]
        IM2["go_memstats_alloc_bytes"]
        IM3["process_cpu_seconds_total"]
        IM4["grpc_server_handled_total"]
        IM5["grpc_server_handling_seconds"]
    end

    subgraph "Prometheus (:9091)"
        PS["Scrape Targets<br/>• OTel Collector :8889 (15s)<br/>• Each service :900X/metrics (15s)"]
    end

    subgraph "Grafana (:3100)"
        G1["Dashboard: Service Overview<br/>Request rate, error rate, latency"]
        G2["Dashboard: Notification Pipeline<br/>Sent → Delivered → Read funnel"]
        G3["Dashboard: Policy Engine<br/>Evaluations, denials by reason"]
        G4["Dashboard: Infrastructure<br/>CPU, memory, goroutines per service"]
    end

    M1 & M2 & M3 & M4 & M5 & M6 & M7 & M8 & M9 & M10 & M11 & M12 & M13 & M14 --> PS
    IM1 & IM2 & IM3 & IM4 & IM5 --> PS
    PS --> G1 & G2 & G3 & G4
```

## Structured Logging Pipeline

```mermaid
graph LR
    subgraph "Application (Zap Logger)"
        L1["log.Info('notification created',<br/>zap.String('notification_id', id),<br/>zap.String('user_id', uid),<br/>zap.String('channel', ch))"]
        L2["log.Error('delivery failed',<br/>zap.Error(err),<br/>zap.String('notification_id', id))"]
    end

    subgraph "JSON Output (stdout)"
        J1["{<br/>'level': 'info',<br/>'ts': 1234567890.123,<br/>'msg': 'notification created',<br/>'notification_id': 'abc-123',<br/>'user_id': 'usr-456',<br/>'channel': 'push'<br/>}"]
    end

    subgraph "Docker / Container Runtime"
        Docker["docker logs <container><br/>Captured from stdout/stderr"]
    end

    L1 --> J1 --> Docker
    L2 --> J1

    subgraph "Frontend Logging (Provider)"
        FL["[provider-ui] prefix<br/>Configurable via NEXT_PUBLIC_LOG_LEVEL<br/>Levels: debug · info · warn · error"]
    end
```

## Health Check Architecture

```mermaid
graph TB
    subgraph "Per Service"
        HC["health.NewServer()<br/>gRPC Health Check<br/>reflection.Register()"]
        Ready["Readiness: DB ping + Redis ping"]
        Live["Liveness: process alive"]
    end

    subgraph "Gateway Health"
        GHC["/health endpoint<br/>Checks all backend connections"]
    end

    subgraph "Docker Compose Healthchecks"
        PG["PostgreSQL<br/>pg_isready -U trustinbox"]
        RD["Redis<br/>redis-cli ping"]
        MN["MinIO<br/>curl -f /minio/health/live"]
    end

    HC --> Ready & Live
    GHC --> HC
    PG & RD & MN
```
