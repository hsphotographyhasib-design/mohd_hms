/**
 * Database utility functions — retry logic, error formatting, and error extraction.
 *
 * These are re-exported from `@/lib/db` for convenience.
 */

// ─── Retry with exponential backoff ──────────────────────────────────────────

interface RetryOptions {
  /** Label used in log messages to identify the operation */
  label?: string
  /** Maximum number of retry attempts (default 3). Accepts both `retries` and `maxRetries`. */
  retries?: number
  maxRetries?: number
  /** Base delay in ms before the first retry (default 500) */
  delayMs?: number
}

/**
 * Wraps an async DB operation with exponential-backoff retry.
 *
 * On each failure the delay doubles: 500ms → 1s → 2s …
 * Only transient / connection errors are retried; validation or
 * unique-constraint errors are thrown immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const label = opts.label ?? 'db-operation'
  const maxAttempts = opts.maxRetries ?? opts.retries ?? 3
  const baseDelay = opts.delayMs ?? 500

  let lastError: unknown

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      // Do not retry client / validation errors
      if (!isTransientError(err)) throw err

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.warn(
          `[db-utils] ${label} failed (attempt ${attempt + 1}/${maxAttempts + 1}), retrying in ${delay}ms:`,
          err instanceof Error ? err.message : err,
        )
        await sleep(delay)
      }
    }
  }

  throw lastError
}

// ─── Human-friendly error messages ───────────────────────────────────────────

/**
 * A comprehensive map of Prisma error codes to user-friendly messages.
 *
 * Both Prisma and the Supabase REST layer (supabase-rest.ts) produce
 * errors with these codes so this single map covers both backends.
 */
const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  // Constraint & validation
  P2002: 'Record already exists',
  P2003: 'Related record not found',
  P2004: 'A constraint failed on the database',
  P2007: 'Data validation error',
  P2008: 'Failed to parse the query',
  P2011: 'Required field is missing',
  P2012: 'Missing a required value',
  P2013: 'Missing a required argument',
  P2014: 'Invalid value for the field',
  P2015: 'Related record not found',
  P2016: 'Query interpretation error',
  P2017: 'Maximum query depth exceeded',
  P2018: 'Required connected records not found',
  P2019: 'Input error',
  P2020: 'Value out of range for the field',
  P2021: 'Table not found — database may need setup',
  P2022: 'Column not found — database may need setup',
  P2023: 'Inconsistent column data',
  P2024: 'Timed out fetching a new connection from the pool',
  P2025: 'Record not found',
  P2026: 'Current transaction is already committed',
  P2027: 'Multiple errors occurred on the database',
  P2028: 'Transaction API error',
  P2030: 'Full-text search failed',
  P2031: 'Prisma engine error',
  P2033: 'Connection to database failed',
  P2034: 'Transaction failed due to a write conflict',
  P2035: 'Transaction failed due to a deadlock',
  P2036: 'Foreign key constraint failed',
  P2037: 'Tuple not found',
  P2038: 'Transaction already closed',

  // HTTP-style codes produced by PostgREST
  '401': 'Authentication required',
  '403': 'Permission denied',
  '404': 'Resource not found',
  '429': 'Too many requests — please try again later',
  '500': 'Internal database error',
  '502': 'Database is temporarily unavailable',
  '503': 'Database is temporarily unavailable',
  '504': 'Database request timed out',
}

/**
 * Converts any error into a human-friendly, non-technical message string.
 *
 * Handles:
 *  - Prisma errors (`.code` e.g. P2002, P2003 …)
 *  - PostgREST / Supabase errors (numeric HTTP-like codes, or raw PG codes)
 *  - Plain `Error` instances
 *  - Primitives (string, number)
 */
export function getDbFriendlyMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred.'

  // Direct string
  if (typeof error === 'string') {
    return error.length > 200 ? error.slice(0, 200) + '…' : error
  }

  if (typeof error !== 'object') {
    return 'An unexpected error occurred.'
  }

  const obj = error as Record<string, unknown>

  // Try the error code first (covers Prisma & mapped PostgREST codes)
  const code = typeof obj.code === 'string' ? obj.code : undefined

  if (code) {
    const mapped = PRISMA_ERROR_MESSAGES[code]
    if (mapped) return mapped

    // Fallback for raw PostgreSQL error codes (e.g. 23505, 42P01)
    const pgFriendly = POSTGRES_ERROR_MESSAGES[code]
    if (pgFriendly) return pgFriendly
  }

  // Try `.message` (standard Error)
  if (typeof obj.message === 'string' && obj.message.length > 0) {
    const msg = obj.message
    // Strip technical prefixes that Prisma / Supabase prepend
    return (
      msg
        .replace(
          /Invalid `[\w.]+` invocation:[\s\S]*/,
          'Invalid database query.',
        )
        .replace(/\n/g, ' ')
        .trim()
        .slice(0, 200) || 'Database operation failed.'
    )
  }

  return 'An unexpected error occurred.'
}

