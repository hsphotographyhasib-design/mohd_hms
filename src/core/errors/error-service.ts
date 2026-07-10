/**
 * Enterprise Error Service
 *
 * Core service for error categorization, request/error ID generation,
 * user-friendly message mapping, database error detection, and error
 * sanitization. Pure TypeScript — no React or UI dependencies.
 */

// ============================================================
// ERROR CATEGORIES
// ============================================================

export const ERROR_CATEGORIES = {
  database: { label: 'Database Error', icon: 'Database', color: 'red' },
  api: { label: 'API Error', icon: 'Globe', color: 'orange' },
  auth: { label: 'Authentication Error', icon: 'Shield', color: 'red' },
  permission: { label: 'Permission Error', icon: 'Lock', color: 'amber' },
  validation: { label: 'Validation Error', icon: 'AlertCircle', color: 'yellow' },
  network: { label: 'Network Error', icon: 'WifiOff', color: 'gray' },
  timeout: { label: 'Timeout Error', icon: 'Clock', color: 'orange' },
  firebase: { label: 'Firebase Error', icon: 'Flame', color: 'amber' },
  brevo: { label: 'Brevo Error', icon: 'Mail', color: 'blue' },
  redis: { label: 'Redis Error', icon: 'Zap', color: 'red' },
  supabase: { label: 'Supabase Error', icon: 'Database', color: 'green' },
  prisma: { label: 'Prisma Error', icon: 'Database', color: 'purple' },
  unknown: { label: 'Unknown Error', icon: 'HelpCircle', color: 'gray' },
  frontend: { label: 'Frontend Error', icon: 'Monitor', color: 'red' },
  upload: { label: 'Upload Error', icon: 'Upload', color: 'orange' },
} as const;

export type ErrorCategoryType = keyof typeof ERROR_CATEGORIES;

// ============================================================
// ID GENERATION
// ============================================================

/**
 * Generate a request ID in the format `REQ-XXXXXXXX`.
 * Uses 8 random hex characters, uppercase.
 */
export function generateRequestId(): string {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase(),
  ).join('');
  return `REQ-${hex}`;
}

/**
 * Generate an error reference in the format `ERR-YYYYMMDD-XXXX`.
 * Uses today's date and 4 random hex characters, uppercase.
 */
export function generateErrorRef(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const hex = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase(),
  ).join('');
  return `ERR-${date}-${hex}`;
}

// ============================================================
// ERROR CATEGORIZATION
// ============================================================

/** Known Prisma error code patterns */
const PRISMA_ERROR_CODES = new Set([
  'P2001', 'P2002', 'P2003', 'P2004', 'P2005', 'P2006', 'P2007',
  'P2008', 'P2009', 'P2010', 'P2011', 'P2012', 'P2013', 'P2014',
  'P2015', 'P2016', 'P2017', 'P2018', 'P2019', 'P2020', 'P2021',
  'P2022', 'P2023', 'P2024', 'P2025', 'P2026', 'P2027', 'P2028',
  'P2029', 'P2030', 'P2031', 'P2032', 'P2033', 'P2034', 'P2035',
  'P2036', 'P2037', 'P2038', 'P2039', 'P2040', 'P2041', 'P2042',
  'P2043', 'P2044', 'P2045',
]);

/** Patterns that indicate a network-level failure */
const NETWORK_PATTERNS = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ENETUNREACH',
  'EPIPE',
  'fetch failed',
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
  'net::ERR_',
  'socket hang up',
  'unable to connect',
  'could not connect',
];

/** Patterns that indicate a timeout */
const TIMEOUT_PATTERNS = [
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'timeout',
  'Timeout',
  'timed out',
  'aborted',
  'AbortError',
  'request timeout',
  'Request timeout',
  'DEADLINE_EXCEEDED',
];

/** Patterns that indicate an authentication failure */
const AUTH_PATTERNS = [
  '401',
  'unauthorized',
  'Unauthorized',
  'jwt',
  'JWT',
  'token expired',
  'Token expired',
  'invalid token',
  'Invalid token',
  'authentication failed',
  'Authentication failed',
  'not authenticated',
  'session expired',
  'Session expired',
  'UNAUTHORIZED',
];

/** Patterns that indicate a permission failure */
const PERMISSION_PATTERNS = [
  '403',
  'forbidden',
  'Forbidden',
  'FORBIDDEN',
  'not authorized',
  'access denied',
  'Access denied',
  'permission denied',
  'Permission denied',
  'insufficient permissions',
  'Insufficient permissions',
];

