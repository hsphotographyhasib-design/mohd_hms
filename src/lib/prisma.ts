/**
 * Prisma 7 singleton — SQLite via libsql adapter.
 *
 * Uses @prisma/adapter-libsql for local SQLite file access.
 * Reads DATABASE_URL from .env (format: file:/path/to/db.sqlite).
 *
 * IMPORTANT: The client is lazily initialized on first actual use,
 * NOT at module load time. This prevents a SQLite connection attempt
 * when USE_SUPABASE=true (the Supabase REST adapter is used instead).
 */

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ---------------------------------------------------------------------------
// 1. Find database URL
// ---------------------------------------------------------------------------

export function findDatabaseUrl(): { url: string; source: string } {
  const candidates = [
    "DATABASE_URL",
    "PRISMA_DATABASE_URL",
  ];

  for (const name of candidates) {
    const val = process.env[name];
    if (val) {
      return { url: val, source: name };
    }
  }

  console.error(
    "[Prisma] ERROR: No DATABASE_URL found in environment. " +
    "Set DATABASE_URL to a SQLite path, e.g. file:/path/to/db.sqlite"
  );

  return { url: "", source: "" };
}

// ---------------------------------------------------------------------------
// 2. Lazy PrismaClient singleton
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _cachedClient: PrismaClient | undefined;

function _createClient(): PrismaClient {
  const { url: dbUrl, source: dbSource } = findDatabaseUrl();

  if (!dbUrl) {
    console.error("[Prisma] FATAL: No DATABASE_URL set.");
  }

  const adapter = new PrismaLibSql({ url: dbUrl });

  console.log(
    `[Prisma] Init using ${dbSource || "none"} [sqlite/libsql]`
  );

  const client = new PrismaClient({
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
    globalForPrisma.prisma = client;
    try {
      // @ts-expect-error – Prisma 7 event listener
      client.on("query", (e: { duration: number; query: string }) => {
        if (e.duration > 500) {
          console.warn(`[Prisma Slow Query] ${e.duration}ms\n${e.query.slice(0, 200)}`);
        }
      });
    } catch {
      // Event listener not available in this Prisma version
    }
  }

  return client;
}

/**
 * Lazily created Prisma client singleton.
 *
 * The factory function is NOT called at import time — only when
 * `prisma()` is first invoked.  This means importing this module
 * (via `import { prisma } from './prisma'`) never opens a DB
 * connection, which is critical when USE_SUPABASE=true.
 */
export function prisma(): PrismaClient {
  if (_cachedClient) return _cachedClient;
  if (globalForPrisma.prisma) {
    _cachedClient = globalForPrisma.prisma;
    return _cachedClient;
  }
  _cachedClient = _createClient();
  return _cachedClient;
}

// ---------------------------------------------------------------------------
// 3. Utility: classify a Prisma error for friendly messages
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
      msg.includes("Connection pool exhausted") ||
      msg.includes("database is locked") ||
      msg.includes("SQLITE_BUSY")
    );
  }
  return false;
}