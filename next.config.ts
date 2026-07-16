import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type errors fail the build again — the codebase is type-clean as of the
    // 2026-07 enterprise inspection (was 12,013 errors hidden by `true`).
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,

  // Allow preview iframe origins in dev
  allowedDevOrigins: [
    'https://space-z.ai',
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
    '@libsql/client',
    '@neondatabase/serverless',
    
    'google-auth-library',
    // Firebase Admin SDK — very large, must not be bundled by Turbopack
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/messaging',
    
    // Prisma 7 generated client uses node:path — mark as external
    // so Turbopack doesn't try to bundle Node.js built-ins
    'generated/prisma',

    // IRMS: PDF engine + image processing
    '@react-pdf/renderer',
    'sharp',
  ],

  // ============================================================
  // SECURITY HEADERS (moved from middleware.ts to fix Turbopack crash)
  // ============================================================
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    // In development, allow framing from the preview panel host.
    // In production, restrict to SAMEORIGIN to prevent clickjacking.
    const frameOptions = isDev ? 'ALLOWALL' : 'SAMEORIGIN';
    // CSP frame-ancestors is the modern replacement for X-Frame-Options.
    // In production, only allow same-origin framing.
    const frameAncestors = isDev
      ? "'self' https://space-z.ai https://*.space-z.ai"
      : "'self'";

    return [
      {
        source: '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf|eot)$).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: frameOptions },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: `frame-ancestors ${frameAncestors}` },
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

  // ============================================================
  // API PROXY — Forward unmatched /api/* to Render backend
  // ============================================================
  // In development, API routes run locally via Next.js.
  // In production (Vercel), /api/ requests are FIRST checked against
  // Next.js API route handlers. Only UNMATCHED routes are proxied
  // to the Render Express backend (e.g. /api/complaints, /api/work-orders).
  //
  // Routes with Next.js handlers (e.g. /api/inventory/*, /api/auth/login,
  // /api/service-items/*) are handled directly by Next.js using the
  // Supabase REST adapter or by proxying to the backend explicitly.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (process.env.NODE_ENV === 'production' || backendUrl) {
      const target = backendUrl || 'https://mohd-hms.onrender.com';
      return {
        // afterFiles: proxy only routes NOT handled by Next.js route handlers
        afterFiles: [
          {
            source: '/api/:path*',
            destination: `${target}/api/:path*`,
          },
        ],
      };
    }
    return [];
  },

  compress: true,
  poweredByHeader: false,
};

export default nextConfig;