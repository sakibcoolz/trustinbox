# TrustInbox Load Tests

k6 load test suite for verifying system performance under concurrent load.

## Prerequisites

1. **Install k6**:
   ```bash
   # macOS
   brew install k6

   # Linux (Debian/Ubuntu)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
     --keyserver hkp://keyserver.ubuntu.com:80 \
     --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
     | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6
   ```

2. **Start full stack**:
   ```bash
   ./scripts/dev.sh
   ```

3. **Set JWT tokens** (optional — uses dev defaults):
   ```bash
   export PROVIDER_TOKEN="your-provider-jwt"
   export CUSTOMER_TOKEN="your-customer-jwt"
   ```

## Running Tests

```bash
# Run all scenarios
make test-load

# Run individual scenarios
k6 run tests/load/sse-connections.js
k6 run tests/load/notification-send.js
k6 run tests/load/callback-mutations.js
k6 run tests/load/graphql-throughput.js
k6 run tests/load/policy-evaluation.js
k6 run tests/load/campaign-fanout.js

# Run all scenarios combined
k6 run tests/load/all-scenarios.js
```

## Performance Targets

| Scenario | P50 | P95 | P99 | Error Rate |
|----------|-----|-----|-----|------------|
| SSE Connections (100) | — | — | — | < 1% drops |
| Notification Send (50/s) | < 100ms | < 200ms | < 500ms | < 1% |
| Callback Mutations (20/s) | — | < 150ms | — | < 1% |
| GraphQL Throughput (500/s) | < 50ms | < 100ms | < 300ms | < 5% |
| Policy Evaluation (100) | — | < 50ms | — | < 1% |
| Campaign Fan-out (500) | — | — | — | < 60s total |

## Monitoring During Tests

- **Grafana**: http://localhost:3100
- **Jaeger**: http://localhost:16686
- **Prometheus**: http://localhost:9091
