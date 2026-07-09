/**
 * Prisma 7 singleton — SQLite via libsql adapter.
 *
 * Uses @prisma/adapter-libsql for local SQLite file access.
 * Reads DATABASE_URL from .env (format: file:/path/to/db.sqlite).
 *
 * When USE_SUPABASE=true, exports a no-op placeholder so that
 * importing this module never triggers a database connection.
 */

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

  return { url: "", source: "" };
}

// ---------------------------------------------------------------------------
// 2. Lazy PrismaClient singleton (only created when actually used)
// ---------------------------------------------------------------------------

let _cachedClient: any = undefined;

function _createClient(): any {
  // Dynamic imports to avoid loading SQLite adapter at module level
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("../../../generated/prisma/client");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSql } = require("@prisma/adapter-libsql");

  const { url: dbUrl, source: dbSource } = findDatabaseUrl();

  if (!dbUrl) {
    console.error("[Prisma] FATAL: No DATABASE_URL set.");
  }

  const adapter = new PrismaLibSql({ url: dbUrl });
  console.log(`[Prisma] Init using ${dbSource || "none"} [sqlite/libsql]`);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? [{ emit: "event", level: "query" }, { emit: "stdout", level: "warn" }, { emit: "stdout", level: "error" }]
      : [{ emit: "stdout", level: "warn" }, { emit: "stdout", level: "error" }],
  });

  return client;
}

/**
 * Returns the Prisma client, creating it lazily on first call.
 * This function is the ONLY way to get the client — it is never
 * instantiated at module load time.
 */
export function prisma(): any {
  if (_cachedClient) return _cachedClient;

  const globalForPrisma = globalThis as unknown as { prisma: any };
  if (globalForPrisma.prisma) {
    _cachedClient = globalForPrisma.prisma;
    return _cachedClient;
  }

  _cachedClient = _createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _cachedClient;
  }
  return _cachedClient;
}

// ---------------------------------------------------------------------------
// 3. Utility: classify a Prisma error for friendly messages
// ---------------------------------------------------------------------------

export function isPrismaTimeout(error: unknown): boolean {
  if (error && typeof error === "object") {
    const msg = (error as Error).message ?? "";
    return (
      msg.includes("timed out") || msg.includes("timeout") ||
      msg.includes("ETIMEDOUT") || msg.includes("Connection terminated") ||
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
      isPrismaTimeout(error) || code === "P2024" || code === "P1001" || code === "P1008" ||
      msg.includes("Connection refused") || msg.includes("ECONNREFUSED") ||
      msg.includes("ECONNRESET") || msg.includes("Too many connections") ||
      msg.includes("Connection pool exhausted") || msg.includes("database is locked") ||
      msg.includes("SQLITE_BUSY")
    );
  }
  return false;
}