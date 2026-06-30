/**
 * Prisma 7 singleton — auto-detects SQLite vs PostgreSQL.
 *
 * Runtime behaviour:
 * - SQLite (file:): uses @prisma/adapter-libsql (local dev).
 * - PostgreSQL (postgres:// / postgresql://): uses @prisma/adapter-pg.
 *
 * Vercel / serverless notes:
 * - Never reads .env from the filesystem in production.
 * - Uses a lightweight connection pool suitable for serverless.
 * - Lazy-imports the PG adapter so the SQLite bundle stays small.
 */

import { PrismaClient } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// 1. Detect database type from DATABASE_URL
// ---------------------------------------------------------------------------

type DbKind = "sqlite" | "postgresql";

function detectDatabaseConfig(): { url: string; kind: DbKind } {
  const url = process.env.DATABASE_URL ?? "";

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return { url, kind: "postgresql" };
  }

  if (url.startsWith("file:")) {
    return { url, kind: "sqlite" };
  }

  // In production (Vercel) there MUST be a valid DATABASE_URL.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Prisma] DATABASE_URL is missing or invalid in production. " +
      'It must start with "postgres://" or "postgresql://". ' +
      "Please add a PostgreSQL connection string to your Vercel environment variables."
    );
  }

  // In development, try reading .env directly (works around shell issues).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resolve } = require("path");
    const envPath = resolve(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("DATABASE_URL=")) continue;
      const value = trimmed
        .replace(/^DATABASE_URL=/, "")
        .replace(/^["']|["']$/g, "")
        .trim();

      if (value.startsWith("postgres://") || value.startsWith("postgresql://")) {
        return { url: value, kind: "postgresql" };
      }
      if (value.startsWith("file:")) {
        return { url: value, kind: "sqlite" };
      }
    }
  } catch {
    // .env not found — acceptable in dev
  }

  console.warn(
    "[Prisma] WARNING: Cannot determine database type from DATABASE_URL:",
    url.substring(0, 30)
  );
  return { url, kind: "sqlite" };
}

const { url: connectionString, kind: dbKind } = detectDatabaseConfig();

// ---------------------------------------------------------------------------
// 2. Build adapter based on database type
// ---------------------------------------------------------------------------

function buildAdapter() {
  if (dbKind === "sqlite") {
    // Dynamic require so the PG adapter is never bundled when using SQLite
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql") as {
      PrismaLibSql: typeof import("@prisma/adapter-libsql").PrismaLibSql;
    };
    console.log("[Prisma] Using SQLite adapter:", connectionString.replace(/^file:/, ""));
    return new PrismaLibSql({ url: connectionString });
  }

  // PostgreSQL — use a pool tuned for serverless / Vercel
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg") as {
    PrismaPg: typeof import("@prisma/adapter-pg").PrismaPg;
  };
  console.log("[Prisma] Using PostgreSQL adapter");
  return new PrismaPg(connectionString, {
    max: 5,           // Vercel serverless has limited concurrency per instance
    idleTimeout: 10,  // Shorter idle timeout to free connections faster
    connectTimeout: 10,
  });
}

// ---------------------------------------------------------------------------
// 3. PrismaClient singleton (survives HMR in development)
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = buildAdapter();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "warn" },
            { emit: "stdout", level: "error" },
          ]
        : [{ emit: "stdout", level: "warn" }, { emit: "stdout", level: "error" }],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;

  // Log slow queries in dev (> 500ms)
  try {
    // @ts-expect-error – Prisma 7 event listener
    prisma.on("query", (e: { duration: number; query: string }) => {
      if (e.duration > 500) {
        console.warn(
          `[Prisma Slow Query] ${e.duration}ms\n${e.query.slice(0, 200)}`
        );
      }
    });
  } catch {
    // Event listener not available in this Prisma version
  }
}

// ---------------------------------------------------------------------------
// 4. Utility: classify a Prisma error for friendly messages
// ---------------------------------------------------------------------------

export function isPrismaTimeout(error: unknown): boolean {
  if (error && typeof error === "object") {
    const msg = (error as Error).message ?? "";
    return (
      msg.includes("timed out") ||
      msg.includes("timeout") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("Connection terminated") ||
      msg.includes("connect timeout")
    );
  }
  return false;
}

export function isPrismaTransient(error: unknown): boolean {
  if (error && typeof error === "object") {
    const msg = (error as Error).message ?? "";
    const code = (error as { code?: string }).code ?? "";
    return (
      isPrismaTimeout(error) ||
      code === "P2024" || // Prisma timeout error code
      code === "P1001" || // Connection error
      code === "P1008" || // Timeout error
      msg.includes("Connection refused") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ECONNRESET") ||
      msg.includes("Too many connections") ||
      msg.includes("Connection pool exhausted")
    );
  }
  return false;
}