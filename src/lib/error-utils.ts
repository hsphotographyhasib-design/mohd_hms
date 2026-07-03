/**
 * Client-side utility for logging errors to the server.
 *
 * - Only sends in production (in dev, errors are visible in the console).
 * - Silently fails if the logging endpoint itself is unreachable.
 * - Collects browser / device / URL metadata automatically.
 */
export function logErrorToServer(opts: {
  category: 'frontend' | 'backend' | 'network' | 'upload';
  message: string;
  stackTrace?: string;
  statusCode?: number;
  pageUrl?: string;
}) {
  if (process.env.NODE_ENV === 'development') {
    // In development, just log to console for debugging
    console.error('[ErrorLogger]', opts.category, opts.message, opts.stackTrace || '');
    return;
  }

  // Fire-and-forget — never block the UI
  try {
    const browser =
      typeof navigator !== 'undefined'
        ? `${navigator.userAgent}`
        : undefined;

    const device =
      typeof window !== 'undefined'
        ? `${window.screen.width}x${window.screen.height}`
        : undefined;

    fetch('/api/error-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...opts,
        pageUrl: opts.pageUrl || (typeof window !== 'undefined' ? window.location.href : undefined),
        browser: browser?.substring(0, 200),
        device,
      }),
      keepalive: true, // survives page unload
    }).catch(() => {
      // Swallow — logging must never cause cascading errors
    });
  } catch {
    // Swallow
  }
}

/**
 * Sanitize an error for display — strip anything technical.
 */
export function sanitizeError(error: unknown): string {
  if (typeof error === 'string') {
    return error.length > 200 ? error.substring(0, 200) : error;
  }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    // Check for common API response shapes
    if (typeof obj.error === 'string') return obj.error.substring(0, 200);
    if (typeof obj.message === 'string') return obj.message.substring(0, 200);
  }
  return 'An unexpected error occurred.';
}