import http from 'k6/http';
import { check, sleep } from 'k6';
import { GATEWAY_URL, PROVIDER_TOKEN, getTestUserID } from './common.js';

export const options = {
  scenarios: {
    notification_sends: {
      executor: 'constant-arrival-rate',
      rate: 50,
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

export default function () {
  const userId = getTestUserID(__VU);

  const payload = JSON.stringify({
    userId: userId,
    category: 'SERVICE_PROVIDER',
    title: `Load Test Notification ${Date.now()}`,
    body: 'This is a load test notification to verify throughput and latency',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PROVIDER_TOKEN}`,
    },
    tags: { endpoint: 'send_notification' },
  };

  const res = http.post(`${GATEWAY_URL}/api/v1/notifications`, payload, params);

  check(res, {
    'notification sent successfully': (r) => r.status === 201 || r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.1);
}
