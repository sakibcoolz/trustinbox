# End-to-End Development Guide: Remaining Tasks

> This document maps every remaining development task in TrustInbox, organized by priority and dependency order.
> Each section provides the exact steps needed to go from current state to production-ready.

---

## Current Completion Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation Hardening | Complete | 100% |
| Phase 2: Database Entities | Complete | 100% |
| Phase 3: New Backend Services | Complete | 100% |
| Phase 4: Event-Driven Architecture | Complete | 100% |
| Phase 5: API Layer Expansion | Complete | 100% |
| Phase 6: Service Provider Portal | Complete | 100% |
| Phase 7: Customer App Completion | Complete | 100% |
| Phase 8: Security Hardening | Complete | 100% |
| Phase 9: Observability and Testing | Complete | 100% |
| Phase 10: Documentation and Diagrams | Complete | 100% |
| Phase 11: Deployment and Infrastructure | Partial | 80% |
| Phase 12: Provider User Management | Complete | 100% |

**Overall: 11.5 / 12 phases complete. Remaining work is infrastructure (Terraform) and production hardening.**

---

## Priority 1: Infrastructure and Deployment (Phase 11.3)

### 11.3 Terraform Infrastructure-as-Code

This is the only incomplete item from the original 12-phase plan.

#### 11.3.1 VPC Module

**What**: Create AWS VPC with public/private subnets, NAT gateway, and security groups.

**Steps**:
1. Create `infra/terraform/modules/vpc/` directory structure
2. Define VPC with 3 AZs, public subnets (ALB), private subnets (services, DB)
3. NAT gateway for private subnet outbound
4. Security groups: ALB (80/443), services (gRPC ports), DB (5432), Redis (6379)
5. Output VPC ID, subnet IDs, security group IDs

**Files to create**:
- `infra/terraform/modules/vpc/main.tf`
- `infra/terraform/modules/vpc/variables.tf`
- `infra/terraform/modules/vpc/outputs.tf`

#### 11.3.2 RDS (PostgreSQL) Module

**What**: Managed PostgreSQL 16 with Multi-AZ, encryption, automated backups.

**Steps**:
1. Create `infra/terraform/modules/rds/` directory
2. RDS PostgreSQL 16, db.r6g.large (production), db.t3.medium (staging)
3. Multi-AZ deployment, storage encryption (KMS), automated backups (30 days)
4. Private subnet placement, security group (allow from service subnets only)
5. Parameter group: `shared_preload_libraries = pg_stat_statements`, `log_min_duration_statement = 1000`
6. Output connection string, endpoint, port

#### 11.3.3 ElastiCache (Redis) Module

**What**: Managed Redis 7 cluster for events, caching, and rate limiting.

**Steps**:
1. Create `infra/terraform/modules/elasticache/` directory
2. Redis 7, cache.r6g.large (production), cache.t3.medium (staging)
3. Cluster mode enabled with 2 shards, 1 replica per shard
4. Encryption at rest (KMS) and in transit (TLS)
5. Private subnet placement
6. Output Redis endpoint, port

#### 11.3.4 S3 Bucket Module

**What**: S3 bucket for documents (replacing MinIO in production).

**Steps**:
1. Create `infra/terraform/modules/s3/` directory
2. Bucket with versioning, server-side encryption (AES-256)
3. Lifecycle rules: transition to Glacier after 365 days
4. CORS configuration for presigned URL uploads
5. Bucket policy: deny public access
6. Output bucket name, ARN

#### 11.3.5 ECS/EKS Service Definitions

**What**: Container orchestration for all 13 Go services + gateway + 3 frontend apps.

**Steps**:
1. Create `infra/terraform/modules/ecs/` directory
2. ECS Fargate cluster (or EKS if Kubernetes preferred)
3. Task definitions for each service:
   - Service container (from ECR image)
   - Health check configuration
   - Environment variables from SSM Parameter Store
   - Resource limits (CPU/memory)
   - Service discovery (AWS Cloud Map)
4. Service definitions with desired count, deployment configuration
5. Auto-scaling policies (CPU/memory target tracking)

Service resource recommendations:

| Service | CPU | Memory | Replicas (prod) |
|---------|-----|--------|-----------------|
| auth-service | 256 | 512 MB | 2 |
| user-service | 256 | 512 MB | 2 |
| policy-service | 512 | 1 GB | 3 |
| notification-service | 512 | 1 GB | 3 |
| communication-service | 256 | 512 MB | 2 |
| organization-service | 256 | 512 MB | 2 |
| document-service | 256 | 512 MB | 2 |
| industry-service | 256 | 512 MB | 1 |
| bot-service | 512 | 1 GB | 2 |
| webhook-service | 512 | 1 GB | 2 |
| analytics-service | 256 | 512 MB | 2 |
| worker-service | 512 | 1 GB | 3 |
| ai-service | 1024 | 2 GB | 2 |
| graphql-gateway | 512 | 1 GB | 3 |
| provider-app | 256 | 512 MB | 2 |
| web-app | 256 | 512 MB | 2 |
| admin-app | 256 | 512 MB | 1 |

#### 11.3.6 ALB + Route53

