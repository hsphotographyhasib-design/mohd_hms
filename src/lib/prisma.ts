/**
 * Prisma 7 singleton — PostgreSQL via @prisma/adapter-pg.
 *
 * Uses lazy initialization: the database connection is only established on
 * the first actual query, NOT at module-import time.  This allows the
 * dev server to start even when no PostgreSQL URL is available locally
 * (production on Vercel always has one).
 *
 * Connection string resolution order:
 *   1. DATABASE_URL (standard)
 *   2. POSTGRES_URL (Vercel Postgres / Neon)
 *   3. PRISMA_DATABASE_URL (Vercel Postgres)
 *   4. Any env var whose value starts with postgres:// or postgresql://
 */

import { PrismaClient } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// 1. Find PostgreSQL connection string from env vars
// ---------------------------------------------------------------------------

/** Known env var names to check (in priority order) */
const DB_URL_CANDIDATES = [
  "DATABASE_URL",
  "PRISMA_DATABASE_URL",
  "POSTGRES_URL",
];

function findPostgresUrl(): { url: string; source: string } {
  // --- Try known env var names first ---
  for (const name of DB_URL_CANDIDATES) {
    const val = process.env[name];
    if (val && (val.startsWith("postgres://") || val.startsWith("postgresql://"))) {
      console.log(`[Prisma] Found PostgreSQL URL in env: ${name}`);
      return { url: val, source: name };
    }
  }

  // --- Fallback: scan ALL env vars for a postgres:// value ---
  // This handles cases like Vercel prefixing vars (e.g. mohd_hms_DATABASE_URL)
  for (const [key, val] of Object.entries(process.env)) {
    if (
      val &&
      typeof val === "string" &&
      (val.startsWith("postgres://") || val.startsWith("postgresql://")) &&
      !key.includes("SECRET") &&
      !key.includes("KEY") &&
      !key.includes("PASSWORD")
    ) {
      console.log(`[Prisma] Found PostgreSQL URL in env (fallback scan): ${key}`);
      return { url: val, source: key };
    }
  }

  // --- In local dev, try reading .env file directly ---
  if (process.env.NODE_ENV !== "production") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { readFileSync } = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { resolve } = require("path");
      const envPath = resolve(process.cwd(), ".env");
      const envContent = readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.includes("=")) continue;
        const eqIdx = trimmed.indexOf("=");
        const name = trimmed.slice(0, eqIdx).trim();
        const value = trimmed
          .slice(eqIdx + 1)
          .replace(/^["']|["']$/g, "")
          .trim();
        if (
          value &&
          (value.startsWith("postgres://") || value.startsWith("postgresql://"))
        ) {
          console.log(`[Prisma] Found PostgreSQL URL in .env: ${name}`);
          return { url: value, source: name };
        }
      }
    } catch {
      // .env not found — acceptable in dev
    }
  }

  return { url: "", source: "" };
}

// ---------------------------------------------------------------------------
// 2. Lazy PrismaClient singleton
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _prisma: PrismaClient | undefined = undefined;
let _initError: string | undefined = undefined;

function createPrismaClient(): PrismaClient {
  const { url } = findPostgresUrl();

  if (!url) {
    const msg =
      "[Prisma] No PostgreSQL connection string found. " +
      "Database features are unavailable. On Vercel, set DATABASE_URL, " +
      "POSTGRES_URL, or PRISMA_DATABASE_URL (value must start with postgres://).";
    console.warn(msg);
    _initError = msg;
    throw new Error(msg);
  }

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

  const adapter = new PrismaPg(url, {
    max: isServerless ? 3 : 10,
    idleTimeout: isServerless ? 10 : 20,
    connectTimeout: isServerless ? 10 : 15,
  });

  const client =
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
    globalForPrisma.prisma = client;

    // Log slow queries in dev (> 500ms)
    try {
      // @ts-expect-error – Prisma 7 event listener
      client.on("query", (e: { duration: number; query: string }) => {
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

  _prisma = client;
  return client;
}

/**
 * The exported Prisma client singleton.
 *
 * In production (Vercel) a PostgreSQL URL is always present, so the client
 * is created on first access and cached for the lifetime of the process.
 *
 * In local development without a PostgreSQL URL, accessing any model
 * property (e.g. `db.user.findFirst(...)`) will throw a clear warning
 * — but importing this module will NOT crash the dev server.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    // Allow inspection of the proxy itself
    if (prop === "__isPrismaProxy") return true;
    if (prop === Symbol.toStringTag) return "PrismaClient";

    // Return the cached client (or create it on first access)
    const client = _prisma ?? createPrismaClient();
    const value = Reflect.get(client, prop, receiver);

    // Bind methods to the real client so `this` is correct
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },

  // Make typeof/instanceof checks pass through
  getOwnPropertyDescriptor(_target, prop) {
    const client = _prisma ?? (undefined as unknown as PrismaClient);
    if (client) {
      return Reflect.getOwnPropertyDescriptor(client, prop);
    }
    return undefined;
  },

  ownKeys() {
    const client = _prisma ?? (undefined as unknown as PrismaClient);
    if (client) {
      return Reflect.ownKeys(client);
    }
    return [];
  },

  getPrototypeOf() {
    return PrismaClient.prototype;
  },
});

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

/**
 * Returns true when a real PostgreSQL connection is available.
 * Useful for feature-flagging database-dependent UI.
 */
export function isDatabaseAvailable(): boolean {
  return !!_prisma && !_initError;
}