'use client';

/**
 * Enterprise Notification Hook — Developer API
 *
 * Centralized, role-based popup notification system.
 * Every module MUST use this hook for all user-facing notifications.
 *
 * Usage:
 *   const notify = useNotification();
 *
 *   // Simple popup
 *   notify.showSuccess('Complaint Created', { description: 'CMP-2026-00125 has been created.' });
 *
 *   // With record number
 *   notify.showSuccess('Complaint Submitted Successfully', {
 *     description: 'Your complaint has been received successfully.',
 *     recordNumber: 'CMP-2026-00125',
 *     recordUrl: 'complaints',
 *     actionLabel: 'View Complaint',
 *   });
 *
 *   // Processing → Success/Error pattern
 *   const id = notify.showLoading('Processing...', { description: 'Please wait.' });
 *   // later:
 *   notify.update(id, { type: 'success', title: 'Saved Successfully' });
 *   // or on error:
 *   notify.update(id, { type: 'error', title: 'Failed to save' });
 *
 *   // Server-side role-based notification
 *   await notify.notifyRole('complaints.assigned', {
 *     title: 'New Complaint Assigned',
 *     message: 'You have been assigned complaint CMP-2026-00125.',
 *     context: { technicianId: 'tech_001', customerId: 'cust_001' },
 *   });
 */

import { useCallback } from 'react';
import { useNotificationStore } from '@/modules/notifications/services/store';

// ============================================================
// Types
// ============================================================

/** Options for showing a popup notification. */
type ShowOptions = {
  description?: string;
  /** Record identifier, e.g. "CMP-2026-00125", "INV-2026-0025" */
  recordNumber?: string;
  /** Navigation path for the record (used by action button + record badge) */
  recordUrl?: string;
  /** Timestamp of the underlying event */
  eventTimestamp?: number;
  /** Duration in ms before auto-dismiss (default: 5000) */
  duration?: number;
  /** Don't auto-dismiss — user must manually close */
  persistent?: boolean;
  /** Action button label */
  actionLabel?: string;
  /** Action button URL (defaults to recordUrl if not set) */
  actionUrl?: string;
};

/** Options for updating an existing popup. */
type UpdateOptions = {
  id: string;
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  recordNumber?: string;
  recordUrl?: string;
  persistent?: boolean;
};

/** Options for server-side role-based notification. */
type RoleNotifyOptions = {
  eventKey: string;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  recordNumber?: string;
  actionUrl?: string;
  actionLabel?: string;
  context?: {
    customerId?: string;
    technicianId?: string;
    previousTechnicianId?: string;
    supervisorId?: string;
    departmentId?: string;
  };
  data?: Record<string, unknown>;
};

/** Options for server-side user-targeted notification. */
type UserNotifyOptions = {
  userIds: string[];
  title: string;
  message: string;
  type?: string;
  priority?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  recordNumber?: string;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, unknown>;
};

// ============================================================
// Helper: get auth headers
// ============================================================

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// ============================================================
// Hook
// ============================================================

