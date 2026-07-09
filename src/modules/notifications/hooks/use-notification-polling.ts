'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '@/modules/notifications/services/store';
import { useAuthStore } from '@/app-shell/store';

/**
 * Auto-polls for notification updates.
 *
 * - Polls unread count every 30 seconds (lightweight, just a count)
 * - Fetches full notification list every 60 seconds
 * - Stops polling when user logs out or tab is hidden
 * - Syncs unread count across tabs via BroadcastChannel
 */
export function useNotificationPolling() {
  const { token, isAuthenticated } = useAuthStore();
  const countIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHiddenRef = useRef(false);

  // Fetch just the unread count (lightweight)
  const fetchUnreadCount = useCallback(async () => {
    if (!token || isHiddenRef.current) return;
    try {
      await useNotificationStore.getState().fetchUnreadCount();
    } catch {
      // Silent fail — notification polling should never crash the app
    }
  }, [token]);

  // Fetch full notification list
  const fetchNotifications = useCallback(async () => {
    if (!token || isHiddenRef.current) return;
    try {
      await useNotificationStore.getState().fetchNotifications();
    } catch {
      // Silent fail
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Clear intervals when logged out
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      if (listIntervalRef.current) clearInterval(listIntervalRef.current);
      countIntervalRef.current = null;
      listIntervalRef.current = null;
      return;
    }

    // Initial fetch
    fetchUnreadCount();
    fetchNotifications();

    // Poll unread count every 30 seconds
    countIntervalRef.current = setInterval(fetchUnreadCount, 30_000);

    // Poll full list every 60 seconds
    listIntervalRef.current = setInterval(fetchNotifications, 60_000);

    return () => {
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      if (listIntervalRef.current) clearInterval(listIntervalRef.current);
    };
  }, [isAuthenticated, token, fetchUnreadCount, fetchNotifications]);

  // Pause polling when tab is hidden, resume when visible
  useEffect(() => {
    const handleVisibility = () => {
      isHiddenRef.current = document.hidden;
      if (!document.hidden) {
        // Tab became visible again — fetch immediately
        fetchUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchUnreadCount]);

  // Cross-tab sync: when another tab marks notifications as read, update this tab
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('cmms-notifications');
      channel.onmessage = (event) => {
        if (event.data?.type === 'NOTIFICATION_UPDATE') {
          fetchUnreadCount();
        } else if (event.data?.type === 'ALL_READ') {
          useNotificationStore.getState()._updateUnreadCount(0);
        }
      };
    } catch {
      // BroadcastChannel not supported — silent fail
    }

    return () => {
      channel?.close();
    };
  }, [fetchUnreadCount]);
}