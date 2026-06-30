import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * Prisma 7 singleton — auto-detects SQLite vs PostgreSQL.
 *
 * - SQLite (file:): uses @prisma/adapter-libsql (required by Prisma 7 client engine).
 * - PostgreSQL (postgres://): uses @prisma/adapter-pg with connection pool.
 *
 * Also supports:
 * 1. Global singleton to survive HMR in development.
 * 2. Slow-query logging in dev mode.
 * 3. Graceful error classification for callers.
 */

// ---------------------------------------------------------------------------
// 1. Detect database type from DATABASE_URL
// ---------------------------------------------------------------------------

type DbKind = "sqlite" | "postgresql";

function detectDatabaseConfig(): { url: string; kind: DbKind } {
  const shellUrl = process.env.DATABASE_URL ?? "";

  // Fast path: shell env already has a valid URL
  if (shellUrl.startsWith("postgres://") || shellUrl.startsWith("postgresql://")) {
    return { url: shellUrl, kind: "postgresql" };
  }
  if (shellUrl.startsWith("file:")) {
    return { url: shellUrl, kind: "sqlite" };
  }

  // Read .env file directly (avoids shell pollution)
  try {
    const envPath = resolve(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
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
    }
  } catch {
    // .env not found
  }

  // Fallback
  console.warn(
    "[Prisma] WARNING: Cannot determine database type from DATABASE_URL:",
    shellUrl.substring(0, 30)
  );
  return { url: shellUrl, kind: "sqlite" };
}

const { url: connectionString, kind: dbKind } = detectDatabaseConfig();

// ---------------------------------------------------------------------------
// 2. Build adapter based on database type
// ---------------------------------------------------------------------------

function buildAdapter() {
  if (dbKind === "sqlite") {
    // Extract file path from "file:/path/to/db.db"
    const filePath = connectionString.replace(/^file:/, "");
    console.log("[Prisma] Using SQLite adapter:", filePath);
    return new PrismaLibSql({ url: connectionString });
  }

  // PostgreSQL
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  console.log("[Prisma] Using PostgreSQL adapter");
  return new PrismaPg(connectionString, {
    max: 10,
    idleTimeout: 20,
    connectTimeout: 10,
  });
}

// ---------------------------------------------------------------------------
// 3. PrismaClient singleton (survives HMR)
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