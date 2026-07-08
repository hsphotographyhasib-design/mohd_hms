'use client';

import { useCallback, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { broadcastLogoutEvent } from '@/components/session/broadcast-logout';

// Endpoints that are allowed to return 401 without triggering logout
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/verify-reset-otp', '/api/auth/resend-reset-otp', '/api/auth/whatsapp/send-otp', '/api/auth/whatsapp/verify-otp', '/api/auth/whatsapp/register', '/api/auth/google'];

// Grace period after login — ignore 401s during this window (prevents false positives
// from concurrent API calls that race with the auth state update)
const LOGIN_GRACE_MS = 5000;

let lastLoginTime = 0;
export function markLoginTime() {
  lastLoginTime = Date.now();
}

/**
 * A secure fetch wrapper that:
 * - Automatically adds Authorization header
 * - Handles 401/403 only from /api/auth/me (canonical session check)
 * - Does NOT rewrite URLs — all /api/... requests go through the
 *   Vercel server-side proxy (which forwards to the Render backend).
 */
export function useSecureFetch() {
  const secureFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const { token } = useAuthStore.getState();
    const headers = new Headers(options.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });

    // Only handle auth errors from the canonical session endpoint
    if ((res.status === 401 || res.status === 403) && url.includes('/api/auth/me')) {
      handleSessionExpired();
    }

    return res;
  }, []);

  return { secureFetch };
}

/**
 * Perform full session cleanup — used by interceptor and heartbeat.
 */
function handleSessionExpired() {
  const currentState = useAuthStore.getState();
  if (!currentState.isAuthenticated) return; // Already logged out

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

/**
 * Global fetch interceptor — patches global fetch to:
 * - Add auth headers automatically for /api/ calls
 * - Handle 401/403 ONLY from /api/auth/me (the canonical session check)
 * - Retry on network errors (server might be restarting/cold-starting)
 *
 * CRITICAL DESIGN DECISION:
 *   We do NOT logout on 401 from arbitrary endpoints (notifications, dashboard,
 *   etc.) because:
 *   1. A cold-start on Render can cause brief 401s
 *   2. A 403 might mean "insufficient permissions", not "session expired"
 *   3. Network hiccups can cause gateway timeouts that return 401
 *   Only /api/auth/me is the authoritative session validator.
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

    // Add auth header for API calls
    const { token } = useAuthStore.getState();
    const headers = new Headers(options?.headers);
    if (token && urlStr.includes('/api/') && !AUTH_ENDPOINTS.some(ep => urlStr.includes(ep))) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetchWithRetry(url, { ...options, headers });

    // Only trigger logout on 401/403 from the canonical session check endpoint
    // AND only if we're outside the login grace period
    const isAuthMe = urlStr.includes('/api/auth/me');
    const isApiCall = urlStr.includes('/api/');
    const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => urlStr.includes(ep));
    const inGracePeriod = (Date.now() - lastLoginTime) < LOGIN_GRACE_MS;

    if (
      (res.status === 401 || res.status === 403) &&
      isApiCall &&
      !isAuthEndpoint &&
      !inGracePeriod
    ) {
      if (isAuthMe) {
        // Canonical session check failed — confirmed logout
        setTimeout(() => handleSessionExpired(), 0);
      }
      // For all other endpoints: silently ignore 401/403.
      // The SessionHeartbeat will catch genuine session expiry via /api/auth/me.
    }

    return res;
  };
}