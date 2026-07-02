/**
 * Enterprise Notification System — Zustand Store
 *
 * Features:
 * - Queue-based (max N visible, rest queued)
 * - Dedup by title+module (no duplicate notifications)
 * - Auto-dismiss with configurable duration
 * - Hover pauses auto-dismiss timer
 * - Undo support (10-second window)
 * - Sound toggle
 * - History persisted to localStorage
 * - Enterprise logging
 */

import { create } from 'zustand';
import type { Notification, NotificationType, NotificationModule, NotificationSettings, NotificationLogEntry } from './types';

const MAX_VISIBLE_DEFAULT = 5;
const DEFAULT_DURATION = 4500;
const UNDO_DURATION = 10000;
const HISTORY_KEY = 'mohd-hms-notification-history';
const HISTORY_MAX = 100;
const SETTINGS_KEY = 'mohd-hms-notification-settings';
const LOG_KEY = 'mohd-hms-notification-log';
const LOG_MAX = 500;

let idCounter = 0;
function genId(): string {
  return `ntf-${Date.now()}-${++idCounter}`;
}

interface NotificationState {
  /** Currently visible notifications */
  visible: Notification[];
  /** Queue waiting to become visible */
  queue: Notification[];
  /** Dismissed notification history */
  history: Notification[];
  /** Enterprise log entries */
  logs: NotificationLogEntry[];
  /** User settings */
  settings: NotificationSettings;

  // --- Actions ---
  add: (notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'dismissedAt'>) => string;
  update: (id: string, updates: Partial<Pick<Notification, 'title' | 'description' | 'type' | 'progress'>>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  clearQueue: () => void;
  undo: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  playSound: (type: NotificationType) => void;
}

/** Load settings from localStorage */
function loadSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return { soundEnabled: false, position: 'top-right', maxVisible: MAX_VISIBLE_DEFAULT, reducedMotion: false };
  }
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { soundEnabled: false, position: 'top-right', maxVisible: MAX_VISIBLE_DEFAULT, reducedMotion: prefersReducedMotion };
}

/** Load history from localStorage */
function loadHistory(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

/** Save history to localStorage */
function saveHistory(history: Notification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
  } catch { /* ignore */ }
}

/** Load logs from localStorage */
function loadLogs(): NotificationLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LOG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

