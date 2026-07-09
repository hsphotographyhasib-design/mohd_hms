'use client';

import { useCallback, useState, useEffect, type ReactNode } from 'react';
import { ErrorModal, type ErrorInfo } from '@/core/errors/components/error-ui';

/**
 * ErrorOverlayProvider wraps the app and provides a global error modal.
 *
 * Components can call `window.__showAppError(errorInfo)` to display
 * the branded error popup from anywhere (even outside React trees).
 *
 * This is the "API Error Boundary" — it catches errors from API calls,
 * form submissions, uploads, etc. that don't go through a React Error Boundary.
 */
export function ErrorOverlayProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = useCallback((info: ErrorInfo) => {
    setError(info);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Expose globally for imperative use (via effect to satisfy lint)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__showAppError = handleError;
  }, [handleError]);

  return (
    <>
      {children}
      {error && (
        <ErrorModal
          error={error}
          onDismiss={clearError}
        />
      )}
    </>
  );
}