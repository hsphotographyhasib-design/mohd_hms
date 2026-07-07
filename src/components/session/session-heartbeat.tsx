'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { broadcastLogoutEvent } from './broadcast-logout';

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds
const INITIAL_DELAY = 10 * 1000; // 10 seconds after login (let auth guard finish first)
const MAX_CONSECUTIVE_FAILURES = 3; // Only logout after 3 consecutive auth failures

/**
 * Periodically validates the session by calling /api/auth/me.
 * Only triggers logout on 401/403 (auth errors), NOT on 500 or network errors.
 * Requires MAX_CONSECUTIVE_FAILURES consecutive auth failures before logging out
 * to prevent false positives during brief server issues.
 */
export function SessionHeartbeat() {
  const { isAuthenticated, token, logout } = useAuthStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const consecutiveFailures = useRef(0);

  const validateSession = useCallback(async () => {
    const state = useAuthStore.getState();
    if (!state.isAuthenticated || !state.token) return;

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401 || res.status === 403) {
        // Auth error — increment failure count
        consecutiveFailures.current += 1;

        if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
          // Confirmed auth failure — logout
          if (!mountedRef.current) return;
          consecutiveFailures.current = 0;
          broadcastLogoutEvent('Session expired. Please sign in again.');
          performSecureLogout();
        }
        return;
      }

      if (res.ok) {
        // Session is valid — reset failure count
        consecutiveFailures.current = 0;
        // Update user data from server
        try {
          const userData = await res.json();
          useAuthStore.setState({ user: userData });
        } catch {
          // Ignore parse errors
        }
      }
      // For 500 and other errors, do nothing — don't logout
    } catch {
      // Network error — don't logout, just skip this check
      // The user might just have a brief connectivity issue
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial validation after delay (let AuthGuard finish first)
    const initialTimeout = setTimeout(() => {
      validateSession();
    }, INITIAL_DELAY);

    // Then validate every 60 seconds
    intervalRef.current = setInterval(validateSession, HEARTBEAT_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, validateSession]);

  return null;
}

/**
 * Perform a fully secure logout — clears everything.
 */
export function performSecureLogout(reason?: string) {
  // Broadcast to other tabs
  broadcastLogoutEvent(reason || 'You have been logged out.');

  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();

  // Reset stores
  const { logout } = useAuthStore.getState();
  const { setView } = useAppStore.getState();

  logout();
  setView('dashboard');

  // Replace history to prevent back button navigation
  window.history.replaceState(null, '', '/');

  // Show toast if reason provided
  if (reason) {
    window.dispatchEvent(
      new CustomEvent('cmms:toast', {
        detail: { type: 'info', message: reason },
      })
    );
  }
}