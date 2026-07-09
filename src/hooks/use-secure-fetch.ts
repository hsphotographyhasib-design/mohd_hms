'use client';

import { useCallback, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { broadcastLogoutEvent } from '@/components/session/broadcast-logout';

// Endpoints that are allowed to return 401 without triggering logout
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/verify-reset-otp', '/api/auth/resend-reset-otp', '/api/auth/whatsapp/send-otp', '/api/auth/whatsapp/verify-otp', '/api/auth/whatsapp/register', '/api/auth/google'];

// Grace period after login — ignore 401s during this window (prevents false positives
// from concurrent API calls that race with the auth state update)
const LOGIN_GRACE_MS = 5000;

// Cooldown to prevent multiple concurrent session re-validations
let lastSessionRevalidation = 0;
const SESSION_REVALIDATION_COOLDOWN_MS = 10_000;

let lastLoginTime = 0;
export function markLoginTime() {
  lastLoginTime = Date.now();
}

/**
 * Perform full session cleanup — used by interceptor and heartbeat.
 */
function handleSessionExpired(reason?: string) {
  const currentState = useAuthStore.getState();
  if (!currentState.isAuthenticated) return; // Already logged out

  broadcastLogoutEvent(reason || 'Session expired. Please sign in again.');
  localStorage.clear();
  sessionStorage.clear();

  const { logout } = useAuthStore.getState();
  const { setView } = useAppStore.getState();
  logout();
  setView('dashboard');
  window.history.replaceState(null, '', '/');

  window.dispatchEvent(
    new CustomEvent('cmms:toast', {
      detail: { type: 'warning', message: reason || 'Session expired. Please sign in again.' },
    })
  );
}

/**
 * Re-validate the session by calling /api/auth/me.
 * If the session is genuinely expired, triggers logout.
 * Returns true if session is valid, false if expired.
 */
async function revalidateSession(): Promise<boolean> {
  const now = Date.now();
  if (now - lastSessionRevalidation < SESSION_REVALIDATION_COOLDOWN_MS) {
    // Another revalidation is in progress or just finished — skip
    return false;
  }
  lastSessionRevalidation = now;

  const { token } = useAuthStore.getState();
  if (!token) {
    handleSessionExpired('No authentication token found. Please sign in again.');
    return false;
  }

  try {
    const meRes = await window.fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    if (meRes.ok) {
      // Session is valid — update user data from server
      try {
        const userData = await meRes.json();
        useAuthStore.setState({ user: userData });
      } catch { /* ignore parse errors */ }
      return true;
    }

    if (meRes.status === 401 || meRes.status === 403) {
      // Confirmed session expiry — force logout
      handleSessionExpired('Your session has expired. Please sign in again.');
      return false;
    }

    // Server error (500, 502, etc.) — session might be valid, don't logout
    return true;
  } catch {
    // Network error — can't verify, assume session is still valid
    return true;
  }
}

/**
 * A secure fetch wrapper that:
 * - Automatically adds Authorization header
 * - Handles 401/403 from any endpoint by re-validating session
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

    // Handle auth errors from any endpoint
    if (res.status === 401 || res.status === 403) {
      const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => url.includes(ep));
      const inGracePeriod = (Date.now() - lastLoginTime) < LOGIN_GRACE_MS;
      if (!isAuthEndpoint && !inGracePeriod) {
        // Re-validate session in background
        setTimeout(() => revalidateSession(), 0);
      }
    }

    return res;
  }, []);

  return { secureFetch };
}

/**
 * Global fetch interceptor — patches global fetch to:
 * - Add auth headers automatically for /api/ calls
 * - Handle 401/403 from ANY authenticated endpoint by re-validating via /api/auth/me
 * - Only trigger logout if /api/auth/me also confirms the session is expired
 * - Retry on network errors (server might be restarting/cold-starting)
 *
 * DESIGN:
 *   When any authenticated endpoint returns 401/403, we immediately re-validate
 *   the session by calling /api/auth/me. This prevents:
 *   1. Stale tokens leaving the user stuck with "offline values" banners
 *   2. False logouts from transient Render cold-start 401s (auth/me would succeed)
 *   3. Permission errors (403) being treated as session expiry
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

    // Handle 401/403 from any authenticated endpoint
    const isApiCall = urlStr.includes('/api/');
    const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => urlStr.includes(ep));
    const inGracePeriod = (Date.now() - lastLoginTime) < LOGIN_GRACE_MS;

    if (
      (res.status === 401 || res.status === 403) &&
      isApiCall &&
      !isAuthEndpoint &&
      !inGracePeriod
    ) {
      // Re-validate the session via /api/auth/me (with cooldown to prevent flooding)
      // This is async and non-blocking — the response is still returned to the caller
      setTimeout(() => revalidateSession(), 0);
    }

    return res;
  };
}