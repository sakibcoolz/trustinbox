#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load env
set -a
source "$ROOT/.env"
set +a

echo "=== TrustInbox Local Dev Startup ==="
echo "Infrastructure: postgres:5432, redis:6379, minio:9000"
echo ""

# Kill any stale processes on our ports before starting
PORTS="50051 50052 50053 50054 50055 50056 50057 50058 4000"
for port in $PORTS; do
  fuser -k "$port/tcp" 2>/dev/null || true
done
sleep 1

# Trap to kill all background processes on exit
trap 'echo "Shutting down..."; kill $(jobs -p) 2>/dev/null; wait' EXIT INT TERM

# Start Go services with individual ports
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

# Start GraphQL gateway
HTTP_PORT=4000 SERVICE_NAME=graphql-gateway \
  go run "$ROOT/gateway/graphql-bff/cmd/server" &
echo "[graphql-gateway]      → :4000"

echo ""
echo "All services starting. Press Ctrl+C to stop all."
echo ""

# Wait for all background jobs
wait
