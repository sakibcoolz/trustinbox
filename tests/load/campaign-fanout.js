import http from 'k6/http';
import { check, sleep } from 'k6';
import { GATEWAY_URL, PROVIDER_TOKEN, getTestUserID } from './common.js';

export const options = {
  scenarios: {
    campaign_fanout: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
    },
  },
  thresholds: {
    'http_req_duration{endpoint:campaign_launch}': ['p(95)<2000'],
  },
};

export default function () {
  // Generate 500 target user IDs
  const targets = [];
  for (let i = 0; i < 500; i++) {
    targets.push(getTestUserID(i));
  }

  // Step 1: Create campaign
  const createPayload = JSON.stringify({
    name: `Load Test Campaign ${Date.now()}`,
    category: 'SERVICE_PROVIDER',
    title: 'Campaign Fan-out Test',
    body: 'Testing fan-out performance with 500 targets',
    targets: targets,
  });

  const createParams = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PROVIDER_TOKEN}`,
    },
    tags: { endpoint: 'campaign_create' },
  };

  const createRes = http.post(`${GATEWAY_URL}/api/campaigns`, createPayload, createParams);

  check(createRes, {
    'campaign created': (r) => r.status === 200 || r.status === 201,
  });

  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error(`Campaign creation failed: ${createRes.status} ${createRes.body}`);
    return;
  }

  let campaignId;
  try {
    const body = JSON.parse(createRes.body);
    campaignId = body.id || body.data?.id || body.campaignId;
  } catch {
    console.error('Failed to parse campaign creation response');
    return;
  }

  if (!campaignId) {
    console.log('No campaign ID returned, skipping launch');
    return;
  }

  // Step 2: Launch campaign
  const launchPayload = JSON.stringify({ campaignId });
  const launchParams = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PROVIDER_TOKEN}`,
    },
    tags: { endpoint: 'campaign_launch' },
  };

  const launchRes = http.post(
    `${GATEWAY_URL}/api/campaigns/${campaignId}/launch`,
    launchPayload,
    launchParams
  );

  check(launchRes, {
    'campaign launched': (r) => r.status === 200 || r.status === 201,
  });

  // Step 3: Poll for completion (up to 60 seconds)
  const startTime = Date.now();
  const maxWait = 60000;

  while (Date.now() - startTime < maxWait) {
    const statusRes = http.get(
      `${GATEWAY_URL}/api/campaigns/${campaignId}`,
      {
        headers: { Authorization: `Bearer ${PROVIDER_TOKEN}` },
        tags: { endpoint: 'campaign_status' },
      }
    );

    if (statusRes.status === 200) {
      try {
        const status = JSON.parse(statusRes.body);
        if (status.status === 'COMPLETED' || status.processedCount >= 500) {
          console.log(`Campaign fan-out completed in ${Date.now() - startTime}ms`);
          check(statusRes, {
            'all targets processed': () => true,
            'completed within 60s': () => Date.now() - startTime < maxWait,
          });
          return;
        }
      } catch {
        // continue polling
      }
    }
    sleep(2);
  }

  console.error(`Campaign fan-out did not complete within ${maxWait}ms`);
}
