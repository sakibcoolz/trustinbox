/** @type {import('next').NextConfig} */
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // fallback rewrites run after ALL routes (including dynamic catch-all)
      // are checked.  This ensures /api/gateway/[...path] matches first.
      fallback: [
        {
          source: '/api/:path*',
          destination: `${GATEWAY_URL}/api/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
