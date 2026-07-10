'use client';

import {
  useState,
  useCallback,
  useMemo,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Home,
  ChevronDown,
  ChevronRight,
  Copy,
  Bug,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Badge } from '@/shared/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { useAuthStore } from '@/app-shell/store';

// ============================================================
// TYPES
// ============================================================

export type ErrorCategory =
  | 'frontend'
  | 'backend'
  | 'network'
  | 'upload'
  | 'database'
  | 'api'
  | 'auth'
  | 'permission'
  | 'validation'
  | 'timeout'
  | 'firebase'
  | 'brevo'
  | 'redis'
  | 'supabase'
  | 'prisma'
  | 'unknown';

export interface DebugInfo {
  requestId?: string;
  errorRef?: string;
  module?: string;
  apiEndpoint?: string;
  httpMethod?: string;
  httpStatus?: number;
  duration?: number;
  errorCode?: string;
  errorType?: string;
  stackTrace?: string;
  requestBody?: string;
  responseBody?: string;
  headers?: string;
  dbType?: string; // "Supabase PostgreSQL" or "SQLite"
}

export interface ErrorInfo {
  title?: string;
  message: string;
  category: ErrorCategory;
  statusCode?: number;
  stackTrace?: string;
  retry?: () => void;
  debug?: DebugInfo; // NEW: technical debug info
  errorRef?: string; // NEW: ERR-20260710-ABCD
  userMessage?: string; // NEW: friendly message for non-admin
  validationErrors?: Record<string, string>; // NEW: field-level errors
}

// ============================================================
// HELPERS
// ============================================================

/** Map HTTP status codes to human-readable labels */
function httpStatusLabel(status: number): string {
  if (status >= 500) return 'Server Error';
  if (status >= 400) return 'Client Error';
  if (status >= 300) return 'Redirect';
  if (status >= 200) return 'Success';
  return 'Unknown';
}

