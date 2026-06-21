'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { broadcastLogoutEvent } from './broadcast-logout';
import { LogoutModal } from './logout-modal';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_DURATION = 60 * 1000; // 60 seconds
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'wheel',
  'touchstart',
  'click',
  'scroll',
];

interface IdleState {
  isIdle: boolean;
  showWarning: boolean;
  countdown: number;
}

/**
 * Monitors user inactivity and triggers auto-logout flow.
 * - After 5 min inactivity → shows warning modal with 60s countdown
 * - If user clicks "Stay Logged In" → resets timer
 * - If countdown expires → performs full logout
 */
export function IdleTimerProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [idleState, setIdleState] = useState<IdleState>({
    isIdle: false,
    showWarning: false,
    countdown: 60,
  });

  // Perform full auto logout (declared first for dependency order)
  const performAutoLogout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setIdleState({ isIdle: false, showWarning: false, countdown: 60 });
    broadcastLogoutEvent('Session expired due to inactivity.');
    localStorage.clear();
    sessionStorage.clear();

    const { logout } = useAuthStore.getState();
    const { setView } = useAppStore.getState();
    logout();
    setView('dashboard');
    window.history.replaceState(null, '', '/');

    window.dispatchEvent(
      new CustomEvent('cmms:toast', {
        detail: { type: 'warning', message: 'Session expired due to inactivity.' },
      })
    );
  }, []);

  // "Logout Now" handler
  const handleLogoutNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setIdleState({ isIdle: false, showWarning: false, countdown: 60 });
    broadcastLogoutEvent('You have been logged out.');
    localStorage.clear();
    sessionStorage.clear();

    const { logout } = useAuthStore.getState();
    const { setView } = useAppStore.getState();
    logout();
    setView('dashboard');
    window.history.replaceState(null, '', '/');
  }, []);

  // Reset the idle timer
  const resetTimer = useCallback(() => {
    if (idleState.showWarning) {
      setIdleState({ isIdle: false, showWarning: false, countdown: 60 });
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIdleState((prev) => ({ ...prev, isIdle: true, showWarning: true, countdown: 60 }));

      countdownRef.current = setInterval(() => {
        setIdleState((prev) => {
          if (prev.countdown <= 1) {
            return { ...prev, countdown: 0 };
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);

      warningTimerRef.current = setTimeout(() => {
        performAutoLogout();
      }, WARNING_DURATION);
    }, IDLE_TIMEOUT);
  }, [idleState.showWarning, performAutoLogout]);

  // "Stay Logged In" handler
  const handleStayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Listen for activity events
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true, capture: true });
    });

    // Start timer on next tick (avoids lint set-state-in-effect)
    const startId = requestAnimationFrame(() => resetTimer());

    return () => {
      cancelAnimationFrame(startId);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity, { capture: true });
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isAuthenticated, resetTimer]);

  return (
    <>
      {children}
      {idleState.showWarning && (
        <LogoutModal
          countdown={idleState.countdown}
          onStayLoggedIn={handleStayLoggedIn}
          onLogoutNow={handleLogoutNow}
        />
      )}
    </>
  );
}