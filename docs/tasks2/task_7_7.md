# Task 7.7 — Load Testing

> **Phase**: 7 — Testing & Quality
> **Goal**: Verify the system handles concurrent load — SSE connections, notification sends, callback mutations, and sustained GraphQL throughput — measuring P50/P95/P99 latencies, error rates, and connection stability.
> **Type**: Load test infrastructure setup + test scenario creation.
> **Tools**: k6 (preferred) or Vegeta for HTTP load testing.

---

## Objective

Create a load testing suite (`tests/load/`) that exercises the platform under realistic concurrent load, measuring performance baselines for every critical path — notification delivery, callback approval, GraphQL query throughput, SSE connection stability, and policy evaluation under heavy traffic.

---

## Current State

### Infrastructure

- `tests/` — EMPTY, no load tests exist
- `make up-infra` — starts Postgres, Redis, MinIO, Jaeger, Prometheus, Grafana
- Single-instance deployment for all 13 services (development mode)
- Gateway on port 4000 serves both REST and GraphQL

### Performance-Critical Paths

| Path | Touches | Expected Baseline |
|------|---------|-------------------|
| Send notification | Gateway → notification-service → policy-service → Redis → worker-service | < 200ms P95 |
| GraphQL query (myNotifications) | Gateway → notification-service → PostgreSQL | < 100ms P95 |
| Callback approve mutation | Gateway → communication-service → PostgreSQL → Redis event | < 150ms P95 |
| Policy evaluation | policy-service → PostgreSQL (8 checks) | < 50ms P95 |
| SSE connection | Gateway → long-lived HTTP stream | Stable for 5 min |
| Campaign fan-out | notification-service → worker-service → N targets | < 500ms per target |

### Monitoring Stack

- **Prometheus** (`:9091`) — scrapes all services
- **Grafana** (`:3100`) — dashboards for visualization
- **Jaeger** (`:16686`) — distributed traces for latency analysis
- **OTel Collector** (`:4317/4318`) — telemetry aggregation

---

## Requirements

### Sub-task 7.7.1 — Load Test Infrastructure Setup

- [ ] Create directory: `tests/load/`
- [ ] Install k6:
  ```bash
  # macOS
  brew install k6
  # Linux
  sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update && sudo apt-get install k6
  ```
- [ ] Create `tests/load/common.js` — shared utilities:
  ```javascript
  export const GATEWAY_URL = 'http://localhost:4000';
  export const PROVIDER_TOKEN = __ENV.PROVIDER_TOKEN || 'dev-provider-jwt';
  export const CUSTOMER_TOKEN = __ENV.CUSTOMER_TOKEN || 'dev-customer-jwt';

  export function graphqlRequest(token, query, variables = {}) {
    return {
      method: 'POST',
      url: `${GATEWAY_URL}/graphql`,
      body: JSON.stringify({ query, variables }),
      params: {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      },
    };
  }
  ```
- [ ] Create `tests/load/README.md` with instructions for running tests
- [ ] Add Makefile target:
  ```makefile
  test-load:
  	cd tests/load && k6 run all-scenarios.js
  ```

### Sub-task 7.7.2 — SSE Connection Stability Test

- [ ] Create `tests/load/sse-connections.js`:
  - **Scenario**: 100 concurrent SSE connections
  - **Duration**: 5 minutes sustained
  - **Setup**:
    ```javascript
    export const options = {
      scenarios: {
        sse_connections: {
          executor: 'constant-vus',
          vus: 100,
          duration: '5m',
        },
      },
      thresholds: {
        'http_req_failed': ['rate<0.01'],  // <1% failure
        'http_req_duration{type:sse}': ['p(95)<1000'],
      },
    };
    ```
  - Each VU opens an SSE connection to the notification stream endpoint
  - Measure: connection establishment time, keepalive stability, reconnection on drop
  - Track: total connections open, connections dropped, reconnection count
  - **Pass criteria**:
    - All 100 connections established within 10 seconds
    - <1% connection drops over 5 minutes
    - No gateway memory leak (monitor via Prometheus)

### Sub-task 7.7.3 — Notification Send Load Test

- [ ] Create `tests/load/notification-send.js`:
  - **Scenario**: 50 concurrent notification sends
  - **Duration**: 2 minutes sustained
  - **Setup**:
    ```javascript
    export const options = {
      scenarios: {
        notification_sends: {
          executor: 'constant-arrival-rate',
          rate: 50,        // 50 requests per second
          timeUnit: '1s',
          duration: '2m',
          preAllocatedVUs: 60,
          maxVUs: 100,
        },
      },
      thresholds: {
        'http_req_duration{endpoint:send_notification}': ['p(50)<100', 'p(95)<200', 'p(99)<500'],
        'http_req_failed{endpoint:send_notification}': ['rate<0.01'],
      },
    };
    ```
  - Each request: `POST /api/v1/notifications` with valid payload
  - Vary: customer IDs (use pool of 100+ test users)
  - Measure: P50, P95, P99 latencies; error rate; throughput (req/s)
  - Verify: all sent notifications actually delivered (check after test)
  - **Pass criteria**:
    - P50 < 100ms, P95 < 200ms, P99 < 500ms
    - Error rate < 1%
    - All notifications persisted (count in DB matches sends)

### Sub-task 7.7.4 — Callback Mutation Load Test

