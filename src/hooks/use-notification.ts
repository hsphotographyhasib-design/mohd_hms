'use client';

/**
 * Notification Hook — Developer API
 *
 * Usage:
 *   const notify = useNotification();
 *   notify.success('Complaint Created', { description: 'CMP-2026-00125 has been created.' });
 *   notify.error('Failed', { description: 'Unable to save quotation.' });
 *   const id = notify.loading('Saving...');
 *   // later:
 *   notify.success({ id, title: 'Saved Successfully' });
 */

import { useCallback } from 'react';
import { useNotificationStore } from '@/lib/notifications/store';

type ToastOptions = {
  description?: string;
  duration?: number;
  persistent?: boolean;
  actionLabel?: string;
  actionUrl?: string;
};

type UpdateOptions = {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
};

export function useNotification() {
  const store = useNotificationStore;

  /** Low-level add */
  const add = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info', title: string, options?: ToastOptions) => {
      return store.getState().addToast({
        type,
        title,
        description: options?.description,
        duration: options?.duration,
        persistent: options?.persistent,
        actionLabel: options?.actionLabel,
        actionUrl: options?.actionUrl,
      });
    },
    []
  );

  const success = useCallback(
    (titleOrOptions: string | UpdateOptions, options?: ToastOptions) => {
      if (typeof titleOrOptions === 'string') {
        return add('success', titleOrOptions, options);
      }
      const { id, title, ...rest } = titleOrOptions;
      store.getState().updateToast(id, { type: 'success', title, description: rest.description });
      return id;
    },
    [add, store]
  );

  const error = useCallback(
    (titleOrOptions: string | UpdateOptions, options?: ToastOptions) => {
      if (typeof titleOrOptions === 'string') {
        return add('error', titleOrOptions, { ...options, persistent: options?.persistent ?? true });
      }
      const { id, title, ...rest } = titleOrOptions;
      store.getState().updateToast(id, { type: 'error', title, description: rest.description });
      return id;
    },
    [add, store]
  );

  const warning = useCallback(
    (title: string, options?: ToastOptions) => {
      return add('warning', title, options);
    },
    [add]
  );

  const info = useCallback(
    (title: string, options?: ToastOptions) => {
      return add('info', title, options);
    },
    [add]
  );

  const loading = useCallback(
    (title: string, options?: ToastOptions) => {
      return add('info', title, { ...options, persistent: true, description: options?.description });
    },
    [add]
  );

  /** Dismiss a specific toast */
  const dismiss = useCallback(
    (id: string) => store.getState().dismissToast(id),
    [store]
  );

  /** Dismiss all visible toasts */
  const dismissAll = useCallback(
    () => store.getState().dismissAllToasts(),
    [store]
  );

  return {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    dismissAll,
  };
}