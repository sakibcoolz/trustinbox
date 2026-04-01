/** @type {import('next').NextConfig} */
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: `${GATEWAY_URL}/graphql`,
      },
      {
        source: '/api/:path*',
        destination: `${GATEWAY_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
