import http from 'k6/http';
import { check, sleep } from 'k6';
import { GATEWAY_URL, CUSTOMER_TOKEN } from './common.js';

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

export default function () {
  // 70% approve, 30% reject
  const isApprove = Math.random() < 0.7;

  const mutation = isApprove
    ? `mutation { approveCallbackRequest(id: "load-test-cb-${__VU}", input: { scheduledAt: "2025-06-15T10:00:00Z" }) { id status } }`
    : `mutation { rejectCallbackRequest(id: "load-test-cb-${__VU}", input: { reason: "Load test rejection" }) { id status } }`;

  const payload = JSON.stringify({ query: mutation });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CUSTOMER_TOKEN}`,
    },
    tags: { endpoint: 'callback_approve' },
  };

  const res = http.post(`${GATEWAY_URL}/graphql`, payload, params);

  check(res, {
    'mutation successful': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(0.1);
}
