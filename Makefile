.PHONY: help up down dev build test lint proto migrate seed clean

COMPOSE = docker compose

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Infrastructure ────────────────────────────────────────

up: ## Start all services with Docker Compose
	$(COMPOSE) up -d

down: ## Stop all services
	$(COMPOSE) down

up-infra: ## Start only infrastructure (postgres, redis, minio, otel)
	$(COMPOSE) up -d postgres redis minio otel-collector jaeger

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

logs-service: ## Tail logs for a specific service (usage: make logs-service SVC=policy-service)
	$(COMPOSE) logs -f $(SVC)

# ─── Development ───────────────────────────────────────────

dev-web: ## Start web app in dev mode
	cd apps/web && npm run dev

dev-admin: ## Start admin app in dev mode
	cd apps/admin && npm run dev

dev-provider: ## Start provider app in dev mode
	cd apps/provider && npm run dev

dev-gateway: ## Run GraphQL gateway locally
	cd gateway/graphql-bff && go run ./cmd/server

dev-service: ## Run a Go service locally (usage: make dev-service SVC=policy-service)
	cd services/$(SVC) && go run ./cmd/server

# ─── Build ─────────────────────────────────────────────────

build: ## Build all Go services
	@for svc in auth-service user-service policy-service organization-service \
		notification-service communication-service ai-service worker-service \
		bot-service webhook-service analytics-service industry-service; do \
		echo "Building $$svc..."; \
		cd services/$$svc && go build -o ../../bin/$$svc ./cmd/server && cd ../..; \
	done
	@echo "Building graphql-gateway..."
	@cd gateway/graphql-bff && go build -o ../../bin/graphql-bff ./cmd/server

build-web: ## Build web frontend
	cd apps/web && npm run build

build-admin: ## Build admin frontend
	cd apps/admin && npm run build

build-provider: ## Build provider frontend
	cd apps/provider && npm run build

# ─── Test ──────────────────────────────────────────────────

test: ## Run all Go tests
	go test ./services/... ./gateway/... ./packages/...

test-service: ## Run tests for a specific service (usage: make test-service SVC=policy-service)
	cd services/$(SVC) && go test ./...

test-coverage: ## Run tests with coverage
	go test -coverprofile=coverage.out ./services/... ./gateway/... ./packages/...
	go tool cover -html=coverage.out -o coverage.html

# ─── Code Generation ──────────────────────────────────────

proto: ## Generate Go code from proto files
	@echo "Generating proto..."
	@cd packages/proto && \
	for dir in auth/v1 user/v1 policy/v1 notification/v1 communication/v1 organization/v1 \
		bot/v1 webhook/v1 analytics/v1 industry/v1 document/v1; do \
		protoc --go_out=gen --go_opt=paths=source_relative \
			--go-grpc_out=gen --go-grpc_opt=paths=source_relative \
			$$dir/*.proto; \
	done

gqlgen: ## Generate GraphQL resolvers
	cd gateway/graphql-bff && go run github.com/99designs/gqlgen generate

# ─── Database ─────────────────────────────────────────────

migrate: ## Run database migrations
	@echo "Running migrations..."
	psql "postgresql://trustinbox:trustinbox_dev@localhost:5432/trustinbox?sslmode=disable" \
		-f infra/migrations/001_initial_schema.up.sql

migrate-down: ## Rollback database migrations
	psql "postgresql://trustinbox:trustinbox_dev@localhost:5432/trustinbox?sslmode=disable" \
		-f infra/migrations/001_initial_schema.down.sql

seed: ## Seed database with test data
	psql "postgresql://trustinbox:trustinbox_dev@localhost:5432/trustinbox?sslmode=disable" \
		-f infra/migrations/002_seed_data.sql

# ─── Lint ─────────────────────────────────────────────────

lint: ## Run Go linter
	golangci-lint run ./...

lint-web: ## Lint web frontend
	cd apps/web && npm run lint

lint-admin: ## Lint admin frontend
	cd apps/admin && npm run lint

# ─── Install ──────────────────────────────────────────────

install-web: ## Install web dependencies
	cd apps/web && npm install

install-admin: ## Install admin dependencies
	cd apps/admin && npm install

install-provider: ## Install provider dependencies
	cd apps/provider && npm install

install-tools: ## Install dev tools
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	go install github.com/99designs/gqlgen@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# ─── Clean ─────────────────────────────────────────────────

clean: ## Remove build artifacts
	rm -rf bin/ coverage.out coverage.html
	rm -rf apps/web/.next apps/admin/.next
