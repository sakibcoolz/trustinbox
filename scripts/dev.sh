#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== TrustInbox Local Dev Startup ==="
echo ""

# ── 1. Start infrastructure (Docker) ────────────────────────────────────────
echo "▶ Starting infrastructure services (Docker)..."
docker compose -f "$ROOT/docker-compose.infra.yml" up -d
echo ""

# ── 2. Wait for Postgres to be ready ────────────────────────────────────────
echo "⏳ Waiting for Postgres..."
for i in $(seq 1 30); do
  if docker compose -f "$ROOT/docker-compose.infra.yml" exec -T postgres \
       pg_isready -U trustinbox -d trustinbox -q 2>/dev/null; then
    echo "   Postgres ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "   ERROR: Postgres did not become ready in time." >&2
    exit 1
  fi
  sleep 2
done

# ── 3. Wait for Redis to be ready ────────────────────────────────────────────
echo "⏳ Waiting for Redis..."
for i in $(seq 1 15); do
  if docker compose -f "$ROOT/docker-compose.infra.yml" exec -T redis \
       redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "   Redis ready."
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "   ERROR: Redis did not become ready in time." >&2
    exit 1
  fi
  sleep 2
done
echo ""

# ── 4. Load env ──────────────────────────────────────────────────────────────
set -a
source "$ROOT/.env"
set +a

# ── 5. Kill any stale processes on our ports ────────────────────────────────
PORTS="50051 50052 50053 50054 50055 50056 50057 50058 4000 3000"
for port in $PORTS; do
  fuser -k "$port/tcp" 2>/dev/null || true
done
sleep 1

# ── 6. Trap to kill all background processes on exit ────────────────────────
trap 'echo ""; echo "Shutting down..."; kill $(jobs -p) 2>/dev/null; wait' EXIT INT TERM

# ── 7. Start Go services ─────────────────────────────────────────────────────
GRPC_PORT=50051 SERVICE_NAME=auth-service \
  go run "$ROOT/services/auth-service/cmd/server" &
echo "[auth-service]         → :50051"

GRPC_PORT=50052 SERVICE_NAME=user-service \
  go run "$ROOT/services/user-service/cmd/server" &
echo "[user-service]         → :50052"

GRPC_PORT=50053 SERVICE_NAME=policy-service \
  go run "$ROOT/services/policy-service/cmd/server" &
echo "[policy-service]       → :50053"

GRPC_PORT=50054 SERVICE_NAME=organization-service \
  go run "$ROOT/services/organization-service/cmd/server" &
echo "[organization-service] → :50054"

GRPC_PORT=50055 SERVICE_NAME=notification-service \
  go run "$ROOT/services/notification-service/cmd/server" &
echo "[notification-service] → :50055"

GRPC_PORT=50056 SERVICE_NAME=communication-service \
  go run "$ROOT/services/communication-service/cmd/server" &
echo "[communication-service]→ :50056"

GRPC_PORT=50057 SERVICE_NAME=ai-service \
  go run "$ROOT/services/ai-service/cmd/server" &
echo "[ai-service]           → :50057"

GRPC_PORT=50058 SERVICE_NAME=worker-service \
  go run "$ROOT/services/worker-service/cmd/server" &
echo "[worker-service]       → :50058"

# ── 8. Start GraphQL gateway ─────────────────────────────────────────────────
HTTP_PORT=4000 SERVICE_NAME=graphql-gateway \
  go run "$ROOT/gateway/graphql-bff/cmd/server" &
echo "[graphql-gateway]      → :4000"

# ── 9. Start Next.js frontend ────────────────────────────────────────────────
(cd "$ROOT/apps/web" && GATEWAY_URL="$GATEWAY_URL" npm run dev) &
echo "[frontend]             → :3000"

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  App       http://localhost:3000         │"
echo "│  GraphQL   http://localhost:4000/graphql │"
echo "│  Jaeger    http://localhost:16686        │"
echo "│  MinIO     http://localhost:9001         │"
echo "└─────────────────────────────────────────┘"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Wait for all background jobs
wait
