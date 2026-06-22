'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { broadcastLogoutEvent } from './broadcast-logout';

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds

/**
 * Periodically validates the session by calling /api/auth/me.
 * If the token is expired or invalid, performs full logout.
 */
export function SessionHeartbeat() {
  const { isAuthenticated, token, logout } = useAuthStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

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

      if (!res.ok) {
        // Session invalid — force logout
        if (!mountedRef.current) return;

        broadcastLogoutEvent('Session expired. Please sign in again.');
        performSecureLogout();
      }
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

    // Initial validation after 5s delay (let the app settle)
    const initialTimeout = setTimeout(() => {
      validateSession();
    }, 5000);

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