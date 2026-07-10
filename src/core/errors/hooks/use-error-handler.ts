'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  type ErrorInfo, type ErrorCategory,
  type DebugInfo 
} from '@/core/errors/components/error-ui';
import { logErrorToServer, type LogErrorOptions } from '@/core/errors/error-utils';
import { 
  categorizeError, 
  extractErrorCode, 
  extractHttpStatus,
  getFriendlyMessage,
  generateRequestId,
  generateErrorRef,
  detectModule,
  type ErrorCategoryType 
} from '@/core/errors/error-service';

export interface ApiCallOptions {
  category?: ErrorCategory;
  module?: string;
  endpoint?: string;
  method?: string;
  title?: string;
  retry?: () => void;
  requestBody?: unknown;
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const showError = useCallback(
    (err: unknown, opts?: ApiCallOptions) => {
      const category = (opts?.category || categorizeError(err, { endpoint: opts?.endpoint })) as ErrorCategory;
      const errorCode = extractErrorCode(err);
      const httpStatus = opts?.endpoint ? extractHttpStatus(err) : undefined;
      const moduleName = opts?.module || detectModule(opts?.endpoint);
      const userMessage = getFriendlyMessage(category, errorCode);

      // Extract validation errors if present
      let validationErrors: Record<string, string> | undefined;
      if (err && typeof err === 'object') {
        const obj = err as Record<string, unknown>;
        if (obj.validationErrors && typeof obj.validationErrors === 'object') {
          validationErrors = obj.validationErrors as Record<string, string>;
        } else if (obj.errors && typeof obj.errors === 'object' && !Array.isArray(obj.errors)) {
          validationErrors = obj.errors as Record<string, string>;
        }
      }

      const errorRef = generateErrorRef();
      const requestId = generateRequestId();

      // Log to server (returns errorRef)
      logErrorToServer({
        error: err,
        category,
        message: err instanceof Error ? err.message : String(err),
        stackTrace: err instanceof Error ? err.stack : undefined,
        statusCode: httpStatus,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        module: moduleName,
        apiEndpoint: opts?.endpoint,
        httpMethod: opts?.method,
        requestBody: opts?.requestBody,
      });

      setError({
        title: opts?.title,
        message: err instanceof Error ? err.message : String(err),
        userMessage,
        category,
        statusCode: httpStatus,
        retry: opts?.retry,
        errorRef,
        validationErrors,
        debug: {
          requestId,
          errorRef,
          module: moduleName || undefined,
          apiEndpoint: opts?.endpoint,
          httpMethod: opts?.method,
          httpStatus,
          errorCode,
          errorType: err instanceof Error ? err.constructor.name : undefined,
          stackTrace: process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
          dbType: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ? 'Supabase PostgreSQL' : undefined,
        },
      });
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { showError, clearError, error };
}

/**
 * Wraps an async function with error handling, timing, and retry.
 * 
 * Usage:
 *   const { wrapApi } = useApiHandler();
 *   const data = await wrapApi(
 *     fetch('/api/complaints', { method: 'POST', body: ... }),
 *     { module: 'Complaints', endpoint: '/api/complaints', method: 'POST', retry: () => refetch() }
 *   );
 */
export function useApiHandler() {
  const { showError, clearError, error } = useErrorHandler();

  const wrapApi = useCallback(
    async <T>(
      promise: Promise<T>, 
      opts?: ApiCallOptions
    ): Promise<T | null> => {
      const startTime = Date.now();
      try {
        const result = await promise;
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        showError(err, { ...opts, title: opts?.title || 'Request Failed' });
        return null;
      }
    },
    [showError],
  );

  return { wrapApi, showError, clearError, error };
}