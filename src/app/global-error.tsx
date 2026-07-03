'use client';

import { useEffect } from 'react';
import { FullPageError } from '@/components/error/error-ui';
import { logErrorToServer } from '@/lib/error-utils';

/**
 * Next.js Global Error Boundary (app/global-error.tsx).
 *
 * Catches errors that crash the root layout itself.
 * This replaces the ENTIRE page, so we must re-declare <html> and <body>.
 * Shows the full-page "Service Temporarily Unavailable" screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logErrorToServer({
      category: 'frontend',
      message: `GLOBAL: ${error.message}`,
      stackTrace: error.stack,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-950 antialiased">
        <FullPageError />
      </body>
    </html>
  );
}