/** @type {import('next').NextConfig} */
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Required in Next.js 14 to enable the instrumentation.ts hook for OTel.
    instrumentationHook: true,
  },
  async rewrites() {
    return [
      // Proxy all REST API calls to the Go gateway.
      // This runs server-side, so "localhost:4000" resolves correctly on the
      // dev machine regardless of what hostname the browser used to open the app.
      //
      // NOTE: /api/notifications/stream is NOT proxied here — it is served by the
      // file-based Route Handler at src/app/api/notifications/stream/route.ts.
      // File-system routes take priority over rewrites in Next.js, so the Route
      // Handler wins automatically and avoids the 30-second proxy timeout.
      {
        source: '/api/:path*',
        destination: `${GATEWAY_URL}/api/:path*`,
      },
      // Proxy GraphQL endpoint
      {
        source: '/graphql',
        destination: `${GATEWAY_URL}/graphql`,
      },
    ];
  },
};

module.exports = nextConfig;
