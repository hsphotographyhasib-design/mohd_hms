'use client';

/**
 * useNotificationRealtime — Client-side WebSocket hook
 *
 * Connects to the notification WebSocket service (port 3010 via Caddy proxy)
 * and updates the Zustand notification store in real-time.
 *
 * Features:
 * - Connects via io('/?XTransformPort=3010')
 * - On 'notification:new': prepends to in-memory DB notification list + shows toast
 * - On 'notification:read': marks notification as read locally
 * - On 'notification:allRead': marks all as read locally
 * - Broadcasts read events to user's other tabs
 * - Auto-reconnects with exponential backoff
 * - Cleans up on unmount
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory DB notification state (separate from the toast/queue store)
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of a DB notification received from WebSocket */
export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdAt?: string;
  isRead?: boolean;
}

/**
 * Simple in-memory store for DB notifications (not persisted).
 * The main app can import `realtimeNotificationStore` to read the list.
 * This is a lightweight alternative to adding DB notification state
 * to the main Zustand store, keeping concerns separate.
 */
interface RealtimeNotificationState {
  notifications: RealtimeNotification[];
  unreadCount: number;
  /** Add a new notification to the front of the list */
  addNotification: (n: RealtimeNotification) => void;
  /** Mark a specific notification as read */
  markRead: (id: string) => void;
  /** Mark all notifications as read */
  markAllRead: () => void;
  /** Replace the entire list (e.g., after a full fetch) */
  setNotifications: (notifications: RealtimeNotification[]) => void;
  /** Reset state on logout */
  reset: () => void;
}

const MAX_IN_MEMORY = 200;

function createRealtimeStore() {
  let notifications: RealtimeNotification[] = [];
  let listeners: (() => void)[] = [];

  function notify() {
    for (const fn of listeners) fn();
  }

  function getUnreadCount() {
    return notifications.filter((n) => !n.isRead).length;
  }

  return {
    get notifications() {
      return notifications;
    },
    get unreadCount() {
      return getUnreadCount();
    },
    addNotification(n: RealtimeNotification) {
      // Dedup: don't add if same ID already exists
      if (notifications.some((existing) => existing.id === n.id)) return;
      notifications = [n, ...notifications].slice(0, MAX_IN_MEMORY);
      notify();
    },
    markRead(id: string) {
      let changed = false;
      notifications = notifications.map((n) => {
        if (n.id === id && !n.isRead) {
          changed = true;
          return { ...n, isRead: true };
        }
        return n;
      });
      if (changed) notify();
    },
    markAllRead() {
      const hadUnread = notifications.some((n) => !n.isRead);
      if (hadUnread) {
        notifications = notifications.map((n) => ({ ...n, isRead: true }));
        notify();
      }
    },
    setNotifications(newNotifications: RealtimeNotification[]) {
      notifications = newNotifications.slice(0, MAX_IN_MEMORY);
      notify();
    },
    reset() {
      notifications = [];
      notify();
    },
    subscribe(fn: () => void) {
      listeners.push(fn);
      return () => {
        listeners = listeners.filter((l) => l !== fn);
      };
    },
  };
}

export const realtimeNotificationStore = createRealtimeStore();

// ─────────────────────────────────────────────────────────────────────────────
// Map notification type to toast type
// ─────────────────────────────────────────────────────────────────────────────

function getToastType(type: string): 'success' | 'error' | 'warning' | 'info' {
  const lower = type.toLowerCase();
  if (lower.includes('success') || lower.includes('accepted') || lower.includes('approved')) return 'success';
  if (lower.includes('error') || lower.includes('rejected') || lower.includes('failed')) return 'error';
  if (lower.includes('warning') || lower.includes('alert') || lower.includes('low_stock')) return 'warning';
  return 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useNotificationRealtime
// ─────────────────────────────────────────────────────────────────────────────

const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_MULTIPLIER = 2;

export function useNotificationRealtime() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const joinedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(RECONNECT_MULTIPLIER, attempt), MAX_RECONNECT_DELAY);
    reconnectAttemptRef.current = attempt + 1;

    console.log(`[NotificationWS] Scheduling reconnect in ${delay}ms (attempt ${attempt + 1})`);
    reconnectTimerRef.current = setTimeout(() => {
      socketRef.current?.connect();
    }, delay);
  }, [clearReconnectTimer]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Not authenticated — disconnect and clean up
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      joinedRef.current = false;
      clearReconnectTimer();
      return;
    }

    // ── Create socket connection ──
    const socket = io('/?XTransformPort=3010', {
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually with backoff
      timeout: 10000,
    });

    socketRef.current = socket;
    joinedRef.current = false;

    // ── On connect: join user's room ──
    socket.on('connect', () => {
      console.log('[NotificationWS] Connected:', socket.id);
      setIsConnected(true);
      reconnectAttemptRef.current = 0;

      if (user.tenantId && user.id) {
        socket.emit('join', { tenantId: user.tenantId, userId: user.id });
        joinedRef.current = true;
        console.log(`[NotificationWS] Joined room: tenant:${user.tenantId}:user:${user.id}`);
      }
    });

    // ── On disconnect: schedule reconnect ──
    socket.on('disconnect', (reason) => {
      console.log('[NotificationWS] Disconnected:', reason);
      setIsConnected(false);
      joinedRef.current = false;

      if (reason === 'io server disconnect') {
        // Server forcefully closed — reconnect immediately
        socket.connect();
      } else {
        scheduleReconnect();
      }
    });

    // ── On connect_error: schedule reconnect ──
    socket.on('connect_error', (err) => {
      console.warn('[NotificationWS] Connection error:', err.message);
      setIsConnected(false);
      joinedRef.current = false;
      scheduleReconnect();
    });

    // ── New notification received ──
    socket.on('notification:new', ({ notification }: { notification: RealtimeNotification }) => {
      console.log('[NotificationWS] New notification:', notification.title);

      // Add to in-memory store
      realtimeNotificationStore.addNotification(notification);

      // Show toast
      const toastType = getToastType(notification.type);
      toast[toastType](notification.title, {
        description: notification.message,
        duration: 5000,
      });
    });

    // ── Notification marked as read (from another tab) ──
    socket.on('notification:read', ({ id }: { id: string }) => {
      realtimeNotificationStore.markRead(id);
    });

    // ── All notifications marked as read (from another tab) ──
    socket.on('notification:allRead', () => {
      realtimeNotificationStore.markAllRead();
    });

    // ── Connect ──
    socket.connect();

    // ── Cleanup on unmount ──
    return () => {
      clearReconnectTimer();
      setIsConnected(false);
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [isAuthenticated, user, clearReconnectTimer, scheduleReconnect]);

  // ── Return helpers to emit events ──
  return {
    /** Emit notification:read to sync across tabs */
    emitRead: (id: string) => {
      if (socketRef.current && joinedRef.current) {
        socketRef.current.emit('notification:read', { id });
      }
      // Also update local store immediately
      realtimeNotificationStore.markRead(id);
    },
    /** Emit notification:allRead to sync across tabs */
    emitAllRead: () => {
      if (socketRef.current && joinedRef.current) {
        socketRef.current.emit('notification:allRead', {});
      }
      // Also update local store immediately
      realtimeNotificationStore.markAllRead();
    },
    /** Whether the WebSocket is currently connected */
    isConnected,
  };
}