import http from 'k6/http';
import { check, sleep } from 'k6';
import { GATEWAY_URL, CUSTOMER_TOKEN } from './common.js';

export const options = {
  scenarios: {
    sse_connections: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration{type:sse}': ['p(95)<1000'],
  },
};

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      Accept: 'text/event-stream',
    },
    timeout: '310s',
    tags: { type: 'sse' },
  };

  const res = http.get(`${GATEWAY_URL}/events/notifications`, params);

  check(res, {
    'SSE connection established': (r) => r.status === 200,
    'Content-Type is event-stream': (r) =>
      r.headers['Content-Type'] &&
      r.headers['Content-Type'].includes('text/event-stream'),
  });

  sleep(1);
}