/** Patterns that indicate a validation failure */
const VALIDATION_PATTERNS = [
  '400',
  'ZodError',
  'validation',
  'Validation',
  'required field',
  'invalid input',
  'Invalid input',
  'invalid type',
  'Invalid type',
  'parse error',
  'Parse error',
  'required but missing',
  'too_small',
  'too_big',
  'invalid_enum_value',
  'unrecognized_keys',
];

/** Patterns that indicate a Supabase error */
const SUPABASE_PATTERNS = [
  'supabase',
  'Supabase',
  'SUPABASE',
  'pgcode',
  'PG::Error',
  'relation ',
  'column ',
  'does not exist',
  'duplicate key value violates unique constraint',
  'foreign key constraint',
  'violates foreign key',
  'violates not-null constraint',
  'could not find the table',
  'schema cache',
];

/** Patterns that indicate a Firebase error */
const FIREBASE_PATTERNS = [
  'firebase',
  'Firebase',
  'FIREBASE',
  'auth/',
  'firestore',
  'FirebaseError',
  'storage/',
];

/** Patterns that indicate a Brevo/email error */
const BREVO_PATTERNS = [
  'brevo',
  'Brevo',
  'BREVO',
  'sendinblue',
  'Sendinblue',
  'smtp',
  'SMTP',
  'email service',
  'email_provider',
];

/** Patterns that indicate a Redis error */
const REDIS_PATTERNS = [
  'redis',
  'Redis',
  'REDIS',
  'ECONNREFUSED 6379',
  'NR_CLOSED',
  'LOADING',
  'READONLY',
  'MASTERDOWN',
  'NOPERM',
];

/**
 * Extract the error message string from any error type.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    // Handle nested error objects (e.g., { error: { message: '...' } })
    if (obj.error && typeof obj.error === 'object') {
      const nested = obj.error as Record<string, unknown>;
      if (typeof nested.message === 'string') return nested.message;
    }
  }
  return String(error);
}

/**
 * Check if a string matches any of the given patterns.
 */
function matchesAny(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
}

/**
 * Smart error categorization based on error content and context.
 *
 * Checks in priority order:
 * 1. Prisma error codes → 'prisma' (with DB fallback)
 * 2. Supabase error patterns → 'supabase'
 * 3. Network errors → 'network'
 * 4. Timeout errors → 'timeout'
 * 5. Auth errors (401, JWT, token) → 'auth'
 * 6. Permission errors (403) → 'permission'
 * 7. Validation errors (400, ZodError) → 'validation'
 * 8. Firebase patterns → 'firebase'
 * 9. Brevo/email patterns → 'brevo'
 * 10. Redis patterns → 'redis'
 * 11. Upload context → 'upload'
 * 12. API context → 'api'
 * 13. Default → 'unknown'
 */
export function categorizeError(
  error: unknown,
  context?: { endpoint?: string; method?: string },
): ErrorCategoryType {
  const message = getErrorMessage(error);
  const fullText = `${message} ${JSON.stringify(error)}`.toLowerCase();

  // 1. Prisma errors — check for P-codes first
  const prismaCodeMatch = fullText.match(/\b(P\d{4})\b/);
  if (prismaCodeMatch) {
    const code = prismaCodeMatch[1];
    if (PRISMA_ERROR_CODES.has(code)) {
      // P2002 (unique constraint), P2025 (not found) are very common
      return 'prisma';
    }
  }
  // Check for "PrismaClient" or "prisma." in the error
  if (
    fullText.includes('prisma') ||
    fullText.includes('@prisma') ||
    fullText.includes('prismaclient')
  ) {
    return 'prisma';
  }

  // 2. Supabase errors
  if (matchesAny(message, SUPABASE_PATTERNS)) {
    return 'supabase';
  }

  // 3. Network errors (check before timeout since timeout messages may overlap)
  if (matchesAny(message, NETWORK_PATTERNS)) {
    return 'network';
  }

  // 4. Timeout errors
  if (matchesAny(message, TIMEOUT_PATTERNS)) {
    return 'timeout';
  }

  // 5. Auth errors
  if (matchesAny(message, AUTH_PATTERNS)) {
    return 'auth';
  }

  // 6. Permission errors (check after auth since 403 patterns are more specific)
  if (matchesAny(message, PERMISSION_PATTERNS)) {
    return 'permission';
  }

  // 7. Validation errors
  if (matchesAny(message, VALIDATION_PATTERNS)) {
    return 'validation';
  }

  // 8. Firebase errors
  if (matchesAny(message, FIREBASE_PATTERNS)) {
    return 'firebase';
  }

  // 9. Brevo/email errors
  if (matchesAny(message, BREVO_PATTERNS)) {
    return 'brevo';
  }

  // 10. Redis errors
  if (matchesAny(message, REDIS_PATTERNS)) {
    return 'redis';
  }

  // 11. Upload — check error message or context
  if (
    message.toLowerCase().includes('upload') ||
    message.toLowerCase().includes('file size') ||
    message.toLowerCase().includes('multipart') ||
    (context?.endpoint && context.endpoint.toLowerCase().includes('upload'))
  ) {
    return 'upload';
  }

  // 12. API context
  if (context?.endpoint?.startsWith('/api/')) {
    return 'api';
  }

  // 13. Default
  return 'unknown';
}

