'use client';

import { useAuthStore, useAppStore } from '@/store';
import { broadcastLogoutEvent } from '@/components/session/broadcast-logout';

/** Base URL for API requests — empty string means same-origin (local dev) */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Resolves a potentially relative `/api/...` URL to an absolute URL
 * by prepending the backend base when `NEXT_PUBLIC_API_URL` is set.
 */
function resolveApiUrl(url: string): string {
  if (API_BASE && url.startsWith('/api/')) {
    return `${API_BASE}${url}`;
  }
  return url;
}

/**
 * A secure fetch wrapper that:
 * - Automatically adds Authorization header
 * - Prepends API_BASE for remote backend (Vercel → Render)
 * - Handles 401/403 responses with full session cleanup
 * - Retries on network errors (server might be restarting)
 */
export function useSecureFetch() {
  const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const { token } = useAuthStore.getState();
    const headers = new Headers(options.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const resolvedUrl = resolveApiUrl(url);
    const res = await fetch(resolvedUrl, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
        return res;
      }

      broadcastLogoutEvent('Session expired. Please sign in again.');
      localStorage.clear();
      sessionStorage.clear();

      const { logout } = useAuthStore.getState();
      const { setView } = useAppStore.getState();
      logout();
      setView('dashboard');
      window.history.replaceState(null, '', '/');

      window.dispatchEvent(
        new CustomEvent('cmms:toast', {
          detail: { type: 'warning', message: 'Session expired. Please sign in again.' },
        })
      );
    }

    return res;
  };

  return { secureFetch };
}

/**
 * Global fetch interceptor — patches global fetch to:
 * - Add auth headers automatically
 * - Retry on network errors (Turbopack restart resilience)
 * - Handle 401/403 with session cleanup
 */
export function setupFetchInterceptor() {
  const originalFetch = window.fetch;

  async function fetchWithRetry(
    url: string | URL | Request,
    options?: RequestInit,
    attempt = 0,
  ): Promise<Response> {
    try {
      return await originalFetch(url, options);
    } catch (error) {
      // Only retry on network errors (not on abort or other errors)
      if (attempt < 2 && error instanceof TypeError && error.message.includes('fetch')) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        return fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  window.fetch = async function (url: string | URL | Request, options?: RequestInit): Promise<Response> {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : (url as Request).url;

    // Resolve relative /api/... URLs to the remote backend when API_BASE is set
    const resolvedUrl = resolveApiUrl(urlStr);
    const fetchUrl = resolvedUrl !== urlStr ? resolvedUrl : url;

    const { token } = useAuthStore.getState();
    const headers = new Headers(options?.headers);
    if (token && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/register')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetchWithRetry(fetchUrl, { ...options, headers });

    if ((res.status === 401 || res.status === 403) && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/register')) {
      setTimeout(() => {
        const currentState = useAuthStore.getState();
        if (!currentState.isAuthenticated) return;

        broadcastLogoutEvent('Session expired. Please sign in again.');
        localStorage.clear();
        sessionStorage.clear();

        currentState.logout();
        useAppStore.getState().setView('dashboard');
        window.history.replaceState(null, '', '/');

        window.dispatchEvent(
          new CustomEvent('cmms:toast', {
            detail: { type: 'warning', message: 'Session expired. Please sign in again.' },
          })
        );
      }, 0);
    }

    return res;
  };
}