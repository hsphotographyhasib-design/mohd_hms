/**
 * Database client — auto-switches between Supabase REST API and local Prisma/SQLite.
 *
 * When USE_SUPABASE=true, uses the Supabase REST adapter (works from any network).
 * Otherwise, dynamically loads Prisma/SQLite only when first needed.
 *
 * All 100+ API routes import { db } from '@/lib/db' — no changes needed.
 */

import { supabaseDb } from './supabase-db';

/**
 * Lazy Prisma proxy — uses require() to load prisma.ts only on first
 * property access. This ensures importing db.ts never triggers the
 * SQLite adapter or any native module loading when USE_SUPABASE=true.
 */
let _prismaCache: any = undefined;

function _ensurePrisma(): any {
  if (!_prismaCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./prisma');
    _prismaCache = mod.prisma();
  }
  return _prismaCache;
}

const _lazyPrisma = new Proxy({} as any, {
  get(_target, prop, receiver) {
    const client = _ensurePrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, prop) {
    return prop in _ensurePrisma();
  },
});

export const db: any =
  process.env.USE_SUPABASE === 'true'
    ? supabaseDb
    : _lazyPrisma;

// Lazy type re-export (never evaluated at runtime)
export type { PrismaClient } from "../../generated/prisma/client";

/** Check if an error is transient (retry-worthy) — works without Prisma import */
function isTransientError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const msg = (error as Error).message ?? '';
    const code = (error as { code?: string })?.code ?? '';
    return (
      msg.includes('timed out') || msg.includes('timeout') || msg.includes('ETIMEDOUT') ||
      msg.includes('Connection terminated') || msg.includes('connect timeout') ||
      code === 'P2024' || code === 'P1001' || code === 'P1008' ||
      msg.includes('Connection refused') || msg.includes('ECONNREFUSED') ||
      msg.includes('ECONNRESET') || msg.includes('Too many connections') ||
      msg.includes('Connection pool exhausted') || msg.includes('database is locked') ||
      msg.includes('SQLITE_BUSY') || msg.includes('fetch failed')
    );
  }
  return false;
}

/**
 * Retry wrapper for transient database failures.
 */
