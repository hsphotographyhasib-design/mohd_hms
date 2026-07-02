/**
 * Prisma 7 singleton — supports both SQLite (local dev) and PostgreSQL (production).
 *
 * IMPORTANT: This module must NEVER throw at import/load time.
 *
 * Auto-detects database type from DATABASE_URL:
 *   - file: → SQLite via @prisma/adapter-libsql
 *   - postgres:// / postgresql:// → PostgreSQL via @prisma/adapter-pg
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

// ---------------------------------------------------------------------------
// 1. Find database URL (never throws)
// ---------------------------------------------------------------------------

export function findDatabaseUrl(): { url: string; source: string; isSQLite: boolean } {
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

  // --- PHASE 1: Check well-known env vars for POSTGRES URLs FIRST ---
  // Postgres URLs are always preferred, especially in production.
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

  for (const name of candidates) {
    const val = process.env[name];
    if (!val) continue;
    if (val.startsWith("postgres://") || val.startsWith("postgresql://")) {
      console.log(`[Prisma] Found postgres URL in env var: ${name}`);
      return { url: val, source: name, isSQLite: false };
    }
  }

  // --- PHASE 2: Scan ALL env vars for POSTGRES URLs ---
  // Scan entire env for any postgres:// URL (handles mohd_hms_ prefix etc.)
  for (const [key, val] of Object.entries(process.env)) {
    if (!val || typeof val !== "string") continue;
    if (val.startsWith("postgres://") || val.startsWith("postgresql://")) {
      console.log(`[Prisma] Found postgres URL in env var (scan): ${key}`);
      return { url: val, source: `scan:${key}`, isSQLite: false };
    }
  }

  // --- PHASE 3: Only in LOCAL DEV, look for file: (SQLite) URLs ---
  // CRITICAL: Never use file: URLs in production — Vercel has no filesystem.
  if (!isProd) {
    // Check well-known env vars
    for (const name of candidates) {
      const val = process.env[name];
      if (!val) continue;
      if (val.startsWith("file:")) {
        console.log(`[Prisma] Using file: URL in dev from env var: ${name}`);
        return { url: val, source: name, isSQLite: true };
      }
    }

    // Scan all env vars for file: URLs
    for (const [key, val] of Object.entries(process.env)) {
      if (!val || typeof val !== "string") continue;
      if (val.startsWith("file:")) {
        console.log(`[Prisma] Using file: URL in dev from env var (scan): ${key}`);
        return { url: val, source: `scan:${key}`, isSQLite: true };
      }
    }

    // Read .env file directly as last resort
    try {
      const envPath = resolve(process.cwd(), ".env");
      const envContent = readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.includes("=")) continue;
        const eqIdx = trimmed.indexOf("=");
        const name = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "").trim();
        if (!value) continue;
        if (value.startsWith("postgres://") || value.startsWith("postgresql://"))
          return { url: value, source: `.env:${name}`, isSQLite: false };
        if (value.startsWith("file:")) return { url: value, source: `.env:${name}`, isSQLite: true };
      }
    } catch {
      // .env not found — acceptable
    }
  }

  // --- NO DATABASE URL FOUND ---
  if (isProd) {
    // In production, this is a fatal misconfiguration.
    // Log ALL env var names so the admin can see what's available.
    const envKeys = Object.keys(process.env).sort();
    const dbLikeKeys = envKeys.filter(k => {
      const ku = k.toUpperCase();
      return ku.includes('DATABASE') || ku.includes('POSTGRES') || ku.includes('DB_') ||
             ku.includes('PRISMA') || ku.includes('NEON') || ku.includes('CONN');
    });
    console.error(
      `[Prisma] FATAL: No postgres URL found in production. ` +
      `DB-related env vars: [${dbLikeKeys.join(', ')}]. ` +
      `All env vars: [${envKeys.join(', ')}]`
    );
  } else {
    console.warn(`[Prisma] No database URL found. Using fallback dev.db`);
  }

  return { url: "", source: "", isSQLite: false };
}

// ---------------------------------------------------------------------------
// 2. Create adapter and PrismaClient
// ---------------------------------------------------------------------------

const { url: dbUrl, source: dbSource, isSQLite } = findDatabaseUrl();
const isServerless = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
const effectiveUrl = dbUrl || "file:./db/dev.db";

console.log(
  `[Prisma] Init${dbUrl ? ` using ${dbSource} (${isSQLite ? "SQLite" : "PostgreSQL"})` : " (no DB URL)"}${isServerless ? " [serverless]" : " [dev]"}`
);

/**
 * Ensure postgres:// URLs have SSL parameters for Vercel/Neon/cloud providers.
 * Most cloud Postgres providers require SSL but the URL might not include it.
 */
function ensureSsl(url: string): string {
  if (!url.startsWith("postgres")) return url;
  // Already has SSL params
  if (url.includes("sslmode=") || url.includes("ssl=")) return url;
  // Append ? or & depending on whether the URL already has query params
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require`;
}

// Create the appropriate adapter
const adapter =
  isSQLite || effectiveUrl.startsWith("file:")
    ? new PrismaLibSql({ url: effectiveUrl })
    : new PrismaPg(ensureSsl(effectiveUrl));

console.log(`[Prisma] Adapter: ${isSQLite || effectiveUrl.startsWith("file:") ? "libsql/SQLite" : "pg/PostgreSQL"}${isServerless ? " (serverless mode)" : ""}`);

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
    const code = (error as { code?: string }).code ?? "";
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