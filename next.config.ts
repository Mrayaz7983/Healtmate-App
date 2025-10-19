import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Remove turbopack to avoid compatibility issues in Replit
  // Configure for Replit environment - allow iframe embedding and cross-origin requests
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          }
        ]
      }
    ]
  },
  // Allow dev origins from Replit proxy
  allowedDevOrigins: [
    '*.replit.dev', 
    '*.spock.replit.dev',
    '*.riker.replit.dev',
    '*.picard.replit.dev',
    '*.janeway.replit.dev',
    'a3208534-89e5-4f06-9eb7-60199546c3b9-00-24e8bgfkf1k4a.riker.replit.dev',
    '56f36d0f-5408-4e49-a118-1919cf61ddfa-00-22umsk2ovreqn.picard.replit.dev',
    '60c893ce-1b9f-4543-8252-75eea7f3db5c-00-22whnudetacbl.janeway.replit.dev',
    '127.0.0.1',
    'localhost'
  ],
  // Enable experimental features for React 19 compatibility
  experimental: {
    // Disable React Strict Mode in dev if needed for compatibility
  }
};

export default nextConfig;
