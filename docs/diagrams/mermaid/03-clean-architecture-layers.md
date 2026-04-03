# 03 — Clean Architecture Layers

> Per-service internal structure following Clean Architecture: Domain → Use Case → Delivery → Infrastructure.

## Layer Dependency Rule

```mermaid
graph TB
    subgraph "Clean Architecture — Dependency Direction"
        D["🟢 Domain Layer<br/>entity/ · repository/<br/>Pure Go structs, interfaces<br/>ZERO external dependencies"]
        U["🔵 Use Case Layer<br/>usecase/<br/>Business logic, validation<br/>Depends on: Domain only"]
        DL["🟡 Delivery Layer<br/>delivery/grpc/<br/>gRPC handlers, proto mapping<br/>Depends on: Use Case"]
        I["🟠 Infrastructure Layer<br/>infra/postgres/<br/>SQL implementations<br/>Depends on: Domain interfaces"]
    end

    DL -->|"calls"| U
    U -->|"uses interfaces from"| D
    I -->|"implements interfaces from"| D
    DL -.->|"never imports"| I
    U -.->|"never imports"| I

    style D fill:#22c55e20,stroke:#22c55e
    style U fill:#3b82f620,stroke:#3b82f6
    style DL fill:#f59e0b20,stroke:#f59e0b
    style I fill:#f9731620,stroke:#f97316
```

## Service Internal Structure (Generic)

```mermaid
graph TB
    subgraph "services/<name>/"
        subgraph "cmd/server/"
            Main["main.go<br/>Config → Logger → DB → Redis<br/>→ Repos → UseCase → Handler<br/>→ gRPC Server → Graceful Shutdown"]
        end

        subgraph "internal/domain/"
            Entity["entity/<br/>Pure structs: Bot, Notification,<br/>Campaign, etc.<br/>No tags, no logic"]
            Repo["repository/<br/>Interface contracts:<br/>BotRepository, etc.<br/>Never implementation"]
        end

        subgraph "internal/usecase/"
            UC["usecase.go<br/>Business logic<br/>Validation · Policy · Orchestration<br/>Event publishing"]
            UCTest["usecase_test.go<br/>Unit tests with mocks<br/>Hand-written in-memory repos"]
        end

        subgraph "internal/delivery/"
            GRPC["grpc/handler.go<br/>Thin handlers:<br/>Proto → UseCase input<br/>Result → Proto response<br/>mapError() for status codes"]
        end

        subgraph "internal/infra/"
            PG["postgres/repo.go<br/>SQL implementation of<br/>repository interfaces<br/>Parameterized queries ($1,$2)"]
        end

        subgraph "internal/consumer/ (optional)"
            Consumer["consumer.go<br/>Redis Stream consumer<br/>Event-driven processing"]
        end

        subgraph "internal/testfixtures/ (optional)"
            Fixtures["Builder pattern<br/>NewBotBuilder().<br/>WithID().WithName().<br/>Build()"]
        end
    end

    Main --> UC
    Main --> GRPC
    Main --> PG
    GRPC --> UC
    UC --> Repo
    PG -.->|implements| Repo
    UC --> Entity
    PG --> Entity

    style Entity fill:#22c55e20,stroke:#22c55e
    style Repo fill:#22c55e20,stroke:#22c55e
    style UC fill:#3b82f620,stroke:#3b82f6
    style GRPC fill:#f59e0b20,stroke:#f59e0b
    style PG fill:#f9731620,stroke:#f97316
```

## Wiring Pattern (main.go)

```mermaid
sequenceDiagram
    participant main as main.go
    participant cfg as Config
    participant log as Logger
    participant db as PostgreSQL
    participant redis as Redis
    participant pub as EventPublisher
    participant repo as Repositories
    participant uc as UseCase
    participant handler as gRPC Handler
    participant srv as gRPC Server

    main->>cfg: config.Load()
    main->>log: logging.NewLogger(cfg)
    main->>db: sql.Open("postgres", cfg.DatabaseURL)
    main->>redis: redis.NewClient(cfg.RedisURL)
    main->>pub: events.NewRedisStreamPublisher(redis)

    main->>repo: postgres.NewXxxRepo(db)
    main->>uc: usecase.NewXxxUseCase(repo, pub, log)
    main->>handler: grpc.NewXxxHandler(uc)

    main->>srv: grpc.NewServer(interceptors...)
    main->>srv: pb.RegisterXxxServiceServer(srv, handler)
    main->>srv: health.NewServer()
    main->>srv: reflection.Register(srv)

    main->>srv: srv.Serve(listener)

    Note over main,srv: signal.Notify(SIGINT, SIGTERM)<br/>srv.GracefulStop()
```

## Use Case Method Pattern

```mermaid
sequenceDiagram
    participant handler as gRPC Handler
    participant uc as UseCase
    participant tracing as Tracing
    participant repo as Repository
    participant policy as PolicyChecker
    participant pub as EventPublisher
    participant log as Logger

    handler->>uc: uc.Create(ctx, input)

    uc->>tracing: StartSpan(ctx, "service", "Create")
    Note over uc,tracing: defer span.End()

    uc->>uc: Validate input fields
    alt Invalid
        uc-->>handler: bizerr.InvalidInput("field required")
    end

    opt Policy Required
        uc->>policy: EvaluateCommunication(ctx, ...)
        alt Denied
            uc-->>handler: bizerr.PolicyDenied(reason)
        end
    end

    uc->>repo: repo.Create(ctx, entity)
    alt DB Error
        uc->>log: log.Error("failed to create", zap.Error(err))
        uc-->>handler: bizerr.Internal("create failed", err)
    end

    uc->>pub: Publish(ctx, event)
    Note over uc,pub: Best-effort: log failure but don't propagate

    uc->>log: log.Info("entity created", zap.String("id", id))
    uc-->>handler: return entity, nil
```

## Error Translation (Delivery Layer)

```mermaid
graph LR
    subgraph "Business Errors (cornerstone/errors)"
        NotFound["bizerr.NotFound"]
        InvalidInput["bizerr.InvalidInput"]
        Forbidden["bizerr.Forbidden"]
        PolicyDenied["bizerr.PolicyDenied"]
        Internal["bizerr.Internal"]
    end

    subgraph "gRPC Status Codes"
        S1["codes.NotFound"]
        S2["codes.InvalidArgument"]
        S3["codes.PermissionDenied"]
        S4["codes.PermissionDenied"]
        S5["codes.Internal"]
    end

    subgraph "HTTP Status (Gateway)"
        H1["404 Not Found"]
        H2["400 Bad Request"]
        H3["403 Forbidden"]
        H4["403 Forbidden"]
        H5["500 Internal Server Error"]
    end

    NotFound --> S1 --> H1
    InvalidInput --> S2 --> H2
    Forbidden --> S3 --> H3
    PolicyDenied --> S4 --> H4
    Internal --> S5 --> H5
```
