'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  X,
} from 'lucide-react';
import { useNotificationStore, type ClientToast } from '@/lib/notifications/store';
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types';
import type { NotificationType } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2, XCircle, AlertTriangle, Info,
};

const DEFAULT_DURATION = 4500;

interface NotificationToastProps {
  notification: ClientToast;
}

export function NotificationToast({ notification }: NotificationToastProps) {
  const dismissToast = useNotificationStore((s) => s.dismissToast);
  const setView = useAppStore((s) => s.setView);
  const [isHovered, setIsHovered] = useState(false);

  const config = NOTIFICATION_CONFIG[notification.type as NotificationType] || NOTIFICATION_CONFIG.info;
  const IconComponent = ICON_MAP[config.icon] || Info;

  const handleDismiss = useCallback(() => {
    dismissToast(notification.id);
  }, [dismissToast, notification.id]);

  const handleActionClick = useCallback(() => {
    if (notification.actionUrl) {
      setView(notification.actionUrl as Parameters<typeof setView>[0]);
      dismissToast(notification.id);
    }
  }, [notification.actionUrl, setView, dismissToast, notification.id]);

  const duration = notification.duration || DEFAULT_DURATION;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex w-80 max-w-[calc(100vw-2rem)] pointer-events-auto',
        'rounded-xl border shadow-lg backdrop-blur-sm overflow-hidden',
        'cursor-default select-none',
        config.bgClass, config.borderClass,
        'transition-colors duration-200'
      )}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
      aria-label={`${config.ariaLabel}: ${notification.title}`}
    >
      {/* Drag indicator (mobile) */}
      <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-3 p-3.5 w-full">
        {/* Icon */}
        <div className={cn('flex-shrink-0 rounded-lg p-1.5', config.iconBgClass)}>
          <IconComponent
            className={cn('h-4.5 w-4.5', config.textClass)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold leading-tight truncate', config.textClass)}>
            {notification.title}
          </p>

          {notification.description && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {notification.description}
            </p>
          )}

          {/* Action button */}
          {notification.actionLabel && notification.actionUrl && (
            <div className="mt-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleActionClick(); }}
                className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {notification.actionLabel}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {!notification.persistent && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className={cn(
              'flex-shrink-0 rounded-md p-1 transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/5',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
              'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Auto-dismiss timer bar */}
      {!notification.persistent && !isHovered && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-black/10 dark:bg-white/10"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

/** Container that renders all visible toast notifications */
export function NotificationContainer() {
  const { toasts, settings } = useNotificationStore();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  // Mobile: always top-center
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const posClass = isMobile ? 'top-4 left-1/2 -translate-x-1/2' : positionClasses[settings.position];

  if (settings.reducedMotion) {
    return (
      <div
        className={cn('fixed z-[9999] flex flex-col gap-2 pointer-events-none', posClass)}
        aria-label="Notifications"
      >
        {toasts.map((n) => (
          <div key={n.id}>
            <NotificationToast notification={n} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('fixed z-[9999] flex flex-col gap-2 pointer-events-none', posClass)}
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((n) => (
          <NotificationToast key={n.id} notification={n} />
        ))}
      </AnimatePresence>
    </div>
  );
}