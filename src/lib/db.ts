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
 * Extract error code from any error object.
 * Handles Prisma codes (P2xxx), PostgreSQL codes (5-char alphanumeric),
 * and Node.js error codes.
 */
function getErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    return (error as { code?: string }).code ?? "";
  }
  return "";
}

/**
 * Extract the error constructor name for classification.
 */
function getErrorTypeName(error: unknown): string {
  if (error instanceof Error) {
    return error.constructor.name;
  }
  return typeof error;
}

/**
 * Classify an error into a category for appropriate messaging.
 */
type ErrorCategory =
  | "prisma"
  | "pg_native"
  | "network"
  | "json_parse"
  | "auth"
  | "timeout"
  | "validation"
  | "unknown";

function classifyError(error: unknown): ErrorCategory {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : "";

  // JSON parse errors
  if (typeName === "SyntaxError" && msg.includes("JSON")) return "json_parse";

  // Network errors (fetch, ECONNREFUSED, ENOTFOUND, etc.)
  if (
    typeName === "TypeError" &&
    (msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError"))
  )
    return "network";

  // Prisma error codes (P1xxx, P2xxx, P3xxx)
  if (/^P\d{4}$/.test(code)) return "prisma";

  // PostgreSQL native error codes (5-char alphanumeric, e.g., 3D000, 28P01, 08001)
  if (/^[0-9A-Z]{5}$/.test(code) && msg.length > 0) return "pg_native";

  // Network/connection patterns in message
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("getaddrinfo") ||
    msg.includes("socket hang up") ||
    msg.includes("connect ECONNREFUSED") ||
    msg.includes("connect ENOENT") ||
    msg.includes("Connection refused") ||
    msg.includes("Connection terminated") ||
    msg.includes("connect timeout") ||
    msg.includes("Too many connections") ||
    msg.includes("Connection pool exhausted") ||
    msg.includes("read ECONNRESET") ||
    msg.includes("write ECONNRESET") ||
    msg.includes("connect ENETUNREACH") ||
    msg.includes("hostname") && msg.includes("does not resolve")
  )
    return "network";

  // SSL/TLS errors
  if (
    msg.includes("self signed certificate") ||
    msg.includes("unable to verify") ||
    msg.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
    msg.includes("CERT_HAS_EXPIRED") ||
    msg.includes("ssl") && msg.includes("certificate") ||
    msg.includes("tls") && msg.includes("handshake") ||
    msg.includes("DEPTH_ZERO_SELF_SIGNED_CERT") ||
    msg.includes("ERR_TLS_")
  )
    return "network";

  // Timeout patterns
  if (
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("Timeout") ||
    msg.includes("TIMEOUT")
  )
    return "timeout";

  // Auth-related errors (JWT, bcrypt)
  if (
    msg.includes("jwt") ||
    msg.includes("JWT") ||
    msg.includes("token") ||
    msg.includes("bcrypt") ||
    msg.includes("secret")
  )
    return "auth";

  // PostgreSQL patterns (even without a pg error code)
  if (
    msg.includes("relation") &&
    (msg.includes("does not exist") || msg.includes("already exists"))
  )
    return "pg_native";
  if (msg.includes("column") && msg.includes("does not exist"))
    return "pg_native";
  if (msg.includes("schema") && msg.includes("does not exist"))
    return "pg_native";
  if (
    msg.includes("password authentication failed") ||
    msg.includes("authentication failed") ||
    msg.includes("role") &&
    msg.includes("does not exist")
  )
    return "pg_native";
  if (
    msg.includes("database") &&
    msg.includes("does not exist")
  )
    return "pg_native";

  // Validation / constraint errors
  if (
    msg.includes("validation") ||
    msg.includes("constraint") ||
    msg.includes("invalid")
  )
    return "validation";

  return "unknown";
}