/** Get current UTC timestamp string */
function nowUTC(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

/** Format duration in ms to human-readable */
function formatDuration(ms?: number): string | undefined {
  if (ms == null) return undefined;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================
// DEBUG PANEL (super_admin only)
// ============================================================

function DebugPanel({
  error,
}: {
  error: ErrorInfo;
}) {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<'debug' | 'bug' | null>(null);

  const debug = error.debug;

  const handleCopyDebug = useCallback(async () => {
    if (!debug) return;
    const lines: string[] = [];
    lines.push(`Time: ${nowUTC()}`);
    if (debug.module) lines.push(`Module: ${debug.module}`);
    if (debug.apiEndpoint) {
      const method = debug.httpMethod ? `${debug.httpMethod} ` : '';
      lines.push(`Endpoint: ${method}${debug.apiEndpoint}`);
    }
    if (debug.httpStatus != null) lines.push(`Status: ${debug.httpStatus}`);
    lines.push(`Error: ${error.message}`);
    if (debug.errorCode) lines.push(`Code: ${debug.errorCode}`);
    if (user?.name) lines.push(`User: ${user.name}`);
    if (user?.role) lines.push(`Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}`);
    if (debug.requestId) lines.push(`Request ID: ${debug.requestId}`);
    if (error.errorRef) lines.push(`Reference: ${error.errorRef}`);

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied('debug');
    setTimeout(() => setCopied(null), 2000);
  }, [debug, error, user]);

  const handleCopyBug = useCallback(async () => {
    if (!debug) return;
    const lines: string[] = ['🐛 Bug Report'];
    if (debug.module) lines.push(`Module: ${debug.module}`);
    if (debug.apiEndpoint) {
      const method = debug.httpMethod ? `${debug.httpMethod} ` : '';
      lines.push(`Endpoint: ${method}${debug.apiEndpoint}`);
    }
    lines.push(`Error: ${error.message}`);
    if (debug.errorCode) lines.push(`Code: ${debug.errorCode}`);
    if (debug.requestId) lines.push(`Request ID: ${debug.requestId}`);

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied('bug');
    setTimeout(() => setCopied(null), 2000);
  }, [debug, error]);

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="mt-4"
    >
      {/* Trigger */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Technical Details
          </button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyDebug}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <Copy className="h-3 w-3" />
            {copied === 'debug' ? 'Copied!' : '📋 Copy'}
          </button>
          <button
            type="button"
            onClick={handleCopyBug}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <Bug className="h-3 w-3" />
            {copied === 'bug' ? 'Copied!' : '🐞 Report Bug'}
          </button>
        </div>
      </div>

      {/* Content */}
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 overflow-hidden"
        >
          <div className="rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 p-3">
            <div className="space-y-1.5 font-mono text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              {/* Module */}
              {debug.module && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">Module:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{debug.module}</span>
                </div>
              )}

              {/* API Endpoint */}
              {debug.apiEndpoint && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">API:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {debug.httpMethod ? (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400">{debug.httpMethod}</span>{' '}
                      </>
                    ) : null}
                    {debug.apiEndpoint}
                  </span>
                </div>
              )}

              {/* HTTP Status */}
              {debug.httpStatus != null && (
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">Status:</span>
                  <Badge variant={debug.httpStatus >= 500 ? 'destructive' : 'secondary'} className="font-mono text-[11px]">
                    {debug.httpStatus} {httpStatusLabel(debug.httpStatus)}
                  </Badge>
                </div>
              )}

              {/* Error Code */}
              {debug.errorCode && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">Error Code:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{debug.errorCode}</span>
                </div>
              )}

              {/* Database Type */}
              {debug.dbType && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">Database:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{debug.dbType}</span>
                </div>
              )}

              {/* Error Message */}
              <div className="flex gap-2">
                <span className="shrink-0 text-gray-400 dark:text-gray-500">Message:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{error.message}</span>
              </div>

              {/* Request ID */}
              {debug.requestId && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">Request ID:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{debug.requestId}</span>
                </div>
              )}

              {/* Duration */}
              {debug.duration != null && (
                <div className="flex gap-2">
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">Duration:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatDuration(debug.duration)}</span>
                </div>
              )}

              {/* Timestamp */}
              <div className="flex gap-2">
                <span className="shrink-0 text-gray-400 dark:text-gray-500">Time:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{nowUTC()}</span>
              </div>

              {/* Category badge */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-gray-400 dark:text-gray-500">Category:</span>
                <Badge variant="outline" className="font-mono text-[11px] capitalize">
                  {error.category.replace('_', ' ')}
                </Badge>
              </div>

              {/* Validation Errors */}
              {error.validationErrors && Object.keys(error.validationErrors).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-gray-400 dark:text-gray-500 block mb-1.5">Validation Errors:</span>
                  <ul className="space-y-1">
                    {Object.entries(error.validationErrors).map(([field, msg]) => (
                      <li key={field} className="flex gap-2 text-red-600 dark:text-red-400">
                        <span className="font-semibold">{field}:</span>
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stack Trace (collapsed by default in debug) */}
              {(debug.stackTrace || error.stackTrace) && (
                <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-gray-400 dark:text-gray-500 block mb-1.5">Stack Trace:</span>
                  <pre className="max-h-32 overflow-y-auto text-[10px] leading-tight text-gray-500 dark:text-gray-500 whitespace-pre-wrap break-all">
                    {debug.stackTrace || error.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================
// ERROR MODAL COMPONENT
// ============================================================

export function ErrorModal({
  error,
  onDismiss,
  onGoBack,
  onGoHome,
}: {
  error: ErrorInfo;
  onDismiss?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
}) {
  const { user } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const [retrying, setRetrying] = useState(false);
  const isDark = resolvedTheme === 'dark';

  // Determine if debug panel should be shown
  const showDebug = useMemo(() => {
    if (process.env.NODE_ENV === 'development') return true;
    return user?.role === 'super_admin';
  }, [user?.role]);

  // Use user-friendly message for non-admin if available
  const displayMessage = useMemo(() => {
    if (showDebug) return error.message;
    return error.userMessage || error.message;
  }, [error.message, error.userMessage, showDebug]);

  // Use error title, or a category-based fallback
  const displayTitle = useMemo(() => {
    if (error.title) return error.title;
    return 'Something Went Wrong';
  }, [error.title]);

  const handleRetry = useCallback(async () => {
    if (error.retry) {
      setRetrying(true);
      try {
        await error.retry();
      } catch {
        /* keep modal open — retry failed */
      } finally {
        setRetrying(false);
      }
    } else {
      window.location.reload();
    }
  }, [error]);

  const handleGoBack = useCallback(() => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.history.back();
    }
  }, [onGoBack]);

  const handleGoHome = useCallback(() => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  }, [onGoHome]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          data-theme={isDark ? 'dark' : 'light'}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`
            relative w-full max-w-md rounded-2xl p-6 shadow-2xl
            bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
            border border-gray-200/60 dark:border-white/10
          `}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
          aria-describedby="error-modal-desc"
        >
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>

          {/* Title */}
          <h2
            id="error-modal-title"
            className="text-center text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {displayTitle}
          </h2>

          {/* Message */}
          <p
            id="error-modal-desc"
            className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400"
          >
            {displayMessage}
          </p>

          {/* Super Admin Debug Panel */}
          {showDebug && error.debug && <DebugPanel error={error} />}

          {/* Reference ID */}
          {error.errorRef && (
            <div className="mt-4 text-center">
              <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                Reference: {error.errorRef}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className={`
                inline-flex items-center justify-center gap-2 rounded-xl
                bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white
                shadow-sm transition-all duration-200
                hover:bg-emerald-700 active:scale-[0.97]
                disabled:opacity-60 disabled:cursor-not-allowed
              `}
            >
              <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying…' : 'Try Again'}
            </button>

            <button
              onClick={handleGoBack}
              className={`
                inline-flex items-center justify-center gap-2 rounded-xl
                border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800
                px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300
                transition-all duration-200
                hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.97]
              `}
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>

          {/* Optional: Return Home */}
          <div className="mt-3 text-center">
            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <Home className="h-3 w-3" />
              Return Home
            </button>
          </div>

          {/* Branding */}
          <p className="mt-4 text-center text-[10px] text-gray-300 dark:text-gray-600">
            MOHD.HMS ENTERPRISE
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// FULL-PAGE ERROR (for complete app crashes)
// ============================================================

export function FullPageError({
  errorRef,
}: {
  errorRef?: string;
}) {
  const handleRefresh = useCallback(() => window.location.reload(), []);
  const handleHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md text-center"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20 shadow-lg">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Service Temporarily Unavailable
        </h1>

        <p className="mt-3 text-gray-600 dark:text-gray-400">
          We&apos;re working to restore service.
          <br />
          Please try again shortly.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 active:scale-[0.97]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </button>

          <button
            onClick={handleHome}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.97]"
          >
            <Home className="h-4 w-4" />
            Return Home
          </button>
        </div>

        {/* Error Reference */}
        {errorRef && (
          <p className="mt-6 text-[11px] font-mono text-gray-400 dark:text-gray-500">
            Reference: {errorRef}
          </p>
        )}

        {/* Branding */}
        <p className="mt-10 text-xs text-gray-300 dark:text-gray-600">
          MOHD.HMS ENTERPRISE
        </p>
      </motion.div>
    </div>
  );
}