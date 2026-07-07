'use client';

import { useCallback } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { broadcastLogoutEvent } from '@/components/session/broadcast-logout';

/**
 * A secure fetch wrapper that:
 * - Automatically adds Authorization header
 * - Handles 401/403 responses with full session cleanup
 * - Does NOT rewrite URLs — all /api/... requests go through the
 *   Vercel server-side proxy (which forwards to the Render backend).
 *   This avoids CORS / CORP issues from direct cross-origin requests.
 */
export function useSecureFetch() {
  const secureFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const { token } = useAuthStore.getState();
    const headers = new Headers(options.headers);

    // Add auth header if token exists
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Set content type for JSON bodies
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Handle auth errors
    if (res.status === 401 || res.status === 403) {
      // Don't redirect for login/register endpoints
      if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
        return res;
      }

      // Full session cleanup
      broadcastLogoutEvent('Session expired. Please sign in again.');
      localStorage.clear();
      sessionStorage.clear();

      const { logout } = useAuthStore.getState();
      const { setView } = useAppStore.getState();
      logout();
      setView('dashboard');

      window.history.replaceState(null, '', '/');

      // Show toast
      window.dispatchEvent(
        new CustomEvent('cmms:toast', {
          detail: { type: 'warning', message: 'Session expired. Please sign in again.' },
        })
      );
    }

    return res;
  }, []);

  return { secureFetch };
}

/**
 * Global fetch interceptor — patches global fetch to:
 * - Add auth headers automatically for /api/ calls
 * - Handle 401/403 with session cleanup
 * - Retry on network errors (server might be restarting)
 *
 * IMPORTANT: This does NOT rewrite URLs. All /api/... requests go
 * through the Vercel server-side proxy (which forwards to Render).
 * This avoids CORS / CORP issues from direct cross-origin requests.
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

    // Add auth header for API calls (same-origin — goes through Vercel proxy)
    const { token } = useAuthStore.getState();
    const headers = new Headers(options?.headers);
    if (token && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/register')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetchWithRetry(url, { ...options, headers });

    // Handle 401/403 — but only for actual API calls, not during initial auth validation
    if ((res.status === 401 || res.status === 403) && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/register')) {
      // Schedule cleanup for next tick (don't block the current response)
      setTimeout(() => {
        const currentState = useAuthStore.getState();
        if (!currentState.isAuthenticated) return; // Already logged out

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