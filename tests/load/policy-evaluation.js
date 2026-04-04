import http from 'k6/http';
import { check, sleep } from 'k6';
import { GATEWAY_URL, PROVIDER_TOKEN, getTestUserID } from './common.js';

export const options = {
  scenarios: {
    policy_evaluation: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 120,
      maxVUs: 200,
    },
  },
  thresholds: {
    'http_req_duration{endpoint:policy_eval}': ['p(95)<50'],
    'http_req_failed{endpoint:policy_eval}': ['rate<0.01'],
  },
};

export default function () {
  // Each notification send triggers a full 8-step policy evaluation
  const userId = getTestUserID(__VU);

  const payload = JSON.stringify({
    userId: userId,
    category: __VU % 3 === 0 ? 'ADVERTISEMENT' : 'SERVICE_PROVIDER',
    title: `Policy Load Test ${Date.now()}`,
    body: 'Testing policy evaluation under load',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PROVIDER_TOKEN}`,
    },
    tags: { endpoint: 'policy_eval' },
  };

  const res = http.post(`${GATEWAY_URL}/api/v1/notifications`, payload, params);

  check(res, {
    'policy evaluated (200 or 201 or 403)': (r) =>
      r.status === 200 || r.status === 201 || r.status === 403,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.05);
}
