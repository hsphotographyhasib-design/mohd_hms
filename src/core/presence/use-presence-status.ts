'use client';

import { usePresenceStore, type UserPresenceInfo, type UserPresenceStatus } from './presence-store';

/**
 * Get a single user's real-time presence info.
 * Falls back to { isOnline: dbIsOnline, status: dbIsOnline ? 'online' : 'offline', lastSeen: null }
 * when the WebSocket is not connected.
 */
export function usePresenceStatus(userId: string | undefined, dbIsOnline?: boolean): UserPresenceInfo {
  const onlineStatus = usePresenceStore((s) => s.onlineStatus);
  const isConnected = usePresenceStore((s) => s.isConnected);

  if (!userId) {
    return { isOnline: false, status: 'offline', lastSeen: null };
  }

  // When WebSocket is connected, use real-time data
  if (isConnected && onlineStatus[userId]) {
    return onlineStatus[userId];
  }

  // Fallback to DB value when WebSocket is disconnected
  return {
    isOnline: dbIsOnline ?? false,
    status: (dbIsOnline ? 'online' : 'offline') as UserPresenceStatus,
    lastSeen: null,
  };
}

/**
 * Get formatted "last seen" text for display.
 */
export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Never';

  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}