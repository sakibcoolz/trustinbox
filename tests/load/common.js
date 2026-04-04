export const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000';
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
        Authorization: `Bearer ${token}`,
      },
    },
  };
}

export function restRequest(method, token, path, body = null) {
  const opts = {
    method,
    url: `${GATEWAY_URL}${path}`,
    params: {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  return opts;
}

// Generate a pool of test user IDs for load distribution
export function getTestUserID(vuID) {
  return `load-test-user-${String(vuID).padStart(4, '0')}`;
}

export function getTestSPID(vuID) {
  return `load-test-sp-${String(vuID).padStart(4, '0')}`;
}
