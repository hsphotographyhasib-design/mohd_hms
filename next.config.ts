import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Allow preview iframe origins in dev
  allowedDevOrigins: [
    'https://*.space-z.ai',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://21.0.9.89:3000',
    'http://0.0.0.0:3000',
  ],

  // Don't bundle these packages — load from node_modules at runtime.
  // This prevents Turbopack from replacing process.env references inside them.
  serverExternalPackages: [
    'pg',
    '@prisma/adapter-pg',
    '@prisma/adapter-libsql',
    '@prisma/client',
    'google-auth-library',
  ],

  // ============================================================
  // SECURITY HEADERS (moved from middleware.ts to fix Turbopack crash)
  // ============================================================
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf|eot)$).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },

  // ============================================================
  // CSS PERFORMANCE OPTIMIZATIONS
  // ============================================================

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-icons',
    ],
  },

  // ============================================================
  // PRODUCTION-ONLY SETTINGS
  // ============================================================

  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: false,
    },
  }),

  compress: true,
  poweredByHeader: false,
};

export default nextConfig;