// ─── Error headers for HTTP responses ─────────────────────────────────────────

/**
 * Returns HTTP response headers with structured error details.
 *
 * Extracts `x-error-code`, `x-error-table`, and `x-error-operation`
 * from the error object when those properties are present.
 */
export function getErrorHeaders(error: unknown): Record<string, string> {
  const info = getErrorInfo(error)
  const headers: Record<string, string> = {
    'x-error-code': info.code,
  }
  if (info.table) headers['x-error-table'] = info.table
  if (info.operation) headers['x-error-operation'] = info.operation
  return headers
}

// ─── Structured error info extraction ─────────────────────────────────────────

export interface DbErrorInfo {
  code: string
  message: string
  table?: string
  operation?: string
}

/**
 * Extracts structured information from any error.
 *
 * Reads `.code`, `.message`, `.table`, and `.operation` properties
 * when available on the error object.
 */
export function getErrorInfo(error: unknown): DbErrorInfo {
  if (!error || typeof error !== 'object') {
    return {
      code: 'UNKNOWN',
      message: typeof error === 'string' ? error : 'An unexpected error occurred.',
    }
  }

  const obj = error as Record<string, unknown>

  return {
    code: typeof obj.code === 'string' ? obj.code : 'UNKNOWN',
    message: getDbFriendlyMessage(error),
    table: typeof obj.table === 'string' ? obj.table : undefined,
    operation: typeof obj.operation === 'string' ? obj.operation : undefined,
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** PostgreSQL error code → friendly message (fallback before Prisma mapping). */
const POSTGRES_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'Record already exists',
  '23503': 'Related record not found',
  '23502': 'Required field is missing',
  '42P01': 'Table not found — database may need setup',
  '42703': 'Column not found — database may need setup',
  '08001': 'Could not connect to the database',
  '08006': 'Connection to the database failed',
  '08004': 'Database connection rejected',
  '08007': 'Database connection was lost',
  '57P01': 'Database is shutting down',
  '57P02': 'Database is starting up',
  '53300': 'Database is too busy — please try again',
  '53400': 'Database is out of memory',
  '55000': 'Database error — please contact support',
  '57014': 'Database query was cancelled',
}

/**
 * Determined whether an error is transient / retryable.
 *
 * We retry on connection failures, timeouts, pool exhaustion,
 * and write conflicts — but *not* on validation / constraint errors.
 */
function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const obj = err as Record<string, unknown>
  const code = typeof obj.code === 'string' ? obj.code : ''
  const msg = typeof obj.message === 'string' ? obj.message : ''

  // Transient Prisma codes
  if (
    code === 'P2024' || // Timed out fetching connection
    code === 'P2031' || // Prisma engine error (often connection)
    code === 'P2033' || // Connection failed
    code === 'P2034' || // Write conflict
    code === 'P2035'    // Deadlock
  )
    return true

  // Transient PostgREST / HTTP codes
  if (code === '502' || code === '503' || code === '504' || code === '429')
    return true

  // Transient PostgreSQL error classes
  // 08xxx = connection errors, 53xxx = insufficient resources, 57xxx = operator intervention
  if (/^0[89]|^53|^57/.test(code)) return true

  // Keyword-based fallback for connection / pool / timeout errors
  const lc = msg.toLowerCase()
  if (
    lc.includes('econnrefused') ||
    lc.includes('econnreset') ||
    lc.includes('etimedout') ||
    lc.includes('connection') ||
    lc.includes('timeout') ||
    lc.includes('pool') ||
    lc.includes('too many clients') ||
    lc.includes('could not connect') ||
    lc.includes('transport') ||
    lc.includes('socket hang up') ||
    lc.includes('fetch failed')
  )
    return true

  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}