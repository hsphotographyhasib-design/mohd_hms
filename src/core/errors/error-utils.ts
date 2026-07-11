/**
 * Client-side utility for logging errors to the server.
 *
 * Enhanced to use the enterprise error service for:
 * - Smart error categorization (13+ categories)
 * - Request ID and error reference generation
 * - User-friendly message mapping
 * - Error sanitization for non-admin users
 * - Module detection from URLs
 *
 * - In dev, errors are logged to console and the errorRef is returned.
 * - In production, errors are POST'd to /api/error-logs (fire-and-forget).
 * - Silently fails if the logging endpoint itself is unreachable.
 */

import {
  generateRequestId,
  generateErrorRef,
  categorizeError,
  extractErrorCode,
  extractHttpStatus,
  getFriendlyMessage,
  sanitizeForNonAdmin,
  detectModule,
  type ErrorCategoryType,
} from './error-service';

// ============================================================
// LOG ERROR TO SERVER
// ============================================================

export interface LogErrorOptions {
  /** The raw error object for analysis (auto-categorization, code extraction) */
  error?: unknown;
  /** Override auto-detected category */
  category?: ErrorCategoryType;
  /** Human-readable error description (for logging) */
  message: string;
  /** Stack trace string (if already extracted) */
  stackTrace?: string;
  /** HTTP status code (if known) */
  statusCode?: number;
  /** Page URL where the error occurred */
  pageUrl?: string;
  /** Module name (auto-detected from endpoint/pageUrl if not provided) */
  module?: string;
  /** API endpoint that caused the error */
  apiEndpoint?: string;
  /** HTTP method (GET, POST, etc.) */
  httpMethod?: string;
  /** Request duration in ms */
  duration?: number;
  /** Request body (only stored in development) */
  requestBody?: unknown;
  /** Response body (only stored in development) */
  responseBody?: unknown;
}

/**
 * Log an error to the server's error-logging endpoint.
 *
 * Returns the generated `errorRef` string (e.g., "ERR-20260710-ABCD")
 * so callers can display it to the user for support reference.
 */
export function logErrorToServer(opts: LogErrorOptions): string {
  // Generate IDs
  const errorRef = generateErrorRef();
  const requestId = generateRequestId();

  // Auto-categorize if not provided
  const category: ErrorCategoryType =
    opts.category ||
    categorizeError(opts.error, {
      endpoint: opts.apiEndpoint,
      method: opts.httpMethod,
    });

  // Extract error metadata from the raw error
  const errorCode = extractErrorCode(opts.error);
  const httpStatus = opts.statusCode || extractHttpStatus(opts.error);
  const userMessage = getFriendlyMessage(category, errorCode);
  const detectedModule = opts.module || detectModule(opts.apiEndpoint, opts.pageUrl);

  // Get user info from auth store (try/catch since this runs in browser)
  let userId: string | undefined;
  let userName: string | undefined;
  let userRole: string | undefined;
  let authToken: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require('@/app-shell/store');
    const state = useAuthStore.getState?.();
    if (state?.user) {
      userId = state.user.id;
      userName = state.user.name;
      userRole = state.user.role;
    }
    if (state?.token) {
      authToken = state.token;
    }
  } catch {
    /* auth store not available */
  }

  // Build sanitized payload
  const payload = sanitizeForNonAdmin({
    errorRef,
    requestId,
    category,
    errorCode,
    message: opts.message,
    userMessage,
    module: detectedModule,
    apiEndpoint: opts.apiEndpoint,
    httpMethod: opts.httpMethod,
    httpStatus,
    duration: opts.duration,
    stackTrace: opts.stackTrace,
    browser:
      typeof navigator !== 'undefined'
        ? navigator.userAgent?.substring(0, 200)
        : undefined,
    device:
      typeof window !== 'undefined'
        ? `${window.screen.width}x${window.screen.height}`
        : undefined,
    pageUrl:
      opts.pageUrl ||
      (typeof window !== 'undefined' ? window.location.href : undefined),
    userId,
    userName,
    userRole,
    // Store raw request/response bodies ONLY in development
    ...(process.env.NODE_ENV === 'development'
      ? {
          requestBody: JSON.stringify(opts.requestBody)?.substring(0, 2000),
          responseBody: JSON.stringify(opts.responseBody)?.substring(0, 2000),
        }
      : {}),
  });

  // Always log to console in development for visibility
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${errorRef}]`, category, opts.message);
  }

  // Fire-and-forget POST to /api/error-logs — never block the UI
  // Works in BOTH development and production so the Errors tab always has data
  // Includes Authorization header so the server can extract tenantId from JWT
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    fetch('/api/error-logs', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true, // survives page unload
    }).catch(() => {
      /* Swallow — logging must never cause cascading errors */
    });
  } catch {
    /* Swallow */
  }

  return errorRef;
}

// ============================================================
// SANITIZE ERROR FOR DISPLAY
// ============================================================

/**
 * Sanitize an error for display to the user.
 *
 * Strips anything technical and maps known error codes
 * to user-friendly messages via the error service.
 */
export function sanitizeError(error: unknown): string {
  // If it's a string, truncate it
  if (typeof error === 'string') {
    const trimmed = error.length > 200 ? error.substring(0, 200) : error;
    // Try to categorize the string error for a friendly message
    const category = categorizeError(error);
    const code = extractErrorCode(error);
    return getFriendlyMessage(category, code, trimmed);
  }

  // If it's an Error object or similar, extract and sanitize
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // Check for a user-friendly message already on the object
    if (typeof obj.userMessage === 'string') return obj.userMessage;

    // Try to get a friendly message from the error's content
    const category = categorizeError(error);
    const code = extractErrorCode(error);
    const httpStatus = extractHttpStatus(error);
    const message =
      typeof obj.message === 'string'
        ? obj.message.substring(0, 200)
        : typeof obj.error === 'string'
          ? obj.error.substring(0, 200)
          : undefined;

    // If we have a code or status, try friendly message mapping
    if (code || httpStatus) {
      return getFriendlyMessage(category, code, message);
    }

    // Fall back to the original message if it's short enough
    if (message && message.length <= 100) {
      return message;
    }

    // Use category default
    return getFriendlyMessage(category, code);
  }

  return getFriendlyMessage('unknown', null);
}