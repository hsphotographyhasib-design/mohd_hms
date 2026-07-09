// Errors barrel export

// Error utilities
export { logErrorToServer, sanitizeError } from './error-utils';

// Error components
export { default as ErrorBoundary } from './components/error-boundary';
export { ErrorModal } from './components/error-ui';
export type { ErrorInfo, ErrorCategory } from './components/error-ui';
export { ErrorOverlayProvider } from './components/error-overlay-provider';

// Error hooks
export { useErrorHandler, useApiHandler } from './hooks/use-error-handler';