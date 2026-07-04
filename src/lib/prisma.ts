/**
 * Prisma 7 singleton — SQLite via libsql adapter.
 *
 * Uses @prisma/adapter-libsql for local SQLite file access.
 * Reads DATABASE_URL from .env (format: file:/path/to/db.sqlite).
 */

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ---------------------------------------------------------------------------
// 1. Find database URL
// ---------------------------------------------------------------------------

function findDatabaseUrl(): { url: string; source: string } {
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
// 2. Create adapter and PrismaClient
// ---------------------------------------------------------------------------

const { url: dbUrl, source: dbSource } = findDatabaseUrl();

if (!dbUrl) {
  console.error("[Prisma] FATAL: No DATABASE_URL set.");
}

const adapter = new PrismaLibSql({ url: dbUrl });

console.log(
  `[Prisma] Init using ${dbSource || "none"} [sqlite/libsql]`
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
      msg.includes("Connection pool exhausted") ||
      msg.includes("database is locked") ||
      msg.includes("SQLITE_BUSY")
    );
  }
  return false;
}