/**
 * PostgreSQL native error code mapping.
 * See: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
function getPgFriendlyMessage(code: string, msg: string): string | null {
  const pgMsg = msg.toLowerCase();

  // Connection errors (08xxx)
  if (code === "08001" || code === "08003" || code === "08004" || code === "08006" || code === "08007") {
    return "Unable to connect to the database. Please try again later.";
  }
  // Connection exception — does not exist
  if (code === "3D000") {
    return "Database does not exist. Please contact your administrator.";
  }
  // Auth errors (28xxx)
  if (code.startsWith("28")) {
    return "Database authentication failed. Please check your credentials.";
  }
  // Insufficient resources (53xxx, 54xxx, 55xxx)
  if (code.startsWith("53") || code.startsWith("54") || code === "55P03") {
    return "Database resources unavailable. Please try again later.";
  }
  // Program limit exceeded (54000)
  if (code === "54000") {
    return "Statement too complex. Please simplify your request.";
  }
  // Feature not supported (0A000)
  if (code === "0A000") {
    return "This database operation is not supported.";
  }
  // Deadlock (40P01)
  if (code === "40P01") {
    return "A conflict occurred. Please try again.";
  }
  // Undefined table (42P01)
  if (code === "42P01") {
    return "Database tables are missing. Please contact support.";
  }
  // Undefined column (42703)
  if (code === "42703") {
    return "Database schema mismatch. Please contact support.";
  }
  // Undefined function (42883)
  if (code === "42883") {
    return "A database function is missing. Please contact support.";
  }
  // Datatype mismatch (42804)
  if (code === "42804") {
    return "Data type mismatch. Please contact support.";
  }
  // Not null violation (23502)
  if (code === "23502") {
    return "A required field is missing.";
  }
  // Unique violation (23505)
  if (code === "23505") {
    return "A record with this value already exists.";
  }
  // Foreign key violation (23503)
  if (code === "23503") {
    return "Referenced record does not exist.";
  }
  // Check violation (23514)
  if (code === "23514") {
    return "A data validation error occurred.";
  }
  // Serializable failure (40001)
  if (code === "40001") {
    return "A conflict occurred. Please try again.";
  }
  // Disk full (53100)
  if (code === "53100") {
    return "Database storage is full. Please contact support.";
  }
  // Too many connections (53300)
  if (code === "53300") {
    return "Too many connections. Please try again later.";
  }
  // Configuration error
  if (code.startsWith("F")) {
    return "A system configuration error occurred. Please contact support.";
  }
  // IO Error
  if (code.startsWith("58")) {
    return "A database storage error occurred. Please contact support.";
  }

  // Message-based fallback for pg errors
  if (pgMsg.includes("password authentication failed")) {
    return "Database authentication failed. Please contact your administrator.";
  }
  if (pgMsg.includes("role") && pgMsg.includes("does not exist")) {
    return "Database user does not exist. Please contact your administrator.";
  }
  if (pgMsg.includes("database") && pgMsg.includes("does not exist")) {
    return "Database does not exist. Please contact your administrator.";
  }
  if (pgMsg.includes("relation") && pgMsg.includes("does not exist")) {
    return "Database tables are missing. The database may need to be set up. Please contact support.";
  }
  if (pgMsg.includes("column") && pgMsg.includes("does not exist")) {
    return "Database schema mismatch. Please contact support.";
  }
  if (pgMsg.includes("already exists")) {
    return "A record with this value already exists.";
  }
  if (pgMsg.includes("connection")) {
    return "Unable to connect to the database. Please try again later.";
  }

  return null;
}

/**
 * Comprehensive error-to-user-message mapper.
 *
 * Handles ALL error types — not just Prisma/DB errors:
 * - Prisma errors (P1xxx, P2xxx, P3xxx)
 * - PostgreSQL native errors (5-char codes)
 * - Network / connection errors
 * - JSON parse errors
 * - Auth (JWT/bcrypt) errors
 * - Timeout errors
 * - Validation errors
 * - Unknown errors (with debug info in server log)
 *
 * IMPORTANT: Always logs the full error server-side for debugging.
 */