**What**: Application Load Balancer with TLS termination and DNS routing.

**Steps**:
1. Create `infra/terraform/modules/alb/` directory
2. ALB with HTTPS listener (ACM certificate)
3. Target groups:
   - `/graphql`, `/api/*` routes to gateway
   - `/` routes to web-app
   - `/provider/*` routes to provider-app
   - `/admin/*` routes to admin-app
4. Health check paths for each target group
5. Route53 hosted zone with A/AAAA alias records
6. Subdomains: `api.trustinbox.com`, `app.trustinbox.com`, `provider.trustinbox.com`, `admin.trustinbox.com`

#### 11.3.7 CloudWatch + Alarms

**What**: Monitoring, logging, and alerting.

**Steps**:
1. Create `infra/terraform/modules/monitoring/` directory
2. CloudWatch log groups for each service
3. Alarms:
   - Service CPU > 80% for 5 minutes
   - Service memory > 80% for 5 minutes
   - RDS connections > 80% max
   - Redis memory > 80%
   - ALB 5xx error rate > 1%
   - Policy service latency p99 > 500ms
4. SNS topic for alarm notifications
5. CloudWatch dashboard with key metrics

#### 11.3.8 IAM Roles and Policies

**What**: Least-privilege IAM for all services.

**Steps**:
1. Create `infra/terraform/modules/iam/` directory
2. ECS task execution role (ECR pull, CloudWatch logs, SSM parameters)
3. Per-service task roles:
   - document-service: S3 read/write to documents bucket
   - ai-service: Bedrock/OpenAI API access
   - worker-service: SQS read/write
   - All services: CloudWatch metrics, X-Ray traces
4. CI/CD role for GitHub Actions (ECR push, ECS deploy)

#### 11.3.9 Environment Configs

**What**: Per-environment variable files.

**Steps**:
1. Create `infra/terraform/environments/{dev,staging,production}/`
2. Each environment has `terraform.tfvars` with:
   - Instance sizes, replica counts, domain names
   - Feature flags (AI enabled, XMPP enabled)
   - Retention periods
3. Backend configuration (S3 state bucket + DynamoDB lock)

---

## Priority 2: Production Hardening

These are not in the original checklist but are essential before production deployment.

### 2.1 Gateway-to-gRPC Migration Completion

**Current state**: The gateway still directly owns some REST endpoints and database queries alongside the gRPC service calls.

**What to do**:
1. Audit all gateway handlers that still query PostgreSQL directly
2. For each direct DB query, create or verify the corresponding gRPC RPC exists
3. Replace direct queries with gRPC client calls
4. Remove database connection from gateway (gateway should be a pure BFF)
5. Verify all frontend functionality still works after migration

**Key files to audit**:
- `gateway/graphql-bff/cmd/server/provider_db_handlers.go`
- `gateway/graphql-bff/cmd/server/customer_handlers.go`
- `gateway/graphql-bff/cmd/server/profile.go`
- `gateway/graphql-bff/cmd/server/chat.go`

### 2.2 Database Connection Pooling

**What**: Configure production-ready connection pooling.

**Steps**:
1. Add PgBouncer or use `sql.DB` pool settings in each service:
   - `SetMaxOpenConns(25)` (production)
   - `SetMaxIdleConns(10)`
   - `SetConnMaxLifetime(5 * time.Minute)`
   - `SetConnMaxIdleTime(1 * time.Minute)`
2. Add connection pool metrics to OTel (pool size, wait count, idle count)
3. Configure per-service based on expected load

### 2.3 Graceful Shutdown Verification

**What**: Ensure all services handle SIGTERM correctly for zero-downtime deployments.

**Steps**:
1. Verify each service's `main.go` has signal handling:
   - `signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)`
   - `srv.GracefulStop()` for gRPC
   - Close database connections
   - Close Redis connections
   - Flush OTel traces
2. Test with `docker stop` (SIGTERM with 10s timeout)

### 2.4 Health Check Endpoints

**What**: Standard health and readiness endpoints for load balancer and orchestrator.

**Steps**:
1. Verify each service has gRPC health check (`grpc.health.v1.Health`)
2. Add HTTP `/healthz` endpoint for ALB health checks
3. Add `/readyz` endpoint that checks DB and Redis connectivity
4. Gateway: HTTP health check at `/health`

### 2.5 Secret Management

**What**: Move from environment variables to a proper secrets manager.

**Steps**:
1. AWS SSM Parameter Store for non-sensitive config
2. AWS Secrets Manager for:
   - `JWT_SECRET`
   - `ENCRYPTION_MASTER_KEY`
   - `DATABASE_URL` (with password)
   - `REDIS_URL`
   - `OPENAI_API_KEY`
   - Webhook signing secrets
3. Update service config loading to read from SSM/Secrets Manager
4. Rotate secrets on a schedule (90 days)

### 2.6 CI/CD Pipeline

**What**: GitHub Actions workflows for build, test, and deploy.

**Steps**:
1. Create `.github/workflows/ci.yml`:
   - Trigger on PR and push to main
   - Run `go vet ./...` and `golangci-lint` for all services
   - Run `go test ./...` for all services
   - Run `npm test` for all frontend apps
   - Build Docker images
