import { prisma, isPrismaTransient } from "./prisma";

/**
 * Re-export the singleton Prisma client for backward compatibility
 * (99 files import { db } from '@/lib/db').
 */
export const db = prisma;

// Re-export types for convenience
export type { PrismaClient } from "../../generated/prisma/client";

/**
 * Retry wrapper for transient database failures.
 *
 * Usage:
 *   const user = await withRetry(() =>
 *     db.user.findFirst({ where: { ... } })
 *   );
 *
 * Only retries on transient / connection errors — NOT on validation or
 * unique-constraint violations (those should surface immediately).
 */
const RETRY_DELAYS = [1000, 2000, 5000, 10000]; // ms
const MAX_RETRIES = RETRY_DELAYS.length;

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; label?: string }
): Promise<T> {
  const max = options?.maxRetries ?? MAX_RETRIES;
  const label = options?.label ?? "db-operation";
  let lastError: unknown;

  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Only retry transient / connection errors
      if (!isPrismaTransient(error) || attempt >= max) {
        throw error;
      }

      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      console.warn(
        `[DB Retry ${attempt + 1}/${max}] ${label} failed, retrying in ${delay}ms…`,
        error instanceof Error ? error.message : error
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Extract Prisma error code from any error object.
 */
function getPrismaCode(error: unknown): string {
  if (error && typeof error === "object") {
    return (error as { code?: string }).code ?? "";
  }
  return "";
}

/**
 * Friendly user-facing error message for database issues.
 * Callers should use this in their catch blocks to avoid leaking
 * raw Prisma internals to the client.
 *
 * IMPORTANT: Always logs the full error server-side for debugging.
 */
export function getDbFriendlyMessage(error: unknown): string {
  // Log the actual error for server-side debugging
  console.error("[DB Error]", error instanceof Error ? error.message : error);

  if (isPrismaTransient(error)) {
    return "We're reconnecting to the database. Please wait a moment and try again.";
  }

  const code = getPrismaCode(error);
  const msg = error instanceof Error ? error.message.toLowerCase() : "";

  // Prisma error codes — exhaustive mapping
  if (code === "P2002") return "A record with this value already exists.";
  if (code === "P2025") return "The requested record was not found.";
  if (code === "P2003") return "Referenced record does not exist.";
  if (code === "P2004") return "A constraint on the database failed.";
  if (code === "P2005") return "The value stored in the database is invalid.";
  if (code === "P2006") return "The provided value for the field is not valid.";
  if (code === "P2007") return "Data validation error.";
  if (code === "P2008") return "Failed to parse the query.";
  if (code === "P2009") return "Query validation error.";
  if (code === "P2010") return "Raw query failed.";
  if (code === "P2011") return "A null value was provided for a required field.";
  if (code === "P2012") return "A required field is missing.";
  if (code === "P2013") return "A required argument is missing.";
  if (code === "P2014") return "A relation was violated.";
  if (code === "P2015") return "A related record could not be found.";
  if (code === "P2016") return "Query interpretation error.";
  if (code === "P2017") return "The records for the relation are not connected.";
  if (code === "P2018") return "The required connected records were not found.";
  if (code === "P2019") return "Input error.";
  if (code === "P2021") return "The table does not exist in the database.";
  if (code === "P2022") return "The column does not exist in the database.";
  if (code === "P2023") return "Inconsistent column data.";
  if (code === "P2024") return "The database request timed out. Please try again.";
  if (code === "P2028") return "Transaction error. Please try again.";
  if (code === "P2030") return "Failed to connect to the database.";
  if (code === "P2033") return "The database returned an error.";
  if (code === "P2034") return "Transaction failed due to a write conflict.";
  if (code === "P2035") return "The database is not available.";
  if (code === "P2036") return "The database is not accessible.";
  if (code === "P2037") return "The database protocol error.";

  // SQLite-specific errors
  if (msg.includes("sqlite_busy") || msg.includes("database is locked")) {
    return "The database is busy. Please try again in a moment.";
  }
  if (msg.includes("no such table")) {
    return "Database tables are missing. Please contact support.";
  }
  if (msg.includes("no such column")) {
    return "Database schema mismatch. Please contact support.";
  }
  if (msg.includes("foreign key constraint")) {
    return "Referenced record does not exist.";
  }
  if (msg.includes("unique constraint") || msg.includes("unique")) {
    return "A record with this value already exists.";
  }
  if (msg.includes("not null constraint") || msg.includes("cannot be null")) {
    return "A required field is missing.";
  }
  if (msg.includes("check constraint") || msg.includes("constraint failed")) {
    return "A data validation error occurred.";
  }

  // Prisma Client initialization errors
  if (msg.includes("prisma client") && msg.includes("not")) {
    return "Database connection is not configured. Please contact support.";
  }

  return "An unexpected error occurred. Please try again.";
}