/**
 * Prisma 7 singleton — PostgreSQL only.
 *
 * The schema uses provider = "postgresql" for both local dev and production.
 * Local dev should use the same remote Postgres or a local Postgres instance.
 *
 * IMPORTANT: This module must NEVER throw at import/load time.
 */

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ---------------------------------------------------------------------------
// 1. Find database URL (never throws)
// ---------------------------------------------------------------------------

export function findDatabaseUrl(): { url: string; source: string } {
  const candidates = [
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_URL",
    "PRISMA_DATABASE_URL",
    "DATABASE_URL",
    "DIRECT_URL",
    "DATABASE_URL_VERCEL",
    "DATABASE_PUBLIC_URL",
  ];

  // Phase 1: Check well-known env vars
  for (const name of candidates) {
    const val = process.env[name];
    if (val && (val.startsWith("postgres://") || val.startsWith("postgresql://"))) {
      console.log(`[Prisma] Found postgres URL in env var: ${name}`);
      return { url: val, source: name };
    }
  }

  // Phase 2: Scan ALL env vars for postgres:// URLs
  for (const [key, val] of Object.entries(process.env)) {
    if (val && typeof val === "string" && (val.startsWith("postgres://") || val.startsWith("postgresql://"))) {
      console.log(`[Prisma] Found postgres URL in env var (scan): ${key}`);
      return { url: val, source: `scan:${key}` };
    }
  }

  // No URL found — log for debugging
  const envKeys = Object.keys(process.env).sort();
  const dbLikeKeys = envKeys.filter(k => {
    const ku = k.toUpperCase();
    return ku.includes("DATABASE") || ku.includes("POSTGRES") || ku.includes("DB_") ||
           ku.includes("PRISMA") || ku.includes("NEON") || ku.includes("CONN");
  });
  console.error(
    `[Prisma] ERROR: No postgres URL found. ` +
    `DB-related env vars: [${dbLikeKeys.join(", ")}]. ` +
    `All env vars: [${envKeys.join(", ")}]`
  );

  return { url: "", source: "" };
}

// ---------------------------------------------------------------------------
// 2. Create adapter and PrismaClient
// ---------------------------------------------------------------------------

const { url: dbUrl, source: dbSource } = findDatabaseUrl();
const isServerless = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

if (!dbUrl) {
  console.error(
    "[Prisma] FATAL: No DATABASE_URL or POSTGRES_URL found. " +
    "Please set a postgres:// connection string in your environment."
  );
}

/**
 * Ensure postgres:// URLs have SSL parameters for Vercel/Neon/cloud providers.
 */
function ensureSsl(url: string): string {
  if (url.includes("sslmode=") || url.includes("ssl=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require`;
}

// Create the PostgreSQL adapter
const effectiveUrl = dbUrl ? ensureSsl(dbUrl) : "";
const adapter = new PrismaPg(effectiveUrl);

console.log(
  `[Prisma] Init using ${dbSource || "none"}${isServerless ? " [serverless]" : " [dev]"}`
);

// ---------------------------------------------------------------------------
// 3. PrismaClient singleton (survives HMR in development)
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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

  try {
    // @ts-expect-error – Prisma 7 event listener
    prisma.on("query", (e: { duration: number; query: string }) => {
      if (e.duration > 500) {
        console.warn(`[Prisma Slow Query] ${e.duration}ms\n${e.query.slice(0, 200)}`);
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
    const code = (error as { code?: string })?.code ?? "";
    return (
      isPrismaTimeout(error) ||
      code === "P2024" ||
      code === "P1001" ||
      code === "P1008" ||
      msg.includes("Connection refused") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ECONNRESET") ||
      msg.includes("Too many connections") ||
      msg.includes("Connection pool exhausted")
    );
  }
  return false;
}