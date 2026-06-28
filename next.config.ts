import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Don't bundle these packages — load from node_modules at runtime
  // This prevents Turbopack from replacing process.env references inside them
  serverExternalPackages: [
    'pg',
    '@prisma/adapter-pg',
    '@prisma/client',
  ],
};

export default nextConfig;