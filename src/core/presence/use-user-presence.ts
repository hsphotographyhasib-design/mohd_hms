'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/app-shell/store';
import { usePresenceStore } from './presence-store';

/**
 * Connects to the user-presence WebSocket service and updates
 * the presence store in real-time.
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

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      clearAll();
      return;
    }

    // Connect to user-presence service via Caddy gateway
    const socket = io('/?XTransformPort=3004', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      console.log('[Presence] Connected to presence service');
      setConnected(true);
    });

    // Handle initial snapshot of all online users
    socket.on('presence:snapshot', (data: { users: { userId: string; name: string; isOnline: boolean }[] }) => {
      console.log('[Presence] Received snapshot:', data.users.length, 'users online');
      setFromSnapshot(data.users);
    });

    // Handle individual status changes
    socket.on('user:status-change', (data: { userId: string; isOnline: boolean; name: string }) => {
      setStatus(data.userId, data.isOnline);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Presence] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Presence] Connection error:', err.message);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, setStatus, setFromSnapshot, setConnected, clearAll]);

  return socketRef;
}