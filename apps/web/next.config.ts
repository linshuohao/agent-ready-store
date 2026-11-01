import type { NextConfig } from 'next';
const config: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  // Restoring the pre-refactor Turbopack build cache can stall compilation.
  experimental: { turbopackFileSystemCacheForBuild: false },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3002'}/api/v1/:path*`,
      },
    ];
  },
};
export default config;
