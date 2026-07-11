'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
  BookmarkCheck,
  ShieldX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationStore, type ClientToast } from '@/modules/notifications/services/store';
import { NOTIFICATION_CONFIG } from '@/modules/notifications/services/types';
import type { NotificationType } from '@/modules/notifications/services/types';
import { cn } from '@/core/utils/utils';
import { useAppStore } from '@/app-shell/store';
import { NotificationToast } from './notification-toast';

// ============================================================
// Types
// ============================================================

export interface EnterpriseToast extends ClientToast {
  /** Record identifier, e.g. "CMP-2026-00125", "INV-2026-0025" */
  recordNumber?: string;
  /** Navigation path for the record detail page */
  recordUrl?: string;
  /** Timestamp of the underlying event (may differ from toast createdAt) */
  eventTimestamp?: number;
  /** Show a processing spinner instead of the type icon */
  isProcessing?: boolean;
}

export interface EnterprisePopupProps {
  notification: EnterpriseToast;
}

// ============================================================
// Enterprise-specific type styling
// ============================================================

interface TypeStyleConfig {
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconBgClass: string;
  ariaLabel: string;
}

const ENTERPRISE_TYPE_STYLE: Record<string, TypeStyleConfig> = {
  processing: {
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/60',
    ariaLabel: 'Processing',
  },
  draft_saved: {
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/60',
    ariaLabel: 'Draft Saved',
  },
  permission_denied: {
    bgClass: 'bg-red-50 dark:bg-red-950/40',
    borderClass: 'border-red-200 dark:border-red-800',
    textClass: 'text-red-800 dark:text-red-200',
    iconBgClass: 'bg-red-100 dark:bg-red-900/60',
    ariaLabel: 'Permission Denied',
  },
};

// ============================================================
// Icon map
// ============================================================

const ENTERPRISE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
  progress: Loader2,
  processing: Loader2,
  draft_saved: BookmarkCheck,
  permission_denied: ShieldX,
};

// ============================================================
// Animation variants
// ============================================================

const POPUP_VARIANTS = {
  initial: { opacity: 0, y: -30, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: 100, scale: 0.92 },
};

const ENTER_TRANSITION = { type: 'spring' as const, stiffness: 400, damping: 30 };
const EXIT_TRANSITION = { duration: 0.2 };

// ============================================================
// Defaults
// ============================================================

const DEFAULT_DURATION = 5000;

// ============================================================
// Helpers
// ============================================================

/**
 * Type guard: checks whether a ClientToast carries enterprise-specific fields.
 */
export function isEnterpriseToast(toast: ClientToast): boolean {
  const t = toast as unknown as Record<string, unknown>;
  return (
    (t.recordNumber !== undefined && typeof t.recordNumber === 'string') ||
    (t.recordUrl !== undefined && typeof t.recordUrl === 'string') ||
    (t.eventTimestamp !== undefined && typeof t.eventTimestamp === 'number') ||
    t.isProcessing === true
  );
}

/** Resolve the full style config for a given notification type. */
function getStyleConfig(type: string): TypeStyleConfig {
  // 1. Try NOTIFICATION_CONFIG (covers success, error, warning, info, loading, progress)
  const baseConfig = NOTIFICATION_CONFIG[type as NotificationType];
  if (baseConfig) {
    return {
      bgClass: baseConfig.bgClass,
      borderClass: baseConfig.borderClass,
      textClass: baseConfig.textClass,
      iconBgClass: baseConfig.iconBgClass,
      ariaLabel: baseConfig.ariaLabel,
    };
  }
  // 2. Try enterprise-specific styles
  const enterpriseConfig = ENTERPRISE_TYPE_STYLE[type];
  if (enterpriseConfig) return enterpriseConfig;
  // 3. Fallback to info
  return {
    bgClass: 'bg-slate-50 dark:bg-slate-800/40',
    borderClass: 'border-slate-200 dark:border-slate-700',
    textClass: 'text-slate-800 dark:text-slate-200',
    iconBgClass: 'bg-slate-100 dark:bg-slate-700/60',
    ariaLabel: 'Notification',
  };
}

/** Short relative time formatter: "Just now", "2m ago", "1h ago", then date-fns fallback. */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

// ============================================================
// EnterprisePopup Component
// ============================================================

