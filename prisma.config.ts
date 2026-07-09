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
 * Find database URL from environment.
 * Supports both postgres:// and file: (SQLite/libsql) URLs.
 */
function findDatabaseUrl(): string {
  // Try known names first
  for (const name of ["DATABASE_URL", "PRISMA_DATABASE_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL", "DIRECT_URL"]) {
    const val = process.env[name];
    if (val) {
      console.log(`[prisma.config] Using ${name}`);
      return val;
    }
  }

  // Fallback: scan all env vars
  for (const [key, val] of Object.entries(process.env)) {
    if (val && typeof val === "string" && (val.startsWith("postgres://") || val.startsWith("postgresql://") || val.startsWith("file:"))) {
      console.log(`[prisma.config] Found URL in env var: ${key}`);
      return val;
    }
  }

  // Vercel encrypted env vars (mohd_hms_DATABASE_URL etc.) don't match the
  // patterns above.  Fall back to a dummy SQLite URL so that `prisma generate`
  // can still succeed — the actual DB is accessed at runtime via the Supabase
  // REST adapter, not through Prisma's generated client.
  console.warn(
    "[prisma.config] WARNING: No standard DATABASE_URL found. " +
    "Using a placeholder so prisma generate can proceed. " +
    "Runtime DB access uses the Supabase REST adapter."
  );
  return "file:./placeholder.db";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: findDatabaseUrl(),
  },
});