- [ ] Create `tests/load/callback-mutations.js`:
  - **Scenario**: 20 concurrent approve/reject mutations
  - **Duration**: 2 minutes
  - **Setup**:
    ```javascript
    export const options = {
      scenarios: {
        callback_mutations: {
          executor: 'constant-arrival-rate',
          rate: 20,
          timeUnit: '1s',
          duration: '2m',
          preAllocatedVUs: 25,
          maxVUs: 50,
        },
      },
      thresholds: {
        'http_req_duration{endpoint:callback_approve}': ['p(95)<150'],
        'http_req_failed{endpoint:callback_approve}': ['rate<0.01'],
      },
    };
    ```
  - Mix: 70% approve, 30% reject
  - Each requires existing PENDING callback (pre-seed or create in setup)
  - Measure: mutation latency, event publication delay, status consistency
  - **Pass criteria**:
    - P95 < 150ms for both approve and reject
    - Error rate < 1%
    - No status inconsistencies (double approve, approve after reject)

### Sub-task 7.7.5 — GraphQL Query Throughput Test

- [ ] Create `tests/load/graphql-throughput.js`:
  - **Scenario**: Sustained 500 req/s GraphQL queries
  - **Duration**: 3 minutes
  - **Setup**:
    ```javascript
    export const options = {
      scenarios: {
        graphql_throughput: {
          executor: 'constant-arrival-rate',
          rate: 500,
          timeUnit: '1s',
          duration: '3m',
          preAllocatedVUs: 200,
          maxVUs: 600,
        },
      },
      thresholds: {
        'http_req_duration': ['p(50)<50', 'p(95)<100', 'p(99)<300'],
        'http_req_failed': ['rate<0.05'],
      },
    };
    ```
  - Mix of queries (weighted):
    - 40% `myNotifications` (customer)
    - 20% `myCallbackRequests` (customer)
    - 15% `notifications` (provider)
    - 10% `myDashboardSummary` (customer)
    - 10% `myServiceProviders` (customer)
    - 5% `analytics` (provider)
  - Use pool of JWT tokens for different users/SPs
  - Measure: overall throughput, per-query latencies, error rate by query type
  - **Pass criteria**:
    - P50 < 50ms, P95 < 100ms, P99 < 300ms
    - Error rate < 5% (allow for some contention at 500 req/s on single instance)
    - Gateway does not OOM or crash

### Sub-task 7.7.6 — Policy Evaluation Under Load

- [ ] Create `tests/load/policy-evaluation.js`:
  - **Scenario**: Direct policy evaluation throughput
  - 100 concurrent notification sends (each triggers policy evaluation)
  - Vary: users with different block/DND/preference states to exercise all 8 policy steps
  - Measure: policy evaluation latency (via Jaeger traces or response time)
  - Target: policy evaluation < 50ms P95 even under 100 concurrent evals
  - **Pass criteria**:
    - P95 < 50ms for policy alone
    - No false denials under load (correct decisions maintained)
    - Consistent results: same input always produces same decision

### Sub-task 7.7.7 — Campaign Fan-Out Test

- [ ] Create `tests/load/campaign-fanout.js`:
  - **Scenario**: Launch campaign with 500 targets
  - Measure time from launch to all targets processed
  - Track per-target processing time
  - Verify: all 500 targets get individual notifications
  - Verify: policy denials correctly tracked (pre-set some targets as blocked)
  - **Pass criteria**:
    - Total fan-out time < 60 seconds for 500 targets
    - Per-target processing < 500ms average
    - No targets lost (PENDING count reaches 0)

### Sub-task 7.7.8 — Generate Load Test Report

- [ ] Run all load test scenarios
- [ ] Collect results into report:
  ```markdown
  ## Load Test Results — [date]

  | Scenario | VUs | Duration | P50 | P95 | P99 | Error Rate | Status |
  |----------|-----|----------|-----|-----|-----|------------|--------|
  | SSE Connections | 100 | 5m | - | - | - | - | ✅/❌ |
  | Notification Send | 50/s | 2m | Xms | Xms | Xms | X% | ✅/❌ |
  | Callback Mutations | 20/s | 2m | Xms | Xms | Xms | X% | ✅/❌ |
  | GraphQL Throughput | 500/s | 3m | Xms | Xms | Xms | X% | ✅/❌ |
  | Policy Evaluation | 100 | 2m | Xms | Xms | Xms | X% | ✅/❌ |
  | Campaign Fan-out | 500 targets | - | Xms | Xms | Xms | X% | ✅/❌ |
  ```
- [ ] Capture Grafana dashboard screenshots during peak load
- [ ] Capture Jaeger slowest traces for each scenario
- [ ] Document: bottlenecks identified, recommendations for production scaling

---

## Verification Checklist

- [ ] `tests/load/` directory created with k6 scripts and shared utilities
- [ ] SSE test: 100 concurrent connections stable for 5 minutes, <1% drops
- [ ] Notification send: 50/s sustained, P95 < 200ms, error < 1%
- [ ] Callback mutations: 20/s sustained, P95 < 150ms, error < 1%
- [ ] GraphQL throughput: 500/s sustained, P95 < 100ms, error < 5%
- [ ] Policy evaluation: P95 < 50ms under concurrent load, no false denials
- [ ] Campaign fan-out: 500 targets processed in < 60 seconds
- [ ] Load test report generated with latency tables and Grafana snapshots
- [ ] No gateway OOM or crash during any test scenario
- [ ] All services remain responsive during and after load tests
