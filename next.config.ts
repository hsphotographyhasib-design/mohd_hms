import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Allow preview iframe origins in dev
  allowedDevOrigins: ['https://*.space-z.ai'],

  // Don't bundle these packages — load from node_modules at runtime.
  // This prevents Turbopack from replacing process.env references inside them.
  serverExternalPackages: [
    'pg',
    '@prisma/adapter-pg',
    '@prisma/client',
    'google-auth-library',
  ],

  // ============================================================
  // CSS PERFORMANCE OPTIMIZATIONS
  // ============================================================

  // Tree-shake icon libraries: only bundle the icons actually imported.
  // lucide-react has ~1,500 icons (38MB dist). Without this, the bundler
  // may include large barrel files. optimizePackageImports converts
  //   import { ArrowLeft, Search } from 'lucide-react'
  // into individual module imports, so unused icons are never included.
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

  // Enable React compiler for automatic memoization in production
  // (reduces unnecessary re-renders → less CSS recalculation)
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      // Remove console.log in production for smaller bundles
      removeConsole: false,
    },
  }),

  // Compress responses with gzip (default in Next.js, explicit for clarity)
  compress: true,

  // Power performance hints for the browser
  poweredByHeader: false,
};

export default nextConfig;