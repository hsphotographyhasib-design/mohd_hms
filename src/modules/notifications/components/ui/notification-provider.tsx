'use client';

import React from 'react';
import { NotificationContainer } from './notification-toast';
import { useNotificationStore } from '@/modules/notifications/services/store';

/**
 * Global Notification Provider.
 * Place this once in the app tree (inside page.tsx, above AppShell).
 * Renders the floating notification container (toast popups).
 *
 * The notification bell/dropdown is now rendered in the Header component directly.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { updateSettings } = useNotificationStore();

  // Sync with OS reduced motion preference
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    updateSettings({ reducedMotion: mq.matches });
    const handler = (e: MediaQueryListEvent) => updateSettings({ reducedMotion: e.matches });
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [updateSettings]);

  return (
    <>
      {children}
      <NotificationContainer />
    </>
  );
}