// ============================================================
// ERROR CODE EXTRACTION
// ============================================================

/**
 * Extract a technical error code from any error object.
 * Recognizes: Prisma P-codes, HTTP status codes as codes,
 * network error codes (ECONNREFUSED, ETIMEDOUT, etc.).
 */
export function extractErrorCode(error: unknown): string | null {
  if (!error) return null;

  const message = getErrorMessage(error);
  const fullText = `${message} ${JSON.stringify(error)}`;

  // Prisma P-code (e.g., P2002)
  const prismaMatch = fullText.match(/\b(P\d{4})\b/);
  if (prismaMatch && PRISMA_ERROR_CODES.has(prismaMatch[1])) {
    return prismaMatch[1];
  }

  // Node.js / OS error codes (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, etc.)
  const nodeErrMatch = fullText.match(/\b(E[A-Z]{3,})\b/);
  if (nodeErrMatch) {
    return nodeErrMatch[1];
  }

  // HTTP status codes used as error codes in strings (e.g., "Error 429: ...")
  const httpCodeMatch = fullText.match(/\b([45]\d{2})\b/);
  if (httpCodeMatch) {
    return httpCodeMatch[1];
  }

  // Firebase error codes (e.g., "auth/user-not-found")
  const firebaseMatch = fullText.match(/\b(auth\/[a-z-]+)\b/);
  if (firebaseMatch) {
    return firebaseMatch[1];
  }

  // ZodError validation issues (e.g., "too_small", "invalid_enum_value")
  const zodMatch = fullText.match(/\b(too_small|too_big|invalid_type|invalid_enum_value|invalid_string|invalid_literal|unrecognized_keys|invalid_union|invalid_date)\b/);
  if (zodMatch) {
    return zodMatch[1];
  }

  // Check for explicit code property on error object
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.code === 'string' && obj.code.length <= 50) {
      return obj.code;
    }
    // Nested error code (e.g., { error: { code: 'P2002' } })
    if (obj.error && typeof obj.error === 'object') {
      const nested = obj.error as Record<string, unknown>;
      if (typeof nested.code === 'string' && nested.code.length <= 50) {
        return nested.code;
      }
    }
  }

  return null;
}

// ============================================================
// HTTP STATUS EXTRACTION
// ============================================================

/**
 * Extract an HTTP status code from an error object.
 * Checks `status`, `statusCode`, and standard error code properties.
 */
export function extractHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const obj = error as Record<string, unknown>;

  // Direct status properties
  if (typeof obj.status === 'number' && obj.status >= 100 && obj.status < 600) {
    return obj.status;
  }
  if (typeof obj.statusCode === 'number' && obj.statusCode >= 100 && obj.statusCode < 600) {
    return obj.statusCode;
  }

  // Check nested error object
  if (obj.error && typeof obj.error === 'object') {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.status === 'number' && nested.status >= 100 && nested.status < 600) {
      return nested.status;
    }
    if (typeof nested.statusCode === 'number' && nested.statusCode >= 100 && nested.statusCode < 600) {
      return nested.statusCode;
    }
  }

  return null;
}

// ============================================================
// USER-FRIENDLY MESSAGE MAPPING
// ============================================================

