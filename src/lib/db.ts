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
 * Friendly user-facing error message for database issues.
 * Callers should use this in their catch blocks to avoid leaking
 * raw Prisma internals to the client.
 */
export function getDbFriendlyMessage(error: unknown): string {
  if (isPrismaTransient(error)) {
    return "We're reconnecting to the database. Please wait a moment and try again.";
  }
  // Unique constraint violation
  if (error && typeof error === "object") {
    const code = (error as { code?: string }).code ?? "";
    if (code === "P2002") return "A record with this value already exists.";
    if (code === "P2025") return "The requested record was not found.";
    if (code === "P2003") return "Referenced record does not exist.";
  }
  return "An unexpected error occurred. Please try again.";
}