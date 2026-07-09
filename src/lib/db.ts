/**
 * Database client — auto-switches between Supabase REST API and local Prisma/SQLite.
 *
 * When USE_SUPABASE=true, uses the Supabase REST adapter (works from any network).
 * Otherwise, lazily loads Prisma/SQLite only when first needed.
 *
 * All 100+ API routes import { db } from '@/lib/db' — no changes needed.
 */

import { supabaseDb } from './supabase-db';

/**
 * Lazy Prisma proxy — calls prisma() factory on first property access.
 * prisma.ts no longer has side effects at import time (all heavy imports
 * are inside the factory function), so a static import is safe.
 */
let _prismaCache: any = undefined;

function _ensurePrisma(): any {
  if (!_prismaCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { prisma } = require('./prisma');
    _prismaCache = prisma();
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
    try { return prop in _ensurePrisma(); } catch { return false; }
  },
});

export const db: any =
  process.env.USE_SUPABASE === 'true'
    ? supabaseDb
    : _lazyPrisma;

// Lazy type re-export (never evaluated at runtime)
export type { PrismaClient } from "../../generated/prisma/client";

/** Check if an error is transient (retry-worthy) */
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

const RETRY_DELAYS = [1000, 2000, 5000, 10000];
const MAX_RETRIES = RETRY_DELAYS.length;

export async function withRetry<T>(fn: () => Promise<T>, options?: { maxRetries?: number; label?: string }): Promise<T> {
  const max = options?.maxRetries ?? MAX_RETRIES;
  const label = options?.label ?? "db-operation";
  let lastError: unknown;
  for (let attempt = 0; attempt <= max; attempt++) {
    try { return await fn(); }
    catch (error) {
      lastError = error;
      if (!isTransientError(error) || attempt >= max) throw error;
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      console.warn(`[DB Retry ${attempt + 1}/${max}] ${label} failed, retrying in ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

function getErrorCode(e: unknown): string { return (e && typeof e === "object" ? (e as { code?: string }).code : "") || ""; }
function getErrorTypeName(e: unknown): string { return e instanceof Error ? e.constructor.name : typeof e; }

function classifyError(error: unknown): string {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : "";
  const fb = msg.toLowerCase();
  if (typeName === "SyntaxError" && msg.includes("JSON")) return "json_parse";
  if (typeName === "TypeError" && (fb.includes("fetch") || fb.includes("network") || fb.includes("Failed to fetch"))) return "network";
  if (/^P\d{4}$/.test(code)) return "prisma";
  if (/^[0-9A-Z]{5}$/.test(code) && msg.length > 0) return "pg_native";
  if (["ECONNREFUSED","ENOTFOUND","ECONNRESET","ETIMEDOUT","ENETUNREACH"].some(e => msg.includes(e)) || fb.includes("connect timeout")) return "network";
  if (fb.includes("self signed certificate") || (fb.includes("ssl") && fb.includes("certificate"))) return "network";
  if (fb.includes("timed out") || fb.includes("timeout")) return "timeout";
  if (fb.includes("jwt") || fb.includes("token") || fb.includes("bcrypt") || fb.includes("secret")) return "auth";
  if (fb.includes("does not exist")) return "pg_native";
  if (fb.includes("password authentication failed")) return "pg_native";
  if (fb.includes("validation") || fb.includes("constraint") || fb.includes("invalid")) return "validation";
  return "unknown";
}

export function getDbFriendlyMessage(error: unknown): string {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[Error] type=${typeName} code=${code || "none"} msg="${msg}"`);
  if (isTransientError(error)) return "We're reconnecting to the database. Please wait a moment and try again.";
  const category = classifyError(error);
  switch (category) {
    case "json_parse": return "Invalid request data.";
    case "network": return "A network error occurred.";
    case "timeout": return "The request took too long.";
    case "auth": return "Your session has expired. Please sign in again.";
    case "pg_native": return "A database error occurred.";
    case "prisma":
      if (code === "P2002") return "A record already exists.";
      if (code === "P2025") return "Record not found.";
      if (code === "P2003") return "Referenced record does not exist.";
      return "A database error occurred.";
    case "validation": return "A validation error occurred.";
    default: return `An unexpected error occurred. ([${typeName}] ${msg.slice(0, 100)})`;
  }
}

export function getErrorInfo(error: unknown): string {
  const typeName = getErrorTypeName(error);
  const code = getErrorCode(error);
  const msg = (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, ' ').trim().slice(0, 80);
  return `${typeName}:${code || 'none'}:${msg}`;
}

export function getErrorHeaders(error: unknown): Record<string, string> {
  return { 'X-Error-Type': getErrorTypeName(error), 'X-Error-Code': getErrorCode(error) || 'none', 'X-Error-Info': getErrorInfo(error).slice(0, 200) };
}