/** Mapping of technical error codes to user-friendly messages */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Prisma errors
  P2002: 'Unable to save because a duplicate record already exists.',
  P2025: 'The requested record was not found. It may have been deleted.',
  P2003: 'Cannot complete this action because a related record is missing.',
  P2001: 'A required record could not be found in the database.',
  P2004: 'A constraint on the database was violated.',
  P2005: 'The value provided for a field is invalid.',
  P2006: 'The value provided is not valid for the expected type.',
  P2007: 'Data validation error.',
  P2008: 'Failed to process the request due to a database error.',
  P2010: 'Raw query failed to execute.',
  P2011: 'Null constraint violation — a required field is missing.',
  P2012: 'A required field is missing.',
  P2013: 'A required field is missing from the input.',
  P2014: 'The change you are trying to make would violate a relation constraint.',
  P2015: 'A related record could not be found.',
  P2016: 'Query interpretation error.',
  P2017: 'The records for this relation are connected.',
  P2018: 'The required connected records were not found.',
  P2019: 'Input error.',
  P2021: 'The table does not exist in the database.',
  P2022: 'A required column is missing from the database.',
  P2023: 'Inconsistent column data.',
  P2024: 'A timeout occurred while connecting to the database.',
  P2028: 'Transaction API error.',
  P2030: 'Failed to find a unique constraint in the database.',
  P2033: 'A foreign key constraint was violated.',
  P2034: 'Transaction failed due to a write conflict.',
  P2035: 'A referential constraint was violated.',
  P2037: 'Transaction already closed.',

  // Network / system errors
  ECONNREFUSED: 'The server is temporarily unavailable. Please try again shortly.',
  'fetch failed': 'The server is temporarily unavailable. Please try again shortly.',
  'Failed to fetch': 'The server is temporarily unavailable. Please try again shortly.',
  ECONNRESET: 'The connection was lost. Please check your internet and try again.',
  ENOTFOUND: 'The server could not be reached. Please check your internet connection.',
  ENETUNREACH: 'No internet connection available. Please check your network settings.',

  // Timeout errors
  ETIMEDOUT: 'The request took too long. Please try again.',
  EHOSTUNREACH: 'The server is not reachable. Please check your connection and try again.',
  AbortError: 'The request was cancelled because it took too long. Please try again.',
  DEADLINE_EXCEEDED: 'The operation timed out. Please try again.',

  // HTTP status code messages
  '400': 'The request was not valid. Please check your input and try again.',
  '401': 'Your session has expired. Please sign in again.',
  '403': "You don't have permission to perform this action.",
  '404': 'The requested resource was not found.',
  '405': 'This action is not supported.',
  '408': 'The request took too long. Please try again.',
  '409': 'There was a conflict. Please refresh and try again.',
  '413': 'The data you are sending is too large.',
  '422': 'The data provided is not valid. Please check your input.',
  '429': 'Too many requests. Please wait a moment and try again.',
  '500': 'Something went wrong on our end. Please try again.',
  '502': 'The server is temporarily unavailable. Please try again shortly.',
  '503': 'The service is temporarily unavailable. Please try again shortly.',
  '504': 'The server took too long to respond. Please try again.',

  // Zod validation errors
  too_small: 'A required value is too short or too small.',
  too_big: 'A value exceeds the maximum allowed limit.',
  invalid_type: 'An invalid value was provided. Please check your input.',
  invalid_enum_value: 'The selected option is not valid.',
  invalid_string: 'The text format is not valid.',
  invalid_literal: 'An unexpected value was provided.',
  unrecognized_keys: 'Unexpected data was included in the request.',
  invalid_union: 'The provided data does not match the expected format.',
  invalid_date: 'The date provided is not valid.',
};

/** Mapping of error categories to default user-friendly messages */
const CATEGORY_DEFAULT_MESSAGES: Record<ErrorCategoryType, string> = {
  database: 'A database error occurred. Please try again.',
  api: "We couldn't complete your request. Please try again.",
  auth: 'Your session has expired. Please sign in again.',
  permission: "You don't have permission to perform this action.",
  validation: 'Please check your input and correct any errors.',
  network: 'Unable to connect to the server. Please check your internet connection and try again.',
  timeout: 'The request took too long. Please try again.',
  firebase: 'A service error occurred. Please try again.',
  brevo: 'An email service error occurred. Please try again.',
  redis: 'A cache service error occurred. Please try again.',
  supabase: 'A database service error occurred. Please try again.',
  prisma: 'A database error occurred. Please try again.',
  unknown: "We couldn't complete your request. Please try again.",
  frontend: "We couldn't complete your request. Please try again.",
  upload: 'File upload failed. Please try again or use a different file.',
};

