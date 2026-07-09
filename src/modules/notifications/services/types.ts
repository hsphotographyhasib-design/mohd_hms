/**
 * Enterprise Notification System — Types
 */

export type NotificationType =
  | 'success' | 'error' | 'warning' | 'info' | 'loading' | 'progress'
  | 'processing' | 'draft_saved' | 'permission_denied';

export type NotificationModule =
  | 'auth' | 'dashboard' | 'complaints' | 'work-orders' | 'pm'
  | 'inventory' | 'equipment' | 'customers' | 'quotations' | 'finance'
  | 'hr' | 'reports' | 'settings' | 'email' | 'whatsapp' | 'system';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'destructive';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  module?: NotificationModule;
  /** Action buttons shown on the notification */
  actions?: NotificationAction[];
  /** Progress value 0-100 (only for type='progress') */
  progress?: number;
  /** Don't auto-dismiss — user must manually close */
  persistent?: boolean;
  /** Show undo button (10s window) */
  undoable?: boolean;
  onUndo?: () => void;
  /** Reference ID (e.g. complaint number, invoice number) */
  referenceId?: string;
  /** Reference URL to navigate to on click */
  referenceUrl?: string;
  createdAt: number;
  dismissedAt?: number;
  read: boolean;
  /** Duration in ms before auto-dismiss (default 4500) */
  duration?: number;
}

export interface NotificationSettings {
  soundEnabled: boolean;
  position: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
  maxVisible: number;
  reducedMotion: boolean;
}

export interface NotificationLogEntry {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  module?: NotificationModule;
  action: string; // e.g. 'create', 'update', 'delete'
  result: 'success' | 'failure' | 'warning';
  userId?: string;
  timestamp: string;
}

/** Color/icon config per notification type */
export const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconBgClass: string;
  ariaLabel: string;
}> = {
  success: {
    icon: 'CheckCircle2',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    textClass: 'text-emerald-800 dark:text-emerald-200',
    iconBgClass: 'bg-emerald-100 dark:bg-emerald-900/60',
    ariaLabel: 'Success',
  },
  error: {
    icon: 'XCircle',
    bgClass: 'bg-red-50 dark:bg-red-950/40',
    borderClass: 'border-red-200 dark:border-red-800',
    textClass: 'text-red-800 dark:text-red-200',
    iconBgClass: 'bg-red-100 dark:bg-red-900/60',
    ariaLabel: 'Error',
  },
  warning: {
    icon: 'AlertTriangle',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-200 dark:border-amber-800',
    textClass: 'text-amber-800 dark:text-amber-200',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/60',
    ariaLabel: 'Warning',
  },
  info: {
    icon: 'Info',
    bgClass: 'bg-slate-50 dark:bg-slate-800/40',
    borderClass: 'border-slate-200 dark:border-slate-700',
    textClass: 'text-slate-800 dark:text-slate-200',
    iconBgClass: 'bg-slate-100 dark:bg-slate-700/60',
    ariaLabel: 'Information',
  },
  loading: {
    icon: 'Loader2',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/60',
    ariaLabel: 'Loading',
  },
  progress: {
    icon: 'Loader2',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/60',
    ariaLabel: 'Progress',
  },
  processing: {
    icon: 'Loader2',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/60',
    ariaLabel: 'Processing',
  },
  draft_saved: {
    icon: 'BookmarkCheck',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/60',
    ariaLabel: 'Draft Saved',
  },
  permission_denied: {
    icon: 'ShieldX',
    bgClass: 'bg-red-50 dark:bg-red-950/40',
    borderClass: 'border-red-200 dark:border-red-800',
    textClass: 'text-red-800 dark:text-red-200',
    iconBgClass: 'bg-red-100 dark:bg-red-900/60',
    ariaLabel: 'Permission Denied',
  },
};