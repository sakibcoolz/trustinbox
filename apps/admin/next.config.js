/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Required in Next.js 14 to enable the instrumentation.ts hook for OTel.
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