/**
 * Get a user-friendly message for a given error category and code.
 *
 * Priority:
 * 1. Exact match on error code (P2002, ECONNREFUSED, etc.)
 * 2. Category default message
 * 3. Provided defaultMessage
 * 4. Generic fallback
 */
export function getFriendlyMessage(
  category: ErrorCategoryType,
  errorCode: string | null,
  defaultMessage?: string,
): string {
  // 1. Exact error code match
  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
    return ERROR_CODE_MESSAGES[errorCode];
  }

  // 2. Category default
  if (CATEGORY_DEFAULT_MESSAGES[category]) {
    return CATEGORY_DEFAULT_MESSAGES[category];
  }

  // 3. Provided default
  if (defaultMessage) {
    return defaultMessage;
  }

  // 4. Generic fallback
  return "We couldn't complete your request. Please try again.";
}

// ============================================================
// ERROR SANITIZATION
// ============================================================

/** Fields that are safe to show to non-admin users */
const SAFE_FIELDS = new Set([
  'errorRef',
  'requestId',
  'category',
  'errorCode',
  'message',
  'userMessage',
  'module',
  'apiEndpoint',
  'httpMethod',
  'httpStatus',
  'duration',
  'browser',
  'device',
  'pageUrl',
  'userId',
  'userName',
  'userRole',
  'timestamp',
  'severity',
]);

/**
 * Patterns that should be stripped from error data for non-admin users.
 * These could leak sensitive information.
 */
const SANITIZE_PATTERNS: RegExp[] = [
  /stack\s*trace/i,
  /at\s+\S+\s+\(.*\d+:\d+\)/,        // "at functionName (file:line:col)"
  /sql/i,
  /select\s+.+\s+from/i,
  /insert\s+into/i,
  /update\s+.+\s+set/i,
  /delete\s+from/i,
  /create\s+table/i,
  /alter\s+table/i,
  /drop\s+table/i,
  /\/(home|usr|var|etc|opt|tmp|app|src|node_modules)\//i,  // File paths
  /\b\w+:\w+@[^\s]+/i,                // connection strings (user:pass@host)
  /mongodb(\+srv)?:\/\//i,
  /postgres(ql)?:\/\//i,
  /mysql:\/\//i,
  /redis:\/\//i,
  /supabase\.co/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /bearer\s+[a-zA-Z0-9._-]+/i,        // JWT tokens
  /eyJ[a-zA-Z0-9._-]+/i,             // JWT format
  /private[_-]?key/i,
  /BEGIN PGP/i,
];

/**
 * Sanitize an error info object for non-super_admin users.
 *
 * Removes:
 * - Stack traces
 * - SQL queries
 * - File system paths
 * - Connection strings
 * - API keys / secrets
 * - JWT tokens
 * - Passwords
 * - Internal server paths
 *
 * Returns only fields in the SAFE_FIELDS allow-list.
 */
export function sanitizeForNonAdmin(
  errorInfo: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(errorInfo)) {
    // Only include whitelisted fields
    if (!SAFE_FIELDS.has(key)) continue;

    // Skip null/undefined values
    if (value == null) continue;

    // For string values, check for sensitive patterns
    if (typeof value === 'string') {
      const isSensitive = SANITIZE_PATTERNS.some((pattern) =>
        pattern.test(value),
      );
      if (isSensitive) {
        // Keep the field but redact the value
        sanitized[key] = '[REDACTED]';
        continue;
      }
      // Truncate very long strings
      if (value.length > 500) {
        sanitized[key] = value.substring(0, 500);
        continue;
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
}

// ============================================================
// MODULE DETECTION
// ============================================================

/**
 * Extract a human-readable module name from an API endpoint or page URL.
 *
 * Examples:
 *   `/api/complaints`         → "Complaints"
 *   `/api/invoices/create`    → "Invoices"
 *   `/dashboard`              → "Dashboard"
 *   `/settings/profile`       → "Settings"
 *   `/api/`                   → null
 *   undefined                 → null
 */
export function detectModule(
  endpoint?: string,
  pageUrl?: string,
): string | null {
  const url = endpoint || pageUrl;
  if (!url || typeof url !== 'string') return null;

  // Extract the path portion (ignore query strings and hashes)
  const pathname = url.split(/[?#]/)[0];

  // Remove /api prefix if present
  const segments = pathname
    .replace(/^\/api\/?/, '/')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) return null;

  // Take the first meaningful segment as the module
  const moduleSegment = segments[0];

  // Format: capitalize first letter, handle hyphens/underscores
  return moduleSegment
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}