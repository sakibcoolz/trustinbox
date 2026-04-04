import http from 'k6/http';
import { check, sleep } from 'k6';
import { GATEWAY_URL, CUSTOMER_TOKEN, PROVIDER_TOKEN } from './common.js';

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

const queries = [
  { weight: 40, token: CUSTOMER_TOKEN, query: '{ myNotifications(limit: 10, offset: 0) { nodes { id title } totalCount } }' },
  { weight: 20, token: CUSTOMER_TOKEN, query: '{ myCallbackRequests(limit: 10, offset: 0) { nodes { id status } totalCount } }' },
  { weight: 15, token: PROVIDER_TOKEN, query: '{ notifications(limit: 10, offset: 0) { nodes { id title } totalCount } }' },
  { weight: 10, token: CUSTOMER_TOKEN, query: '{ myDashboardSummary { unreadNotifications pendingCallbacks } }' },
  { weight: 10, token: CUSTOMER_TOKEN, query: '{ myServiceProviders { id name } }' },
  { weight: 5,  token: PROVIDER_TOKEN, query: '{ analytics { totalNotifications totalCallbacks } }' },
];

function pickQuery() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const q of queries) {
    cumulative += q.weight;
    if (rand < cumulative) return q;
  }
  return queries[0];
}

export default function () {
  const selected = pickQuery();

  const payload = JSON.stringify({ query: selected.query });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${selected.token}`,
    },
  };

  const res = http.post(`${GATEWAY_URL}/graphql`, payload, params);

  check(res, {
    'status 200': (r) => r.status === 200,
    'has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
  });
}
