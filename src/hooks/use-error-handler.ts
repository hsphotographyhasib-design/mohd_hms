'use client';

import { useState, useCallback } from 'react';
import { type ErrorInfo, type ErrorCategory } from '@/components/error/error-ui';
import { logErrorToServer } from '@/lib/error-utils';

// ============================================================
// HOOK: useErrorHandler
// ============================================================

/**
 * Provides `showError()` and `clearError()` for imperative error display.
 *
 * Usage:
 *   const { showError, clearError, error } = useErrorHandler();
 *
 *   try { await apiCall(); } catch (e) { showError(e); }
 */
export function useErrorHandler() {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const showError = useCallback(
    (err: unknown, opts?: { category?: ErrorCategory; retry?: () => void; title?: string }) => {
      const category = opts?.category || guessCategory(err);
      const message = getUserMessage(err, category);

      // Log to server
      logErrorToServer({
        category,
        message: err instanceof Error ? err.message : String(err),
        stackTrace: err instanceof Error ? err.stack : undefined,
        statusCode: extractStatus(err),
      });

      setError({
        title: opts?.title,
        message,
        category,
        retry: opts?.retry,
      });
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { showError, clearError, error };
}

// ============================================================
// HELPER: WRAP API CALL
// ============================================================

/**
 * Wraps an async function with error handling — shows the error modal on failure.
 *
 * Usage:
 *   const { wrapApi } = useErrorHandler();
 *   const data = await wrapApi(fetch('/api/...'));
 */
export function useApiHandler() {
  const { showError, clearError, error } = useErrorHandler();

  const wrapApi = useCallback(
    async <T>(promise: Promise<T>, opts?: { category?: ErrorCategory; retry?: () => void }): Promise<T | null> => {
      try {
        const result = await promise;
        return result;
      } catch (err) {
        showError(err, opts);
        return null;
      }
    },
    [showError],
  );

  return { wrapApi, showError, clearError, error };
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function guessCategory(err: unknown): ErrorCategory {
  if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch'))) {
    return 'network';
  }
  const msg = String(err).toLowerCase();
  if (msg.includes('upload') || msg.includes('file') || msg.includes('multipart')) return 'upload';
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('abort')) return 'network';
  return 'backend';
}

function extractStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.status === 'number') return obj.status;
    // Some fetch wrappers put statusCode
    if (typeof obj.statusCode === 'number') return obj.statusCode;
  }
  return undefined;
}

const CATEGORY_MESSAGES: Record<ErrorCategory, string> = {
  frontend: "We couldn't complete your request right now.\nPlease try again in a few moments.",
  backend: "We couldn't complete your request right now.\nPlease try again in a few moments.",
  network: 'Unable to connect to the server.\nPlease check your internet connection and try again.',
  upload: 'File upload failed. Please try again or use a different file.',
};

function getUserMessage(err: unknown, category: ErrorCategory): string {
  // Check for a user-friendly message in common API error shapes
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.userMessage === 'string') return obj.userMessage;
    if (typeof obj.error === 'string' && obj.error.length < 100) return obj.error;
  }
  return CATEGORY_MESSAGES[category];
}