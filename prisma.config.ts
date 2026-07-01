import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Only load .env if it exists (Vercel sets env vars via dashboard, not .env file)
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  config({ path: envPath, override: false });
}

import { defineConfig } from "prisma/config";

/**
 * Find PostgreSQL URL from any of these sources (priority order):
 *   1. DATABASE_URL
 *   2. PRISMA_DATABASE_URL (Vercel Postgres)
 *   3. POSTGRES_URL (Vercel Postgres / Neon)
 *   4. Any env var whose value starts with postgres:// or postgresql://
 */
function findDatabaseUrl(): string {
  // Try known names first
  for (const name of ["DATABASE_URL", "PRISMA_DATABASE_URL", "POSTGRES_URL"]) {
    const val = process.env[name];
    if (val && (val.startsWith("postgres://") || val.startsWith("postgresql://"))) {
      console.log(`[prisma.config] Using ${name}`);
      return val;
    }
  }

  // Fallback: scan all env vars for a postgres:// value
  for (const [key, val] of Object.entries(process.env)) {
    if (
      val &&
      typeof val === "string" &&
      (val.startsWith("postgres://") || val.startsWith("postgresql://"))
    ) {
      console.log(`[prisma.config] Found PostgreSQL URL in env var: ${key}`);
      return val;
    }
  }

  // No PostgreSQL URL found — use a dummy URL so `prisma generate` still succeeds.
  // Runtime code in src/lib/prisma.ts will handle the missing-DB case gracefully.
  console.warn(
    "[prisma.config] No PostgreSQL URL found — using placeholder. " +
      "Database features will be unavailable until a real postgres:// URL is provided."
  );
  return "postgresql://localhost:5432/__placeholder_no_db__";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: findDatabaseUrl(),
  },
});