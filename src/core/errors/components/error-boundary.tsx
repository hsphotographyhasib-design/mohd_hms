'use client';

import {
  Component,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import { ErrorModal, type ErrorInfo as ErrorInfoType } from '@/core/errors/components/error-ui';
import { logErrorToServer, sanitizeError } from '@/core/errors/error-utils';

// ============================================================
// PROPS
// ============================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback shown instead of the modal (e.g. a card-sized placeholder) */
  fallback?: ReactNode;
  /** Custom error category for the log */
  category?: ErrorInfoType['category'];
  /** Page name for logging context */
  pageName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: ErrorInfoType | null;
}

// ============================================================
// COMPONENT
// ============================================================

/**
 * React Error Boundary that catches render crashes in its subtree.
 *
 * In production: shows the branded ErrorModal, logs to the server.
 * In development: still logs but the error overlay from Next.js takes precedence.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      error: {
        message: sanitizeError(error),
        category: 'frontend',
        stackTrace: error instanceof Error ? error.stack : undefined,
      },
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const { category = 'frontend', pageName } = this.props;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Log to server (fire-and-forget)
    logErrorToServer({
      category,
      message,
      stackTrace: stack ? `${stack}\n\n${info.componentStack}` : info.componentStack || undefined,
      pageUrl: pageName || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    });

    // Also log to console in all environments for developer visibility
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback is provided, use it instead of the modal
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorModal
          error={this.state.error}
          onDismiss={this.handleDismiss}
        />
      );
    }

    return this.props.children;
  }
}