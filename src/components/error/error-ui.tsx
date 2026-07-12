'use client';

import {
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { logErrorToServer } from '@/lib/error-utils';

// ============================================================
// TYPES
// ============================================================

export type ErrorCategory = 'frontend' | 'backend' | 'network' | 'upload';

export interface ErrorInfo {
  title?: string;
  message: string;
  category: ErrorCategory;
  statusCode?: number;
  stackTrace?: string;
  retry?: () => void;
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
  const [retrying, setRetrying] = useState(false);

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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

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
            {error.title || 'Something Went Wrong'}
          </h2>

          {/* Message */}
          <p
            id="error-modal-desc"
            className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400"
          >
            {error.message}
          </p>

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
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

export function FullPageError() {
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

        {/* Branding */}
        <p className="mt-10 text-xs text-gray-300 dark:text-gray-600">
          MOHD.HMS ENTERPRISE
        </p>
      </motion.div>
    </div>
  );
}