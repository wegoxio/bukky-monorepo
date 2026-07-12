import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.us-east-1.amazonaws.com',
        pathname: '/bukky-public-assets-prod/**',
      },
      {
        protocol: 'https',
        hostname: 'bukky-public-assets-prod.s3.us-east-1.amazonaws.com',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

const isSentryConfigEnabled =
  process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true' || Boolean(process.env.SENTRY_AUTH_TOKEN);

export default async function getNextConfig() {
  if (!isSentryConfigEnabled) {
    return nextConfig;
  }

  const { withSentryConfig } = await import('@sentry/nextjs');

  return withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_FRONTEND_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    tunnelRoute: '/monitoring',
    widenClientFileUpload: true,
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
    },
  });
}
