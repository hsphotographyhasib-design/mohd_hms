/**
 * Prisma 7 singleton — PostgreSQL via @prisma/adapter-pg.
 *
 * Requirements:
 *   - DATABASE_URL must be a valid PostgreSQL connection string
 *     (e.g. postgresql://user:pass@host:5432/dbname?sslmode=require)
 *   - For Vercel: add DATABASE_URL to Vercel Environment Variables
 *   - For local dev: set DATABASE_URL in your .env file
 */

import { PrismaClient } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// 1. Validate DATABASE_URL
// ---------------------------------------------------------------------------

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "";

  // In development, try reading .env directly (works around shell issues)
  if (!url && process.env.NODE_ENV !== "production") {
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
        if (value.length > 0) return value;
      }
    } catch {
      // .env not found — acceptable in dev
    }
  }

  if (!url) {
    throw new Error(
      "[Prisma] DATABASE_URL is not set. " +
        'It must be a PostgreSQL connection string starting with "postgres://" or "postgresql://". ' +
        "Local dev: add it to your .env file. " +
        "Vercel: add it to Vercel Environment Variables."
    );
  }

  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    throw new Error(
      `[Prisma] DATABASE_URL must start with "postgres://" or "postgresql://". Got: ${url.substring(0, 20)}...`
    );
  }

  return url;
}

const connectionString = getDatabaseUrl();

// ---------------------------------------------------------------------------
// 2. Build PostgreSQL adapter
// ---------------------------------------------------------------------------

function buildAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg") as {
    PrismaPg: typeof import("@prisma/adapter-pg").PrismaPg;
  };

  const isServerless =
    process.env.NODE_ENV === "production" ||
    !!process.env.VERCEL;

  console.log(
    `[Prisma] Using PostgreSQL adapter${isServerless ? " (serverless/Vercel)" : " (development)"}`
  );

  return new PrismaPg(connectionString, {
    max: isServerless ? 3 : 10,
    idleTimeout: isServerless ? 10 : 20,
    connectTimeout: isServerless ? 10 : 15,
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