export function useNotification() {
  const store = useNotificationStore;

  // ── Low-level add ────────────────────────────────────────────

  const add = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info', title: string, options?: ShowOptions) => {
      return store.getState().addToast({
        type,
        title,
        description: options?.description,
        duration: options?.duration,
        persistent: options?.persistent,
        actionLabel: options?.actionLabel || (options?.recordUrl ? 'View Details' : undefined),
        actionUrl: options?.actionUrl || options?.recordUrl,
        recordNumber: options?.recordNumber,
        recordUrl: options?.recordUrl,
        eventTimestamp: options?.eventTimestamp,
        isProcessing: false,
      });
    },
    [store],
  );

  // ── Show methods ─────────────────────────────────────────────

  /**
   * Show a success popup notification.
   * @example
   * notify.showSuccess('Complaint Submitted Successfully', {
   *   description: 'Your complaint has been received successfully.',
   *   recordNumber: 'CMP-2026-00125',
   *   recordUrl: 'complaints',
   * });
   */
  const showSuccess = useCallback(
    (titleOrOptions: string | UpdateOptions, options?: ShowOptions) => {
      if (typeof titleOrOptions === 'string') {
        return add('success', titleOrOptions, options);
      }
      // Update existing toast (processing → success)
      const { id, title, ...rest } = titleOrOptions;
      store.getState().updateToast(id, {
        type: 'success',
        ...(title !== undefined ? { title } : {}),
        description: rest.description,
        persistent: false,
        isProcessing: false,
        ...(rest.recordNumber !== undefined ? { recordNumber: rest.recordNumber } : {}),
        ...(rest.recordUrl !== undefined ? { recordUrl: rest.recordUrl } : {}),
      });
      return id;
    },
    [add, store],
  );

  /**
   * Show an error popup notification. Persistent by default (user must dismiss).
   * @example
   * notify.showError('Failed to Create Complaint', {
   *   description: 'Please try again or contact support.',
   *   recordNumber: 'CMP-2026-00125',
   * });
   */
  const showError = useCallback(
    (titleOrOptions: string | UpdateOptions, options?: ShowOptions) => {
      if (typeof titleOrOptions === 'string') {
        return add('error', titleOrOptions, { ...options, persistent: options?.persistent ?? true });
      }
      const { id, title, ...rest } = titleOrOptions;
      store.getState().updateToast(id, {
        type: 'error',
        ...(title !== undefined ? { title } : {}),
        description: rest.description,
        persistent: true,
        isProcessing: false,
      });
      return id;
    },
    [add, store],
  );

  /**
   * Show a warning popup notification.
   * @example
   * notify.showWarning('Low Stock', {
   *   description: 'Split AC Filter — Remaining Stock: 2',
   *   recordNumber: 'INV-ITEM-0042',
   *   recordUrl: 'inventory',
   * });
   */
  const showWarning = useCallback(
    (title: string, options?: ShowOptions) => {
      return add('warning', title, options);
    },
    [add],
  );

  /**
   * Show an information popup notification.
   * @example
   * notify.showInfo('Technician Assigned', {
   *   description: 'Your complaint has been assigned to a technician.',
   *   recordNumber: 'CMP-2026-00125',
   * });
   */
  const showInfo = useCallback(
    (title: string, options?: ShowOptions) => {
      return add('info', title, options);
    },
    [add],
  );

  /**
   * Show a processing/loading popup. Returns the toast ID for later update.
   * The popup will show a spinner and be persistent until updated.
   * @example
   * const id = notify.showLoading('Processing...', { description: 'Please wait.' });
   * // later:
   * notify.showSuccess({ id, title: 'Saved Successfully' });
   */
  const showLoading = useCallback(
    (title: string, options?: ShowOptions) => {
      return store.getState().addToast({
        type: 'info',
        title,
        description: options?.description,
        persistent: true,
        isProcessing: true,
        recordNumber: options?.recordNumber,
        recordUrl: options?.recordUrl,
        eventTimestamp: options?.eventTimestamp,
        duration: options?.duration,
      });
    },
    [store],
  );

  /**
   * Show a "Draft Saved" popup notification.
   * @example
   * notify.showDraftSaved('Draft Saved', {
   *   recordNumber: 'WO-2026-0042',
   *   description: 'Your work order draft has been saved.',
   * });
   */
  const showDraftSaved = useCallback(
    (title: string, options?: ShowOptions) => {
      return store.getState().addToast({
        type: 'info',
        title,
        description: options?.description,
        persistent: false,
        isProcessing: false,
        recordNumber: options?.recordNumber,
        recordUrl: options?.recordUrl,
        eventTimestamp: options?.eventTimestamp,
        actionLabel: options?.actionLabel,
        actionUrl: options?.actionUrl,
        duration: options?.duration || 4000,
      });
    },
    [store],
  );

  /**
   * Show a "Permission Denied" popup notification.
   * @example
   * notify.showPermissionDenied('Permission Denied', {
   *   description: 'You do not have permission to perform this action.',
   * });
   */
  const showPermissionDenied = useCallback(
    (title: string, options?: ShowOptions) => {
      return store.getState().addToast({
        type: 'error',
        title,
        description: options?.description || 'You do not have permission to perform this action.',
        persistent: true,
        isProcessing: false,
        duration: options?.duration || 6000,
      });
    },
    [store],
  );

  // ── Control methods ──────────────────────────────────────────

  /**
   * Update an existing popup (e.g., processing → success).
   * @example
   * notify.update(id, { type: 'success', title: 'Completed!' });
   */
  const update = useCallback(
    (id: string, updates: Partial<UpdateOptions>) => {
      store.getState().updateToast(id, {
        ...(updates.type ? { type: updates.type } : {}),
        ...(updates.title ? { title: updates.title } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.persistent !== undefined ? { persistent: updates.persistent } : {}),
        ...(updates.recordNumber !== undefined ? { recordNumber: updates.recordNumber } : {}),
        ...(updates.recordUrl !== undefined ? { recordUrl: updates.recordUrl } : {}),
        // When updating to a final type, remove processing state
        isProcessing: false,
      });
    },
    [store],
  );

  /** Dismiss a specific popup by ID. */
  const dismiss = useCallback(
    (id: string) => store.getState().dismissToast(id),
    [store],
  );

  /** Dismiss all visible popups. */
  const dismissAll = useCallback(
    () => store.getState().dismissAllToasts(),
    [store],
  );

  // ── Server-side methods (role-based delivery) ───────────────

  /**
   * Send a role-based notification via the server.
   * The server determines recipients based on RBAC rules.
   * @example
   * await notify.notifyRole('complaints.assigned', {
   *   title: 'New Complaint Assigned',
   *   message: 'You have been assigned complaint CMP-2026-00125.',
   *   context: { technicianId: 'tech_001', customerId: 'cust_001' },
   * });
   */
  const notifyRole = useCallback(
    async (eventKey: string, options: Omit<RoleNotifyOptions, 'eventKey'>) => {
      try {
        const res = await fetch('/api/notifications/role-based', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ eventKey, ...options }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          console.error('[useNotification] notifyRole failed:', err.error);
        }
      } catch (error) {
        console.error('[useNotification] notifyRole error:', error);
      }
    },
    [],
  );

  /**
   * Send a notification to specific users via the server.
   * @example
   * await notify.notifyUsers(['user_001', 'user_002'], {
   *   title: 'New Message',
   *   message: 'You have a new message from support.',
   * });
   */
  const notifyUsers = useCallback(
    async (userIds: string[], options: Omit<UserNotifyOptions, 'userIds'>) => {
      try {
        const res = await fetch('/api/notifications', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userId: userIds,
            type: options.type || 'info',
            title: options.title,
            message: options.message,
            priority: options.priority,
            relatedEntityType: options.relatedEntityType,
            relatedEntityId: options.relatedEntityId,
            actionUrl: options.actionUrl,
            actionLabel: options.actionLabel,
            data: options.data,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          console.error('[useNotification] notifyUsers failed:', err.error);
        }
      } catch (error) {
        console.error('[useNotification] notifyUsers error:', error);
      }
    },
    [],
  );

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showDraftSaved,
    showPermissionDenied,
    update,
    dismiss,
    dismissAll,
    notifyRole,
    notifyUsers,
    // ── Backward-compatible aliases ──
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
  };
}