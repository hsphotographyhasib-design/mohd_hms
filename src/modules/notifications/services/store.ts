/**
 * UNIFIED Notification Store
 *
 * Replaces BOTH the legacy `@/app-shell/store` notification state and the enterprise
 * `@/modules/notifications/services/store`. This is the single source of truth for:
 *
 * - DB-synced notifications (from API / WebSocket / polling)
 * - Client-side toasts (popup notifications)
 *
 * Cross-tab sync via BroadcastChannel('cmms-notifications').
 */

import { create } from 'zustand';

// ============================================================
// Types
// ============================================================

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  priority: string;
  isRead: boolean;
  readAt?: string;
  archivedAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientToast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // ms, default 5000
  actionLabel?: string;
  actionUrl?: string;
  persistent?: boolean;
  createdAt: number;
  // ── Enterprise notification extensions ──
  /** Record identifier, e.g. "CMP-2026-00125", "INV-2026-0025" */
  recordNumber?: string;
  /** Navigation path for the record detail page */
  recordUrl?: string;
  /** Timestamp of the underlying event (may differ from toast createdAt) */
  eventTimestamp?: number;
  /** Show a processing spinner instead of the type icon */
  isProcessing?: boolean;
}

// Re-export NotificationSettings for provider compatibility
export interface NotificationSettings {
  soundEnabled: boolean;
  position: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
  maxVisible: number;
  reducedMotion: boolean;
}

// ============================================================
// Constants
// ============================================================

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 5000;
const SETTINGS_KEY = 'mohd-hms-notification-settings';

let idCounter = 0;
function genId(): string {
  return `toast-${Date.now()}-${++idCounter}`;
}

// ============================================================
// Helpers
// ============================================================

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function loadSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return { soundEnabled: false, position: 'top-right', maxVisible: MAX_VISIBLE, reducedMotion: false };
  }
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { soundEnabled: false, position: 'top-right', maxVisible: MAX_VISIBLE, reducedMotion: prefersReducedMotion };
}

function saveSettings(settings: NotificationSettings) {
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }
}

function broadcast(type: string, payload?: unknown) {
  try {
    const channel = new BroadcastChannel('cmms-notifications');
    channel.postMessage({ type, ...(payload as Record<string, unknown>) });
    channel.close();
  } catch { /* BroadcastChannel not supported */ }
}

// ============================================================
// Store Interface
// ============================================================

interface UnifiedNotificationState {
  // --- DB-synced notifications (from API) ---
  dbNotifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;

  // --- Client-side toasts (popup notifications) ---
  toasts: ClientToast[];

  // --- Settings ---
  settings: NotificationSettings;

  // --- DB notification actions ---
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  archiveAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // Client toast actions
  addToast: (toast: Omit<ClientToast, 'id' | 'createdAt'>) => string;
  updateToast: (id: string, updates: Partial<ClientToast>) => void;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;

  // Settings
  updateSettings: (settings: Partial<NotificationSettings>) => void;

  // Internal (used by WebSocket/polling)
  _addDbNotification: (notification: NotificationItem) => void;
  _updateUnreadCount: (count: number) => void;
  _setLoading: (loading: boolean) => void;
}

// ============================================================
// Store Implementation
// ============================================================

// Track auto-dismiss timers
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useNotificationStore = create<UnifiedNotificationState>((set, get) => ({
  // --- DB state ---
  dbNotifications: [],
  unreadCount: 0,
  isLoading: false,

  // --- Toast state ---
  toasts: [],

  // --- Settings ---
  settings: loadSettings(),

  // ============================================================
  // DB Notification Actions
  // ============================================================

  fetchNotifications: async () => {
    get()._setLoading(true);
    try {
      const res = await fetch('/api/notifications?pageSize=20', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const items: NotificationItem[] = data.data || [];
        const unread = items.filter((n) => !n.isRead).length;
        set({
          dbNotifications: items,
          unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : unread,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await fetch('/api/notifications?pageSize=1', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === 'number') {
          set({ unreadCount: data.unreadCount });
        }
      }
    } catch {
      // Silent fail — notification polling should never crash the app
    }
  },

  markAsRead: async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // Still update locally even if API fails
    }
    // Update local state
    const updated = get().dbNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    const unread = updated.filter((n) => !n.isRead).length;
    set({ dbNotifications: updated, unreadCount: unread });
    broadcast('NOTIFICATION_UPDATE');
  },

  markAllAsRead: async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {
      // Still update locally even if API fails
    }
    // Update local state
    const updated = get().dbNotifications.map((n) => ({
      ...n,
      isRead: true,
      readAt: n.readAt || new Date().toISOString(),
    }));
    set({ dbNotifications: updated, unreadCount: 0 });
    broadcast('ALL_READ');
  },

  archiveNotification: async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ archiveId: id }),
      });
    } catch { /* ignore */ }
    set({ dbNotifications: get().dbNotifications.filter((n) => n.id !== id) });
  },

  archiveAllRead: async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ archiveAllRead: true }),
      });
    } catch { /* ignore */ }
    set({
      dbNotifications: get().dbNotifications.filter((n) => n.isRead),
      unreadCount: 0,
    });
  },

  deleteNotification: async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch { /* ignore */ }
    const remaining = get().dbNotifications.filter((n) => n.id !== id);
    const unread = remaining.filter((n) => !n.isRead).length;
    set({ dbNotifications: remaining, unreadCount: unread });
  },

  // ============================================================
  // Client Toast Actions
  // ============================================================

  addToast: (toast) => {
    const id = genId();
    const t: ClientToast = {
      ...toast,
      id,
      createdAt: Date.now(),
    };

    const state = get();

    // Dedup: skip if same title+type within 2 seconds
    const isDupe = state.toasts.some(
      (existing) =>
        existing.title === t.title &&
        existing.type === t.type &&
        Date.now() - existing.createdAt < 2000
    );
    if (isDupe) return id;

    // Enforce max visible
    const newToasts = [...state.toasts, t];
    if (newToasts.length > state.settings.maxVisible) {
      const removed = newToasts.shift();
      if (removed) {
        const timer = toastTimers.get(removed.id);
        if (timer) {
          clearTimeout(timer);
          toastTimers.delete(removed.id);
        }
      }
    }

    set({ toasts: newToasts });

    // Auto-dismiss (unless persistent)
    if (!t.persistent) {
      const duration = t.duration || DEFAULT_DURATION;
      const timer = setTimeout(() => {
        get().dismissToast(id);
      }, duration);
      toastTimers.set(id, timer);
    }

    // Cross-tab sync for toasts
    broadcast('NEW_TOAST', { toast: t });

    return id;
  },

  updateToast: (id, updates) => {
    set({
      toasts: get().toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  },

  dismissToast: (id) => {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  dismissAllToasts: () => {
    // Clear all timers
    for (const [id, timer] of toastTimers.entries()) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    set({ toasts: [] });
  },

  // ============================================================
  // Settings
  // ============================================================

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    saveSettings(updated);
  },

  // ============================================================
  // Internal helpers (used by WebSocket / polling)
  // ============================================================

  _addDbNotification: (notification) => {
    const state = get();
    // Avoid duplicates
    if (state.dbNotifications.some((n) => n.id === notification.id)) return;
    const updated = [notification, ...state.dbNotifications].slice(0, 50); // keep max 50 in memory
    const unread = updated.filter((n) => !n.isRead).length;
    set({ dbNotifications: updated, unreadCount: unread });
  },

  _updateUnreadCount: (count) => {
    set({ unreadCount: count });
  },

  _setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));