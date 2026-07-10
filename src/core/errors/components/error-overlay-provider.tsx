'use client';

import { useCallback, useState, useEffect, type ReactNode } from 'react';
import { ErrorModal, type ErrorInfo } from '@/core/errors/components/error-ui';

// Extend Window type for global error display
declare global {
  interface Window {
    __showAppError?: (info: ErrorInfo) => void;
    __clearAppError?: () => void;
  }
}

export function ErrorOverlayProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = useCallback((info: ErrorInfo) => {
    setError(info);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    window.__showAppError = handleError;
    window.__clearAppError = clearError;
    return () => {
      window.__showAppError = undefined;
      window.__clearAppError = undefined;
    };
  }, [handleError, clearError]);

  return (
    <>
      {children}
      {error && <ErrorModal error={error} onDismiss={clearError} />}
    </>
  );
}