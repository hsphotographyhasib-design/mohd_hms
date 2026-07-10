'use client';

import { useEffect } from 'react';
import { ErrorModal } from '@/core/errors/components/error-ui';
import { logErrorToServer, sanitizeError } from '@/core/errors/error-utils';

/**
 * Next.js Route Error Boundary (app/error.tsx).
 *
 * Catches errors thrown during rendering of any route segment.
 * Shows the branded error modal. Does NOT reset the layout.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  useEffect(() => {
    logErrorToServer({
      category: 'frontend',
      message: error.message,
      stackTrace: error.stack,
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, [error]);

  // Production: show sanitized, user-friendly message
  // Development: show the actual error for debugging
  if (process.env.NODE_ENV === 'production') {
    return (
      <ErrorModal
        error={{
          message: sanitizeError(error),
          category: 'frontend',
          stackTrace: error.stack,
          retry: reset,
          debug: {
            errorType: error.name || 'Error',
            stackTrace: error.stack,
          },
        }}
        onDismiss={reset}
      />
    );
  }

  // Development: show full error details
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <ErrorModal
        error={{
          title: 'Development Error',
          message: sanitizeError(error),
          category: 'frontend',
          stackTrace: error.stack,
          retry: reset,
          debug: {
            errorType: error.name || 'Error',
            stackTrace: error.stack,
          },
        }}
        onDismiss={reset}
      />
    </div>
  );
}