'use client';

/**
 * Enterprise Notification Hook — Developer API
 *
 * Usage:
 *   const notify = useNotification();
 *   notify.success('Complaint Created', 'CMP-2026-00125 has been created.');
 *   notify.error('Failed', 'Unable to save quotation.');
 *   const id = notify.loading('Saving...');
 *   // later:
 *   notify.success({ id, title: 'Saved Successfully' });
 */

import { useCallback } from 'react';
import { useNotificationStore } from '@/lib/notifications/store';
import type {
  NotificationType, NotificationModule, Notification,
  NotificationAction,
} from '@/lib/notifications/types';

type QuickOptions = {
  description?: string;
  module?: NotificationModule;
  actions?: NotificationAction[];
  duration?: number;
  persistent?: boolean;
  undoable?: boolean;
  onUndo?: () => void;
  referenceId?: string;
  referenceUrl?: string;
};

type UpdateOptions = {
  title?: string;
  description?: string;
  type?: NotificationType;
  progress?: number;
};

export function useNotification() {
  const store = useNotificationStore();

  /** Low-level add */
  const add = useCallback(
    (type: NotificationType, title: string, options?: QuickOptions) => {
      return store.add({
        type,
        title,
        description: options?.description,
        module: options?.module,
        actions: options?.actions,
        duration: options?.duration,
        persistent: options?.persistent,
        undoable: options?.undoable,
        onUndo: options?.onUndo,
        referenceId: options?.referenceId,
        referenceUrl: options?.referenceUrl,
      });
    },
    [store]
  );

  const success = useCallback(
    (titleOrOptions: string | { id: string; title: string } & QuickOptions, desc?: string, options?: QuickOptions) => {
      if (typeof titleOrOptions === 'string') {
        return add('success', titleOrOptions, { ...options, description: desc });
      }
      const { id, title, ...rest } = titleOrOptions;
      if (id) {
        store.update(id, { type: 'success', title, description: rest.description });
        return id;
      }
      return add('success', title, rest);
    },
    [add, store]
  );

  const error = useCallback(
    (titleOrOptions: string | { id: string; title: string } & QuickOptions, desc?: string, options?: QuickOptions) => {
      if (typeof titleOrOptions === 'string') {
        return add('error', titleOrOptions, { ...options, description: desc, persistent: true });
      }
      const { id, title, ...rest } = titleOrOptions;
      if (id) {
        store.update(id, { type: 'error', title, description: rest.description });
        return id;
      }
      return add('error', title, { ...rest, persistent: true });
    },
    [add, store]
  );

  const warning = useCallback(
    (title: string, desc?: string, options?: QuickOptions) => {
      return add('warning', title, { ...options, description: desc });
    },
    [add]
  );

  const info = useCallback(
    (title: string, desc?: string, options?: QuickOptions) => {
      return add('info', title, { ...options, description: desc });
    },
    [add]
  );

  const loading = useCallback(
    (title: string, desc?: string) => {
      return add('loading', title, { description: desc });
    },
    [add]
  );

  const progress = useCallback(
    (title: string, currentProgress: number, options?: QuickOptions) => {
      return add('progress', title, { ...options, progress: currentProgress });
    },
    [add]
  );

  /** Update an existing notification (e.g., loading → success) */
  const update = useCallback(
    (id: string, updates: UpdateOptions) => {
      store.update(id, updates);
    },
    [store]
  );

  /** Dismiss a specific notification */
  const dismiss = useCallback(
    (id: string) => store.dismiss(id),
    [store]
  );

  /** Dismiss all visible notifications */
  const dismissAll = useCallback(
    () => store.dismissAll(),
    [store]
  );

  /** Clear the queue (pending notifications) */
  const clearQueue = useCallback(
    () => store.clearQueue(),
    [store]
  );

  return {
    add,
    success,
    error,
    warning,
    info,
    loading,
    progress,
    update,
    dismiss,
    dismissAll,
    clearQueue,
    /** Toggle notification sound */
    toggleSound: () => store.updateSettings({ soundEnabled: !store.settings.soundEnabled }),
    /** Update notification position */
    setPosition: (position: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center') =>
      store.updateSettings({ position }),
  };
}