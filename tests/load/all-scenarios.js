import { group } from 'k6';
import sseTest from './sse-connections.js';
import notifTest from './notification-send.js';
import callbackTest from './callback-mutations.js';
import graphqlTest from './graphql-throughput.js';
import policyTest from './policy-evaluation.js';
import campaignTest from './campaign-fanout.js';

export const options = {
  scenarios: {
    sse_connections: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      exec: 'sseScenario',
      startTime: '0s',
    },
    notification_sends: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 60,
      maxVUs: 100,
      exec: 'notificationScenario',
      startTime: '30s',
    },
    callback_mutations: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 25,
      maxVUs: 50,
      exec: 'callbackScenario',
      startTime: '30s',
    },
    graphql_throughput: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 200,
      maxVUs: 600,
      exec: 'graphqlScenario',
      startTime: '1m',
    },
    policy_evaluation: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 120,
      maxVUs: 200,
      exec: 'policyScenario',
      startTime: '1m',
    },
    campaign_fanout: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      exec: 'campaignScenario',
      startTime: '4m',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<500'],
  },
};

export function sseScenario() {
  group('SSE Connections', () => sseTest());
}

export function notificationScenario() {
  group('Notification Send', () => notifTest());
}

export function callbackScenario() {
  group('Callback Mutations', () => callbackTest());
}

export function graphqlScenario() {
  group('GraphQL Throughput', () => graphqlTest());
}

export function policyScenario() {
  group('Policy Evaluation', () => policyTest());
}

export function campaignScenario() {
  group('Campaign Fan-out', () => campaignTest());
}
