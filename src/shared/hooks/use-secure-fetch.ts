'use client';

import { useCallback } from 'react';
import { useAuthStore, useAppStore } from '@/app-shell/store';
import { broadcastLogoutEvent } from '@/core/auth/session/broadcast-logout';

/**
 * A secure fetch wrapper that:
 * - Automatically adds Authorization header
 * - Handles 401 (unauthenticated) with full session cleanup
 * - Does NOT logout on 403 (forbidden) — that means "no permission for this
 *   resource", NOT "session invalid". The calling code should handle 403s.
 * - Does NOT rewrite URLs — all /api/... requests go through the
 *   Vercel server-side proxy (which forwards to the Render backend).
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

    // Only 401 (not authenticated) triggers session cleanup.
    // 403 (forbidden) means the user is authenticated but lacks permission
    // for this specific resource — they should stay logged in.
    if (res.status === 401) {
      // Don't redirect for login/register endpoints
      if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
        return res;
      }

      // Attempt silent session refresh before logging out.
      // This handles the case where the user's role was changed by an admin
      // and the session was revoked. If refresh-session succeeds (JWT is
      // still cryptographically valid), the user gets a new token with the
      // updated role and we retry the original request.
      const refreshed = await useAuthStore.getState().refreshSession();
      if (refreshed) {
        // Role changed — retry the original request with the new token
        const newHeaders = new Headers(options.headers);
        const newToken = useAuthStore.getState().token;
        if (newToken) newHeaders.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, { ...options, headers: newHeaders });
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

// ── Login grace period ───────────────────────────────────────────
let _loginTime = 0;
const GRACE_PERIOD_MS = 5000; // 5 seconds after login

/** Call after successful login to suppress 401 during page refresh. */
export function markLoginTime() {
  _loginTime = Date.now();
}

/** Returns true if we're still in the grace period after a fresh login. */
export function isWithinGracePeriod(): boolean {
  return Date.now() - _loginTime < GRACE_PERIOD_MS;
}

/**
 * Global fetch interceptor — patches global fetch to handle 401.
 * Call once at app initialization.
 * Does NOT rewrite URLs.
 *
 * IMPORTANT: Only 401 (unauthenticated) triggers auto-logout.
 * 403 (forbidden) is intentionally NOT handled here — the calling
 * component should deal with permission errors appropriately.
 */
export function setupFetchInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = (async function (url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : (url as Request).url;

    // Add auth header for API calls
    const { token } = useAuthStore.getState();
    const headers = new Headers(options?.headers);
    if (token && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/register')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await originalFetch(url, { ...options, headers });

    // Only 401 (unauthenticated) triggers session cleanup, NOT 403 (forbidden).
    if (res.status === 401 && urlStr.includes('/api/') && !urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/register')) {
      // Skip cleanup during login grace period
      if (isWithinGracePeriod()) return res;
      // Skip cleanup for refresh-session itself (avoid infinite loop)
      if (urlStr.includes('/api/auth/refresh-session')) return res;

      // Schedule cleanup for next tick (don't block the current response)
      // But first, attempt a silent session refresh in case the 401 is due
      // to a role change (sessions revoked). If refresh-session returns a
      // new token, we skip logout — the store was already updated.
      setTimeout(async () => {
        const currentState = useAuthStore.getState();
        if (!currentState.isAuthenticated) return; // Already logged out

        // Attempt silent refresh
        const refreshed = await currentState.refreshSession();
        if (refreshed) {
          // Got a new token — the 401 was due to role change, not auth failure.
          // The periodic refresh already updated the store, so future requests
          // will use the new token. No logout needed.
          return;
        }

        // Genuine auth failure — full cleanup
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
  }) as typeof fetch;
}