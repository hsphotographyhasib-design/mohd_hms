'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, Info, Loader2,
  X, Undo2, RotateCcw,
} from 'lucide-react';
import { useNotificationStore } from '@/lib/notifications/store';
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types';
import type { Notification, NotificationType } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2, XCircle, AlertTriangle, Info, Loader2,
};

interface NotificationToastProps {
  notification: Notification;
}

export function NotificationToast({ notification }: NotificationToastProps) {
  const { dismiss, undo, updateSettings, settings } = useNotificationStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [showUndo, setShowUndo] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(10);

  const config = NOTIFICATION_CONFIG[notification.type];
  const IconComponent = ICON_MAP[config.icon] || Info;
  const isLoading = notification.type === 'loading' || notification.type === 'progress';

  // Undo countdown
  React.useEffect(() => {
    if (!notification.undoable) return;
    setShowUndo(true);
    setUndoCountdown(10);
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = 10 - elapsed;
      if (remaining <= 0) {
        clearInterval(tick);
        setShowUndo(false);
      } else {
        setUndoCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [notification.id, notification.undoable]);

  const handleDismiss = useCallback(() => {
    dismiss(notification.id);
  }, [dismiss, notification.id]);

  const handleUndo = useCallback(() => {
    undo(notification.id);
  }, [undo, notification.id]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - (dragStartRef.current || clientX);
    setDragX(Math.max(0, delta)); // only allow right-to-left swipe (positive = dragged left)
  }, [isDragging]);

  const dragStartRef = useRef(0);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    // eslint-disable-next-line react-hooks/immutability -- ref mutation is intentional for drag tracking
    dragStartRef.current = clientX;
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (dragX > 100) {
      handleDismiss();
    }
    setDragX(0);
  };

  const opacity = Math.max(0, 1 - dragX / 300);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: isDragging ? opacity : 1, y: 0, scale: 1, x: isDragging ? -dragX : 0 }}
      exit={{ opacity: 0, x: isDragging ? -300 : 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleDragEnd}
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
            className={cn('h-4.5 w-4.5', config.textClass, isLoading && 'animate-spin')}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn('text-sm font-semibold leading-tight truncate', config.textClass)}>
              {notification.title}
            </p>
            {notification.module && (
              <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40 uppercase tracking-wider">
                {notification.module}
              </span>
            )}
          </div>

          {notification.description && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {notification.description}
            </p>
          )}

          {/* Progress bar */}
          {notification.type === 'progress' && typeof notification.progress === 'number' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>{notification.progress < 100 ? 'Processing...' : 'Complete'}</span>
                <span>{Math.round(notification.progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${notification.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {notification.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
                    action.variant === 'primary'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : action.variant === 'destructive'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-black/5 text-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Undo button */}
          {showUndo && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Undo2 className="h-3 w-3" />
                Undo ({undoCountdown}s)
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
      {!notification.persistent && !isLoading && !isHovered && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-black/10 dark:bg-white/10"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: (notification.undoable ? 10000 : notification.duration || DEFAULT_DURATION) / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

const DEFAULT_DURATION = 4500;

/** Container that renders all visible notifications */
export function NotificationContainer() {
  const { visible, settings } = useNotificationStore();

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
        {visible.map((n) => (
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
        {visible.map((n) => (
          <NotificationToast key={n.id} notification={n} />
        ))}
      </AnimatePresence>
    </div>
  );
}