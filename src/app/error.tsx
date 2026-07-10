'use client';

import { useEffect } from 'react';
import { ErrorModal, FullPageError } from '@/core/errors/components/error-ui';
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
  // Log error to console for debugging (always)
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

  // Always show the actual error (remove once root cause is fixed)
  const displayMessage = sanitizeError(error);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <ErrorModal
        error={{
          title: process.env.NODE_ENV === 'development' ? 'Development Error' : 'Something Went Wrong',
          message: displayMessage,
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