const RETRY_DELAYS = [1000, 2000, 5000, 10000];
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
      if (!isTransientError(error) || attempt >= max) throw error;
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      console.warn(`[DB Retry ${attempt + 1}/${max}] ${label} failed, retrying in ${delay}ms…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Extract error code from any error object.
 */
function getErrorCode(error: unknown): string {
  if (error && typeof error === "object") return (error as { code?: string }).code ?? "";
  return "";
}

/**
 * Extract the error constructor name for classification.
 */
function getErrorTypeName(error: unknown): string {
  if (error instanceof Error) return error.constructor.name;
  return typeof error;
}

/**
 * Classify an error into a category for appropriate messaging.
 */
type ErrorCategory = "prisma" | "pg_native" | "network" | "json_parse" | "auth" | "timeout" | "validation" | "unknown";

function classifyError(error: unknown): ErrorCategory {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : "";

  if (typeName === "SyntaxError" && msg.includes("JSON")) return "json_parse";
  if (typeName === "TypeError" && (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch") || msg.includes("NetworkError"))) return "network";
  if (/^P\d{4}$/.test(code)) return "prisma";
  if (/^[0-9A-Z]{5}$/.test(code) && msg.length > 0) return "pg_native";

  const fallbackLower = msg.toLowerCase();
  if (["ECONNREFUSED","ENOTFOUND","ECONNRESET","ETIMEDOUT","ENETUNREACH"].some(e => msg.includes(e)) || fallbackLower.includes("connect timeout") || fallbackLower.includes("socket hang up")) return "network";
  if (fallbackLower.includes("self signed certificate") || (fallbackLower.includes("ssl") && fallbackLower.includes("certificate")) || (fallbackLower.includes("tls") && fallbackLower.includes("handshake"))) return "network";
  if (fallbackLower.includes("timed out") || fallbackLower.includes("timeout")) return "timeout";
  if (fallbackLower.includes("jwt") || fallbackLower.includes("token") || fallbackLower.includes("bcrypt") || fallbackLower.includes("secret")) return "auth";

  if (fallbackLower.includes("relation") && fallbackLower.includes("does not exist")) return "pg_native";
  if (fallbackLower.includes("column") && fallbackLower.includes("does not exist")) return "pg_native";
  if (fallbackLower.includes("password authentication failed")) return "pg_native";
  if (fallbackLower.includes("database") && fallbackLower.includes("does not exist")) return "pg_native";
  if (fallbackLower.includes("validation") || fallbackLower.includes("constraint") || fallbackLower.includes("invalid")) return "validation";
  return "unknown";
}

function getPgFriendlyMessage(code: string, msg: string): string | null {
  if (["08001","08003","08004","08006","08007"].includes(code)) return "Unable to connect to the database. Please try again later.";
  if (code === "3D000") return "Database does not exist. Please contact your administrator.";
  if (code.startsWith("28")) return "Database authentication failed. Please check your credentials.";
  if (["53xxx","54xxx","55xxx"].some(c => code.startsWith(c)) || code === "55P03") return "Database resources unavailable. Please try again later.";
  if (code === "54000") return "Statement too complex. Please simplify your request.";
  if (code === "40P01") return "A conflict occurred. Please try again.";
  if (code === "42P01") return "Database tables are missing. Please contact support.";
  if (code === "42703") return "Database schema mismatch. Please contact support.";
  if (code === "42883") return "A database function is missing. Please contact support.";
  if (code === "42804") return "Data type mismatch. Please contact support.";
  if (code === "23502") return "A required field is missing.";
  if (code === "23505") return "A record with this value already exists.";
  if (code === "23503") return "Referenced record does not exist.";
  if (code === "23514") return "A data validation error occurred.";
  if (code === "40001") return "A conflict occurred. Please try again.";
  if (code === "53100") return "Database storage is full. Please contact support.";
  if (code === "53300") return "Too many connections. Please try again later.";
  return null;
}

export function getDbFriendlyMessage(error: unknown): string {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[Error] type=${typeName} code=${code || "none"} msg="${msg}"`, stack ? `\n${stack.split("\n").slice(0, 5).join("\n")}` : "");

  if (isTransientError(error)) return "We're reconnecting to the database. Please wait a moment and try again.";

  const category = classifyError(error);
  switch (category) {
    case "json_parse": return "Invalid request data. Please check your input and try again.";
    case "network": return "A network error occurred. Please check your connection and try again.";
    case "timeout": return "The request took too long. Please try again.";
    case "auth":
      if (msg.includes("jwt") && (msg.includes("expired") || msg.includes("invalid"))) return "Your session has expired. Please sign in again.";
      return "An authentication error occurred. Please sign in again.";
    case "pg_native": {
      const pgMsg = getPgFriendlyMessage(code, msg);
      if (pgMsg) return pgMsg;
      return "A database error occurred. Please try again or contact support.";
    }
    case "prisma": {
      if (code === "P2002") return "A record with this value already exists.";
      if (code === "P2025") return "The requested record was not found.";
      if (code === "P2003") return "Referenced record does not exist.";
      if (code === "P2004") return "A constraint on the database failed.";
      if (code === "P2011" || code === "P2012") return "A required field is missing.";
      if (code === "P2021") return "Database tables are missing. Please contact support.";
      if (code === "P2022") return "Database schema mismatch. Please contact support.";
      if (code === "P1000" || code === "P1013") return "Database authentication failed. Please check your database credentials.";
      if (code === "P1001" || code === "P1002" || code === "P1008") return "Cannot reach the database server. Please check your connection.";
      if (code === "P1009") return "Database already exists.";
      return "A database error occurred. Please try again or contact support.";
    }
    case "validation": return "A validation error occurred. Please check your input.";
    default: break;
  }

  const debugSnippet = `[${typeName}${code ? ':' + code : ''}] ${msg.length > 120 ? msg.slice(0, 117) + '...' : msg}`;
  const fb = msg.toLowerCase();
  if (fb.includes("database") || fb.includes("query")) {
    if (fb.includes("does not exist") || fb.includes("no such")) return `Database setup incomplete. (${debugSnippet})`;
    if (fb.includes("connect") || fb.includes("connection")) return `Cannot connect to the database. (${debugSnippet})`;
    return `A database error occurred. (${debugSnippet})`;
  }
  return `An unexpected error occurred. (${debugSnippet})`;
}

export function getErrorInfo(error: unknown): string {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : String(error);
  const sanitized = msg.replace(/[\r\n]+/g, ' ').trim();
  const shortMsg = sanitized.length > 80 ? sanitized.slice(0, 77) + '...' : sanitized;
  return `${typeName}:${code || 'none'}:${shortMsg}`;
}

export function getErrorHeaders(error: unknown): Record<string, string> {
  return {
    'X-Error-Type': getErrorTypeName(error),
    'X-Error-Code': getErrorCode(error) || 'none',
    'X-Error-Info': getErrorInfo(error).slice(0, 200),
  };
}