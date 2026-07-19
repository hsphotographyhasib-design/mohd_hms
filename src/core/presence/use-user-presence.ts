'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/app-shell/store';
import { usePresenceStore, type UserPresenceInfo } from './presence-store';

/** How often to send a heartbeat while connected (30 seconds) */
const HEARTBEAT_INTERVAL_MS = 30_000;
/** How long before considering user idle (5 minutes) */
const IDLE_TIMEOUT_MS = 5 * 60_000;
/** Max reconnection delay (30 seconds) */
const MAX_RECONNECTION_DELAY = 30_000;

/**
 * Connects to the user-presence WebSocket service and updates
 * the presence store in real-time.
 *
 * Features:
 * - Heartbeat every 30s while connected
 * - Idle detection (5 min inactivity → away, activity → active)
 * - Visibility change (tab visible → active + heartbeat)
 * - Before unload (final heartbeat)
 * - Exponential backoff reconnection
 *
 * Call once at the app shell level (not per-component).
 * Returns a ref to the socket for manual disconnect if needed.
 */
export function useUserPresence(): React.MutableRefObject<Socket | null> {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const setStatus = usePresenceStore((s) => s.setStatus);
  const setFromSnapshot = usePresenceStore((s) => s.setFromSnapshot);
  const setConnected = usePresenceStore((s) => s.setConnected);
  const clearAll = usePresenceStore((s) => s.clearAll);

  // --- Idle detection refs ---
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  // --- Heartbeat ref ---
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Stable callbacks to avoid re-creating the effect ---
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback((socket: Socket) => {
    stopHeartbeat();
    socket.emit('presence:heartbeat');
    heartbeatRef.current = setInterval(() => {
      socket.emit('presence:heartbeat');
    }, HEARTBEAT_INTERVAL_MS);
  }, [stopHeartbeat]);

  const resetIdleTimer = useCallback((socket: Socket) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // If we were idle and user became active, emit presence:active
    if (isIdleRef.current) {
      isIdleRef.current = false;
      socket.emit('presence:active');
    }

    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      socket.emit('presence:idle');
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      clearAll();
      stopHeartbeat();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    // Connect to user-presence service via Caddy gateway
    const socket = io('/?XTransformPort=3004', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: MAX_RECONNECTION_DELAY,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      console.log('[Presence] Connected to presence service');
      setConnected(true);
      startHeartbeat(socket);
      // Start idle detection
      isIdleRef.current = false;
      resetIdleTimer(socket);
    });

    // Handle initial snapshot of all online users
    socket.on(
      'presence:snapshot',
      (data: { users: Array<{ userId: string; status: string; lastSeen: string | null; isOnline: boolean }> }) => {
        console.log('[Presence] Received snapshot:', data.users.length, 'users');
        const mapped: Array<UserPresenceInfo & { userId: string }> = data.users.map((u) => ({
          userId: u.userId,
          isOnline: u.isOnline,
          status: u.status as UserPresenceInfo['status'],
          lastSeen: u.lastSeen,
        }));
        setFromSnapshot(mapped);
      },
    );

    // Handle individual status changes
    socket.on(
      'user:status-change',
      (data: { userId: string; status: string; lastSeen: string | null; isOnline: boolean }) => {
        setStatus(data.userId, {
          isOnline: data.isOnline,
          status: data.status as UserPresenceInfo['status'],
          lastSeen: data.lastSeen,
        });
      },
    );

    socket.on('disconnect', (reason) => {
      console.log('[Presence] Disconnected:', reason);
      setConnected(false);
      stopHeartbeat();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Presence] Connection error:', err.message);
      setConnected(false);
    });

    // --- Idle detection: track user activity ---
    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'] as const;

    const handleActivity = () => {
      if (socket.connected) {
        resetIdleTimer(socket);
      }
    };

    for (const event of activityEvents) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    // --- Visibility change ---
    const handleVisibilityChange = () => {
      if (!document.hidden && socket.connected) {
        // Tab became visible again: emit active and send heartbeat
        socket.emit('presence:active');
        socket.emit('presence:heartbeat');
        resetIdleTimer(socket);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // --- Before unload ---
    const handleBeforeUnload = () => {
      if (socket.connected) {
        // Fire-and-forget heartbeat
        socket.emit('presence:heartbeat');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    socketRef.current = socket;

    return () => {
      // Cleanup event listeners
      for (const event of activityEvents) {
        window.removeEventListener(event, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      stopHeartbeat();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  return socketRef;
}