'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/app-shell/store';
import { useNotificationStore } from '@/modules/notifications/services/store';
import {
  requestNotificationPermission,
  getNotificationPermission,
  registerDeviceToken,
  unregisterDeviceToken,
  onForegroundMessage,
  isFcmAvailable,
} from '@/core/firebase/fcm';
import type { AppView } from '@/core/types';

interface FcmState {
  permissionStatus: NotificationPermission | 'unavailable';
  isSupported: boolean;
  isRegistered: boolean;
  isLoading: boolean;
}

/**
 * React hook that manages the FCM lifecycle.
 *
 * - Checks/supports browser notification permission
 * - Auto-registers device token when permission is granted
 * - Listens for foreground push messages → adds to notification store
 * - Unregisters token on logout
 */
export function useFcm(): FcmState & { requestPermission: () => Promise<NotificationPermission> } {
  const { isAuthenticated } = useAuthStore();
  const addToast = useNotificationStore((s) => s.addToast);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unavailable'>('default');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const supported = typeof window !== 'undefined' && isFcmAvailable();

  // Get initial permission status
  useEffect(() => {
    if (!supported) {
      setPermissionStatus('unavailable');
      return;
    }
    setPermissionStatus(getNotificationPermission());
  }, [supported]);

  // Auto-register when authenticated + permission granted
  useEffect(() => {
    if (!isAuthenticated || !supported) return;

    const perm = getNotificationPermission();
    if (perm !== 'granted') return;

    let cancelled = false;

    const register = async () => {
      setIsLoading(true);
      try {
        const token = await registerDeviceToken();
        if (!cancelled) {
          setIsRegistered(!!token);
        }
      } catch {
        // Registration failed silently
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, supported, permissionStatus]);

  // Foreground message listener
  useEffect(() => {
    if (!isAuthenticated || !supported || permissionStatus !== 'granted') return;

    const unsub = onForegroundMessage((payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};

      const title = notification.title || 'Notification';
      const body = (notification as any).body || '';
      const type = (data.type as string) || 'info';
      const actionUrl = (data.actionUrl as string) || '';
      const actionLabel = (data.actionLabel as string) || '';

      // Add as in-app toast
      addToast({
        type: type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info',
        title,
        description: body || undefined,
        actionLabel: actionLabel || undefined,
        actionUrl: actionUrl || undefined,
        duration: type === 'urgent' || type === 'emergency' ? 10000 : 5000,
      });

      // Increment unread count
      const store = useNotificationStore.getState();
      const currentCount = store.unreadCount || 0;
      store._updateUnreadCount(currentCount + 1);

      // Broadcast to other tabs
      try {
        const channel = new BroadcastChannel('cmms-notifications');
        channel.postMessage({ type: 'NEW_NOTIFICATION', count: currentCount + 1 });
        channel.close();
      } catch {
        // BroadcastChannel not supported
      }
    });

    return () => {
      unsub();
    };
  }, [isAuthenticated, supported, permissionStatus, addToast]);

  // Unregister on logout
  useEffect(() => {
    if (isAuthenticated) return;
    unregisterDeviceToken().catch(() => {});
    setIsRegistered(false);
  }, [isAuthenticated]);

  // Listen for notification clicks from service worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const actionUrl = (event.data.actionUrl as string) || '';
        if (actionUrl) {
          // Parse action URL like "complaint-detail?id=xxx"
          const urlPath = actionUrl.replace(/^\//, '');
          const qIdx = urlPath.indexOf('?');
          const viewStr = qIdx > 0 ? urlPath.slice(0, qIdx) : urlPath;
          const queryStr = qIdx > 0 ? urlPath.slice(qIdx + 1) : '';

          const params: Record<string, string> = {};
          if (queryStr) {
            new URLSearchParams(queryStr).forEach((v, k) => {
              params[k] = v;
            });
          }

          useAppStore.getState().setView(viewStr as AppView, params);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) return 'denied';

    setIsLoading(true);
    try {
      const perm = await requestNotificationPermission();
      setPermissionStatus(perm);

      if (perm === 'granted') {
        const token = await registerDeviceToken();
        setIsRegistered(!!token);
      }

      return perm;
    } catch (err) {
      console.error('[FCM] Permission request failed:', err);
      setPermissionStatus('denied');
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, [supported]);

  return {
    permissionStatus,
    isSupported: supported,
    isRegistered,
    isLoading,
    requestPermission,
  };
}