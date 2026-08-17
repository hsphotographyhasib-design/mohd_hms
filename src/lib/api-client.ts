// Centralized API client for MOHD.HMS ENTERPRISE
// Routes API calls to FastAPI backend when NEXT_PUBLIC_API_URL is set

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Returns the configured backend URL (empty string if not set).
 * When empty, requests go through the Next.js API route proxy as before.
 */
export function getApiBaseUrl(): string {
  return BACKEND_URL;
}

/**
 * Rewrites a frontend-relative API path to the FastAPI backend URL.
 *
 * When NEXT_PUBLIC_API_URL is set (e.g. "http://localhost:8000"):
 *   /api/complaints       → http://localhost:8000/api/v1/complaints
 *   /api/auth/login       → http://localhost:8000/api/v1/auth/login
 *
 * When NEXT_PUBLIC_API_URL is not set, returns the path unchanged
 * (requests fall through to the Next.js API route proxy).
 */
export function resolveApiUrl(path: string): string {
  // No backend configured — pass through to Next.js API routes
  if (!BACKEND_URL) return path;

  // Already has the full backend URL prefix — no rewrite needed
  if (path.startsWith(BACKEND_URL)) return path;

  // Rewrite /api/... → {BACKEND_URL}/api/v1/...
  if (path.startsWith('/api/')) {
    const withoutPrefix = path.slice(5); // Remove leading '/api/'
    return `${BACKEND_URL}/api/v1/${withoutPrefix}`;
  }

  // Non-API paths returned unchanged
  return path;
}

/**
 * Type-safe API client that automatically:
 * - Rewrites URLs via resolveApiUrl
 * - Attaches the Bearer token from localStorage
 * - Sets Content-Type for JSON string bodies
 *
 * Usage:
 *   const user = await apiClient<{ id: string }>('/api/auth/me');
 *   const complaints = await apiClient('/api/complaints', { method: 'POST', body: JSON.stringify(data) });
 */
export async function apiClient<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = resolveApiUrl(path);
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('cmms_token') || '' : '';

  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (
    !headers.has('Content-Type') &&
    options.body &&
    typeof options.body === 'string'
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error =
      data.error ||
      data.message ||
      `Request failed with status ${res.status}`;
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }

  return res.json();
}