2. Create `.github/workflows/deploy.yml`:
   - Trigger on push to main (staging) and tag (production)
   - Build and push images to ECR
   - Update ECS task definitions
   - Run database migrations
   - Verify health checks pass
3. Create `.github/workflows/proto.yml`:
   - Trigger on changes to `packages/proto/`
   - Run `buf lint` and `buf breaking`
   - Generate Go code and verify no diff

### 2.7 Database Migration Automation

**What**: Automated migration execution in CI/CD.

**Steps**:
1. Create migration runner Docker image with `psql` and migration scripts
2. Run migrations as ECS task before service deployment
3. Add migration version tracking (prevent re-running)
4. Add rollback capability in CI/CD
5. Test migrations against staging before production

---

## Priority 3: Feature Completion and Polish

### 3.1 Admin Portal Completion

**Current state**: Mostly shell and placeholder screens.

**What to build**:
1. **SP Verification Dashboard**: Queue of pending SPs, approve/reject with notes
2. **Platform Analytics**: Cross-SP metrics, platform health, user growth
3. **Moderation Queue**: Flagged content, spam reports, abuse reports
4. **User Management**: Platform-level user lookup, account actions
5. **System Health**: Service status, queue depths, error rates
6. **Billing Dashboard**: Subscription management, invoice generation
7. **Configuration**: Platform-wide settings, feature flags, rate limits

### 3.2 End-to-End Integration Testing

**What**: Comprehensive integration test suite covering all business flows.

**Steps**:
1. Create `tests/integration/` test suite
2. Test scenarios:
   - Full notification lifecycle (create, policy, deliver, read)
   - Callback request lifecycle (request, approve, schedule, complete)
   - Campaign lifecycle (create, preview, launch, track)
   - Bot conversation with escalation
   - Document upload, share, and access
   - Webhook subscription and delivery
   - User registration and SP onboarding
   - Multi-SP user with context switching
3. Use Docker Compose for test infrastructure
4. Run in CI/CD pipeline

### 3.3 Performance Testing

**What**: Load testing to identify bottlenecks before production.

**Steps**:
1. Create load test scripts (k6 or Locust)
2. Test scenarios:
   - 1000 concurrent notification sends
   - 100 concurrent policy evaluations
   - Campaign fan-out to 10,000 targets
   - 500 concurrent WebSocket connections
   - Webhook delivery under load
3. Identify and fix bottlenecks:
   - Database query optimization
   - Connection pool tuning
   - Redis pipeline optimization
   - gRPC connection reuse

---

## Priority 4: Mobile Application

### 4.1 React Native / Flutter App

**What**: Native mobile app for customers.

**Steps**:
1. Choose framework (React Native recommended for code sharing with web)
2. Core screens:
   - Login / Registration
   - Inbox (notifications grouped by SP)
   - Conversation view
   - Callback request approval
   - Document viewer
   - Settings (preferences, DND, availability)
   - SP directory
3. Push notifications via Firebase Cloud Messaging (FCM) / APNs
4. Biometric authentication (Face ID / fingerprint)
5. Offline support for viewing cached notifications

---

## Development Order Recommendation

For a team working in sprints, the recommended order is:

| Sprint | Focus | Deliverables |
|--------|-------|-------------|
| Sprint 1 | Terraform foundation | VPC, RDS, ElastiCache, S3, IAM |
| Sprint 2 | Container deployment | ECS/EKS, ALB, Route53, CI/CD pipeline |
| Sprint 3 | Production hardening | Health checks, secrets, connection pooling, graceful shutdown |
| Sprint 4 | Gateway migration | Remove direct DB from gateway, pure BFF |
| Sprint 5 | Integration testing | E2E tests for all business flows |
| Sprint 6 | Admin portal | SP verification, moderation, platform analytics |
| Sprint 7 | Performance testing | Load tests, optimization, monitoring |
| Sprint 8 | Mobile app foundation | Auth, inbox, notifications |
| Sprint 9 | Mobile app completion | Conversations, callbacks, documents, settings |
| Sprint 10 | Production launch | Final security audit, go-live |

---

## File Structure for New Code

```
infra/
  terraform/
    modules/
      vpc/           # VPC, subnets, NAT, security groups
      rds/           # PostgreSQL RDS
      elasticache/   # Redis ElastiCache
      s3/            # Document storage bucket
      ecs/           # ECS cluster, task defs, services
      alb/           # Load balancer, target groups
      monitoring/    # CloudWatch, alarms, dashboards
      iam/           # Roles, policies
    environments/
      dev/           # Dev environment config
      staging/       # Staging environment config
      production/    # Production environment config
    main.tf          # Root module composition
    variables.tf     # Global variables
    outputs.tf       # Global outputs
    backend.tf       # S3 state backend config

.github/
  workflows/
    ci.yml           # Build, test, lint
    deploy.yml       # Deploy to ECS
    proto.yml        # Proto lint and gen

tests/
  integration/
    notification_test.go
    callback_test.go
    campaign_test.go
    bot_test.go
    webhook_test.go
    auth_test.go
    document_test.go
```