export function getDbFriendlyMessage(error: unknown): string {
  // ---- Comprehensive server-side logging ----
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Log the full error with classification
  console.error(
    `[Error] type=${typeName} code=${code || "none"} msg="${msg}"`,
    stack ? `\n${stack.split("\n").slice(0, 5).join("\n")}` : ""
  );

  // ---- 1. Transient / connection errors (retry-worthy) ----
  if (isPrismaTransient(error)) {
    return "We're reconnecting to the database. Please wait a moment and try again.";
  }

  // ---- 2. Classify and handle by category ----
  const category = classifyError(error);

  switch (category) {
    // ---- JSON parse errors ----
    case "json_parse":
      return "Invalid request data. Please check your input and try again.";

    // ---- Network / connection errors ----
    case "network":
      return "A network error occurred. Please check your connection and try again.";

    // ---- Timeout errors ----
    case "timeout":
      return "The request took too long. Please try again.";

    // ---- Auth errors (JWT, bcrypt) ----
    case "auth":
      if (msg.includes("jwt") && (msg.includes("expired") || msg.includes("invalid"))) {
        return "Your session has expired. Please sign in again.";
      }
      if (msg.includes("jwt") || msg.includes("secret")) {
        return "An authentication error occurred. Please sign in again.";
      }
      if (msg.includes("bcrypt") || msg.includes("hash")) {
        return "An authentication error occurred. Please try again.";
      }
      return "An authentication error occurred. Please sign in again.";

    // ---- PostgreSQL native errors ----
    case "pg_native": {
      const pgMsg = getPgFriendlyMessage(code, msg);
      if (pgMsg) return pgMsg;
      // Unrecognized pg error — give a generic but informative message
      return "A database error occurred. Please try again or contact support.";
    }

    // ---- Prisma errors ----
    case "prisma": {
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
      if (code === "P1000") return "Authentication failed. Please check your database credentials.";
      if (code === "P1001") return "Cannot reach the database server. Please check your connection.";
      if (code === "P1002") return "The database server timed out.";
      if (code === "P1003") return "Database URL is invalid. Please check your configuration.";
      if (code === "P1008") return "The database operation timed out.";
      if (code === "P1009") return "Database already exists.";
      if (code === "P1010") return "Database user already exists.";
      if (code === "P1011") return "An error occurred during database migration.";
      if (code === "P1012") return "An error occurred during database introspection.";
      if (code === "P1013") return "The provided database credentials are invalid.";
      if (code === "P1014") return "The database version is not supported.";
      if (code === "P1015") return "The database is already being used.";
      if (code === "P1016") return "An error occurred during database introspection.";
      if (code === "P1017") return "Server closed the connection unexpectedly.";

      // Prisma errors with no code but matching message patterns
      const msgLower = msg.toLowerCase();
      if (msgLower.includes("no such table")) {
        return "Database tables are missing. Please contact support.";
      }
      if (msgLower.includes("no such column")) {
        return "Database schema mismatch. Please contact support.";
      }
      if (msgLower.includes("foreign key constraint")) {
        return "Referenced record does not exist.";
      }
      if (msgLower.includes("unique constraint") || msgLower.includes("unique")) {
        return "A record with this value already exists.";
      }
      if (msgLower.includes("not null constraint") || msgLower.includes("cannot be null")) {
        return "A required field is missing.";
      }
      if (msgLower.includes("check constraint") || msgLower.includes("constraint failed")) {
        return "A data validation error occurred.";
      }

      // Prisma Client initialization errors
      if (msgLower.includes("prisma client") && msgLower.includes("not")) {
        return "Database connection is not configured. Please contact support.";
      }

      return "A database error occurred. Please try again or contact support.";
    }

    // ---- Validation errors ----
    case "validation":
      return "A validation error occurred. Please check your input.";

    // ---- Unknown errors ----
    case "unknown":
    default:
      break;
  }

  // ---- Final fallback — provide the MOST specific message possible ----

  // Build a debug snippet from the actual error (for diagnostics)
  const debugSnippet = `[${typeName}${code ? ':' + code : ''}] ${msg.length > 120 ? msg.slice(0, 117) + '...' : msg}`;

  // BROAD SAFETY NET: Check for ANY database-related keywords in the error message
  // This catches errors from adapters, drivers, connection pools that we haven't explicitly classified
  const fallbackLower = msg.toLowerCase();
  if (fallbackLower.includes("database") || fallbackLower.includes("db ") || fallbackLower.includes("query")) {
    if (fallbackLower.includes("does not exist") || fallbackLower.includes("not found") || fallbackLower.includes("no such")) {
      return `Database setup incomplete. Tables or data may be missing. (${debugSnippet})`;
    }
    if (fallbackLower.includes("connect") || fallbackLower.includes("connection")) {
      return `Cannot connect to the database. (${debugSnippet})`;
    }
    if (fallbackLower.includes("permission") || fallbackLower.includes("denied") || fallbackLower.includes("access")) {
      return `Database access denied. (${debugSnippet})`;
    }
    if (fallbackLower.includes("ssl") || fallbackLower.includes("certificate")) {
      return `Database SSL/TLS error. (${debugSnippet})`;
    }
    if (fallbackLower.includes("pool") || fallbackLower.includes("exhausted")) {
      return `Too many database connections. (${debugSnippet})`;
    }
    if (fallbackLower.includes("timeout") || fallbackLower.includes("timed out")) {
      return `Database request timed out. (${debugSnippet})`;
    }
    // Generic DB error but more specific than "unexpected"
    return `A database error occurred. (${debugSnippet})`;
  }

  // Check for adapter-specific errors
  if (fallbackLower.includes("adapter") || fallbackLower.includes("prismapg") || fallbackLower.includes("prismalibsql")) {
    return `Database adapter error. (${debugSnippet})`;
  }

  // Check for common Vercel/Edge runtime errors
  if (fallbackLower.includes("edge") || fallbackLower.includes("serverless") || fallbackLower.includes("lambda")) {
    return `A server environment error occurred. (${debugSnippet})`;
  }

  // Check for common non-Error thrown values
  if (error === null || error === undefined) {
    return "An unexpected error occurred (null/undefined thrown). Please try again.";
  }
  if (typeof error === "string") {
    // If someone threw a plain string error
    if (error.length < 100) return error;
    return "An unexpected error occurred. Please try again.";
  }

  // For any Error object we haven't classified, include debug info
  return `An unexpected error occurred. (${debugSnippet})`;
}

/**
 * Extract a short diagnostic string from an error for response headers.
 * Used by API routes to include X-Error-Info header for debugging.
 *
 * Format: "ErrorType:code:short-message"
 * Example: "PgProtocolError:3D000:database does not exist"
 */
export function getErrorInfo(error: unknown): string {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : String(error);
  const shortMsg = msg.length > 80 ? msg.slice(0, 77) + '...' : msg;
  return `${typeName}:${code || 'none'}:${shortMsg}`;
}

/**
 * Create error response headers with diagnostic info.
 * Include these in your 500 responses for debugging.
 */
export function getErrorHeaders(error: unknown): Record<string, string> {
  return {
    'X-Error-Type': getErrorTypeName(error),
    'X-Error-Code': getErrorCode(error) || 'none',
    'X-Error-Info': getErrorInfo(error).slice(0, 200),
  };
}