export function EnterprisePopup({ notification }: EnterprisePopupProps) {
  const dismissToast = useNotificationStore((s) => s.dismissToast);
  const setView = useAppStore((s) => s.setView);
  const [isHovered, setIsHovered] = useState(false);

  const config = useMemo(() => getStyleConfig(notification.type), [notification.type]);
  const effectiveType = notification.isProcessing ? 'processing' : notification.type;
  const IconComponent = ENTERPRISE_ICON_MAP[effectiveType] || ENTERPRISE_ICON_MAP.info;
  const isSpinnerType = effectiveType === 'processing' || effectiveType === 'loading' || effectiveType === 'progress';

  const duration = notification.duration || DEFAULT_DURATION;
  const timestamp = notification.eventTimestamp ?? notification.createdAt;

  // Handlers
  const handleDismiss = useCallback(() => {
    dismissToast(notification.id);
  }, [dismissToast, notification.id]);

  const handleRecordClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (notification.recordUrl) {
        setView(
          notification.recordUrl as Parameters<typeof setView>[0],
          notification.recordNumber ? { id: notification.recordNumber } : undefined,
        );
        dismissToast(notification.id);
      }
    },
    [notification.recordUrl, notification.recordNumber, setView, dismissToast, notification.id],
  );

  const handleActionClick = useCallback(() => {
    const url = notification.actionUrl || notification.recordUrl;
    if (url) {
      setView(url as Parameters<typeof setView>[0]);
      dismissToast(notification.id);
    }
  }, [notification.actionUrl, notification.recordUrl, setView, dismissToast, notification.id]);

  return (
    <motion.div
      layout
      variants={POPUP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={ENTER_TRANSITION}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex w-96 max-w-[calc(100vw-2rem)] pointer-events-auto',
        'rounded-xl border shadow-lg backdrop-blur-sm overflow-hidden',
        'cursor-default select-none',
        config.bgClass,
        config.borderClass,
        'transition-colors duration-200',
      )}
      role="alert"
      aria-live={notification.type === 'error' || notification.type === 'permission_denied' ? 'assertive' : 'polite'}
      aria-label={`${config.ariaLabel}: ${notification.title}`}
    >
      {/* Content wrapper */}
      <div className="flex items-start gap-3 p-4 w-full">
        {/* Status icon */}
        <div className={cn('flex-shrink-0 rounded-lg p-1.5', config.iconBgClass)}>
          <IconComponent
            className={cn(
              'h-4.5 w-4.5',
              config.textClass,
              isSpinnerType && 'animate-spin',
            )}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Title + Close */}
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm font-semibold leading-tight truncate',
                config.textClass,
              )}
            >
              {notification.title}
            </p>

            {/* Close button — visible on hover */}
            {!notification.persistent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className={cn(
                  'flex-shrink-0 rounded-md p-1 transition-colors',
                  'hover:bg-black/5 dark:hover:bg-white/5',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100',
                  'text-muted-foreground hover:text-foreground',
                )}
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Description */}
          {notification.description && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {notification.description}
            </p>
          )}

          {/* Record number badge + Timestamp row */}
          {(notification.recordNumber || timestamp) && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {notification.recordNumber && (
                <button
                  onClick={handleRecordClick}
                  className={cn(
                    'font-mono text-[11px] px-2 py-0.5 rounded-md',
                    'bg-black/5 dark:bg-white/5',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-black/10 dark:hover:bg-white/10',
                    'transition-colors duration-150 cursor-pointer',
                    'border border-transparent hover:border-border',
                    'truncate max-w-[180px]',
                  )}
                  title={notification.recordUrl ? `Go to ${notification.recordNumber}` : notification.recordNumber}
                >
                  {notification.recordNumber}
                </button>
              )}

              {notification.recordNumber && timestamp && (
                <span className="text-muted-foreground/40 text-[10px]">·</span>
              )}

              {timestamp && (
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(timestamp)}
                </span>
              )}
            </div>
          )}

          {/* Action button */}
          {notification.actionLabel && (notification.actionUrl || notification.recordUrl) && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick();
                }}
                className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}
              >
                {notification.actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auto-dismiss timer bar */}
      {!notification.persistent && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-black/10 dark:bg-white/10 origin-left"
          style={{
            animation: `ep-timer-shrink ${duration}ms linear forwards`,
            animationPlayState: isHovered ? 'paused' : 'running',
          }}
        />
      )}
    </motion.div>
  );
}

// ============================================================
// Container Component
// ============================================================

export function EnterprisePopupContainer() {
  const { toasts, settings } = useNotificationStore();

  // Position classes for desktop
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  // Mobile: always top-center
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const posClass = isMobile ? 'top-4 left-1/2 -translate-x-1/2' : positionClasses[settings.position];

  // Reduced motion: render without AnimatePresence
  if (settings.reducedMotion) {
    return (
      <div
        className={cn('fixed z-[9999] flex flex-col gap-2 pointer-events-none', posClass)}
        aria-label="Notifications"
      >
        {toasts.map((toast) =>
          isEnterpriseToast(toast) ? (
            <EnterprisePopup key={toast.id} notification={toast} />
          ) : (
            <NotificationToast key={toast.id} notification={toast} />
          ),
        )}
      </div>
    );
  }

  return (
    <>
      {/* Inject keyframes for the timer bar animation */}
      <style>{`
        @keyframes ep-timer-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

      <div
        className={cn('fixed z-[9999] flex flex-col gap-2 pointer-events-none', posClass)}
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) =>
            isEnterpriseToast(toast) ? (
              <EnterprisePopup key={toast.id} notification={toast} />
            ) : (
              <NotificationToast key={toast.id} notification={toast} />
            ),
          )}
        </AnimatePresence>
      </div>
    </>
  );
}