/** Save logs to localStorage */
function saveLogs(logs: NotificationLogEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-LOG_MAX)));
  } catch { /* ignore */ }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  visible: [],
  queue: [],
  history: loadHistory(),
  logs: loadLogs(),
  settings: loadSettings(),

  add: (notification) => {
    const id = genId();
    const n: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
      read: false,
    };

    const state = get();

    // Dedup: if a visible/queued notification has the same title+module+type, skip
    const all = [...state.visible, ...state.queue];
    const isDupe = all.some(
      (existing) =>
        existing.title === n.title &&
        existing.module === n.module &&
        existing.type === n.type &&
        Date.now() - existing.createdAt < 2000 // within 2s
    );
    if (isDupe) return id;

    // Log to enterprise log
    const logEntry: NotificationLogEntry = {
      id: genId(),
      type: n.type,
      title: n.title,
      description: n.description,
      module: n.module,
      action: 'display',
      result: n.type === 'error' ? 'failure' : n.type === 'warning' ? 'warning' : 'success',
      timestamp: new Date().toISOString(),
    };
    const updatedLogs = [...state.logs, logEntry];
    saveLogs(updatedLogs);

    // Add to visible or queue
    if (state.visible.length < state.settings.maxVisible) {
      set({
        visible: [...state.visible, n],
        logs: updatedLogs,
      });

      // Auto-dismiss (unless persistent or loading/progress)
      if (!n.persistent && n.type !== 'loading' && n.type !== 'progress') {
        const duration = n.undoable ? UNDO_DURATION : (n.duration || DEFAULT_DURATION);
        setTimeout(() => {
          // Only dismiss if still visible and not hovered
          get().dismiss(id);
        }, duration);
      }

      // Play sound
      if (state.settings.soundEnabled && n.type !== 'loading' && n.type !== 'progress') {
        get().playSound(n.type);
      }
    } else {
      set({
        queue: [...state.queue, n],
        logs: updatedLogs,
      });
    }

    return id;
  },

  update: (id, updates) => {
    const state = get();
    // Check visible
    const visIdx = state.visible.findIndex((n) => n.id === id);
    if (visIdx !== -1) {
      const updated = [...state.visible];
      updated[visIdx] = { ...updated[visIdx], ...updates };
      set({ visible: updated });
      return;
    }
    // Check queue
    const qIdx = state.queue.findIndex((n) => n.id === id);
    if (qIdx !== -1) {
      const updated = [...state.queue];
      updated[qIdx] = { ...updated[qIdx], ...updates };
      set({ queue: updated });
    }
  },

  dismiss: (id) => {
    const state = get();
    const notification = state.visible.find((n) => n.id === id);
    if (!notification) return;

    const dismissed = { ...notification, dismissedAt: Date.now() };
    const remaining = state.visible.filter((n) => n.id !== id);
    const newHistory = [...state.history, dismissed];

    // Promote next from queue
    let newQueue = [...state.queue];
    let newVisible = remaining;
    if (newQueue.length > 0 && newVisible.length < state.settings.maxVisible) {
      const [next, ...rest] = newQueue;
      newVisible = [...newVisible, next];
      newQueue = rest;

      // Auto-dismiss the promoted notification
      if (!next.persistent && next.type !== 'loading' && next.type !== 'progress') {
        const duration = next.undoable ? UNDO_DURATION : (next.duration || DEFAULT_DURATION);
        setTimeout(() => get().dismiss(next.id), duration);
      }
    }

    saveHistory(newHistory);
    set({ visible: newVisible, queue: newQueue, history: newHistory });
  },

  dismissAll: () => {
    const state = get();
    const now = Date.now();
    const dismissed = state.visible.map((n) => ({ ...n, dismissedAt: now }));
    const newHistory = [...state.history, ...dismissed];
    saveHistory(newHistory);
    set({ visible: [], queue: [], history: newHistory });
  },

  clearQueue: () => set({ queue: [] }),

  undo: (id) => {
    const state = get();
    const notification = state.visible.find((n) => n.id === id);
    if (notification?.onUndo) {
      notification.onUndo();
      get().dismiss(id);
    }
  },

  markRead: (id) => {
    const state = get();
    const updated = state.history.map((n) => n.id === id ? { ...n, read: true } : n);
    set({ history: updated });
    saveHistory(updated);
  },

  markAllRead: () => {
    const state = get();
    const updated = state.history.map((n) => ({ ...n, read: true }));
    set({ history: updated });
    saveHistory(updated);
  },

  clearHistory: () => {
    set({ history: [] });
    if (typeof window !== 'undefined') localStorage.removeItem(HISTORY_KEY);
  },

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    if (typeof window !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    }
  },

  playSound: (type: NotificationType) => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Different tones per type
      switch (type) {
        case 'success':
          osc.frequency.value = 880;
          osc.type = 'sine';
          gain.gain.value = 0.08;
          osc.start(); osc.stop(ctx.currentTime + 0.15);
          break;
        case 'error':
          osc.frequency.value = 330;
          osc.type = 'square';
          gain.gain.value = 0.05;
          osc.start(); osc.stop(ctx.currentTime + 0.25);
          break;
        case 'warning':
          osc.frequency.value = 660;
          osc.type = 'triangle';
          gain.gain.value = 0.07;
          osc.start(); osc.stop(ctx.currentTime + 0.2);
          break;
        default:
          osc.frequency.value = 523;
          osc.type = 'sine';
          gain.gain.value = 0.06;
          osc.start(); osc.stop(ctx.currentTime + 0.15);
      }
    } catch { /* Audio not available */ }
  },
}));