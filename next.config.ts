import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Don't bundle these packages — load at runtime (needed for Turso on Vercel)
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
};

export default nextConfig;