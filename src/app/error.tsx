'use client';

import { useEffect } from 'react';
import { ErrorModal, FullPageError } from '@/components/error/error-ui';
import { logErrorToServer, sanitizeError } from '@/lib/error-utils';

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
    logErrorToServer({
      category: 'frontend',
      message: error.message,
      stackTrace: error.stack,
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, [error]);

  // In production, show the user-friendly modal.
  // In development, Next.js shows its own overlay — but we also render ours.
  if (process.env.NODE_ENV === 'production') {
    return (
      <ErrorModal
        error={{
          message: "We couldn't complete your request right now.\nPlease try again in a few moments.",
          category: 'frontend',
          retry: reset,
        }}
        onDismiss={reset}
      />
    );
  }

  // Development: still show a clean error (Next.js dev overlay will also appear)
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <ErrorModal
        error={{
          title: 'Development Error',
          message: sanitizeError(error),
          category: 'frontend',
          retry: reset,
        }}
        onDismiss={reset}
      />
    </div>
  );
}