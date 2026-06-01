import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Server-side target for the API proxy rewrite.
// In Docker: api:4000 (internal service name).
// In local dev (no Docker): localhost:4000.
const internalApiBase = process.env.INTERNAL_API_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@ai-job/shared', '@ai-job/ui'],
  // Allow Cloudflare quick-tunnel hostnames — prevents chrome-error://chromewebdata/ on first load
  allowedDevHosts: ['localhost', '.trycloudflare.com'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'media.licdn.com' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'minio' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Cloudflare to serve in frame (needed for trycloudflare interstitial)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  // Proxy /api/v1/* to the NestJS API server-side so the browser never
  // needs to reach localhost:4000 directly — fixes mixed-content errors
  // when the app is served over HTTPS (e.g. Cloudflare tunnel).
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiBase}/api/v1/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_GOOGLE_ENABLED: process.env.GOOGLE_CLIENT_ID ? 'true' : 'false',
  },
};

// Sentry only wraps when DSN is set — no-op in local dev without DSN
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
    })
  : nextConfig;
