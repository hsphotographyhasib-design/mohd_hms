// Error utilities
export { logErrorToServer, sanitizeError, type LogErrorOptions } from './error-utils';

// Error service
export {
  categorizeError,
  extractErrorCode,
  extractHttpStatus,
  generateRequestId,
  generateErrorRef,
  getFriendlyMessage,
  sanitizeForNonAdmin,
  detectModule,
  ERROR_CATEGORIES,
  type ErrorCategoryType,
} from './error-service';

// Error components
export { ErrorBoundary } from './components/error-boundary';
export { ErrorModal, FullPageError } from './components/error-ui';
export { ErrorOverlayProvider } from './components/error-overlay-provider';
export type { ErrorInfo, ErrorCategory, DebugInfo } from './components/error-ui';

// Error hooks
export { useErrorHandler, useApiHandler, type ApiCallOptions } from './hooks/use-error-handler';