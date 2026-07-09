'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Loader2, AlertTriangle, Info, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/core/utils/utils';

// ============ TYPES ============

export interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  /** Show a loading spinner on the confirm button while async onConfirm runs */
  asyncConfirm?: boolean;
  /** If true, confirmation text must be typed to proceed (destructive actions) */
  requireConfirmationText?: string;
}

type ConfirmState = (ConfirmOptions & { resolve: (value: boolean) => void }) | null;

// ============ MODULE-LEVEL STATE ============
// Outside React — any component can call confirm() imperatively

let currentConfirm: ConfirmState = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function setOpen(state: ConfirmState) {
  currentConfirm = state;
  emitChange();
}

// ============ IMPERATIVE API ============

/**
 * Show a confirmation dialog and return a Promise<boolean>.
 *
 * Usage:
 *   const ok = await confirm({ description: 'Delete this item?' });
 *   if (ok) { ... }
 */
export function confirm(options: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions = typeof options === 'string' ? { description: options } : options;
  return new Promise<boolean>((resolve) => {
    setOpen({ ...opts, resolve });
  });
}

// ============ REACT HOOK ============

/**
 * Returns the `confirm()` function for use in components.
 *
 * const { confirm } = useConfirm();
 * const ok = await confirm({ title: 'Delete?', description: 'This cannot be undone.', variant: 'danger' });
 */
export function useConfirm() {
  const confirmFn = useCallback((options: ConfirmOptions | string) => confirm(options), []);
  return { confirm: confirmFn };
}

// ============ PROVIDER COMPONENT ============

// Variant styles
const VARIANT_STYLES = {
  danger: {
    icon: XCircle,
    iconClass: 'text-rose-500',
    confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
  },
} as const;

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [, forceRender] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to module-level state changes
  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  // Auto-focus the confirmation text input when dialog opens
  useEffect(() => {
    if (currentConfirm?.requireConfirmationText) {
      // Small delay to let the dialog animation complete
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentConfirm?.requireConfirmationText]);

  const handleConfirm = useCallback(async () => {
    if (!currentConfirm) return;

    // Check confirmation text match
    if (currentConfirm.requireConfirmationText) {
      if (confirmText !== currentConfirm.requireConfirmationText) return;
    }

    // Handle async confirmation
    if (currentConfirm.asyncConfirm) {
      setLoading(true);
      try {
        // The caller handles the async work after confirm() resolves
        currentConfirm.resolve(true);
      } finally {
        setLoading(false);
      }
    } else {
      currentConfirm.resolve(true);
    }

    setConfirmText('');
    setOpen(null);
  }, [confirmText]);

  const handleCancel = useCallback(() => {
    if (!currentConfirm) return;
    currentConfirm.resolve(false);
    setConfirmText('');
    setLoading(false);
    setOpen(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && currentConfirm) {
        currentConfirm.resolve(false);
        setConfirmText('');
        setLoading(false);
        setOpen(null);
      }
    },
    [currentConfirm],
  );

  const variant = currentConfirm?.variant ?? 'info';
  const variantStyle = VARIANT_STYLES[variant];
  const Icon = variantStyle.icon;
  const canConfirm =
    !currentConfirm?.requireConfirmationText ||
    confirmText === currentConfirm.requireConfirmationText;

  return (
    <>
      {children}
      <AlertDialog open={!!currentConfirm} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className={cn('mt-0.5 shrink-0', variantStyle.iconClass)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <AlertDialogTitle className="text-base font-semibold">
                  {currentConfirm?.title ?? (variant === 'danger' ? 'Confirm Action' : 'Confirmation')}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {currentConfirm?.description}
                </AlertDialogDescription>

                {/* Confirmation text input for destructive actions */}
                {currentConfirm?.requireConfirmationText && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      Type <strong className="font-semibold text-gray-700 dark:text-gray-300">&quot;{currentConfirm.requireConfirmationText}&quot;</strong> to confirm:
                    </p>
                    <input
                      ref={inputRef}
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canConfirm) handleConfirm();
                      }}
                      placeholder={currentConfirm.requireConfirmationText}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-400/20 transition-colors"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {currentConfirm?.cancelText ?? 'Cancel'}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !canConfirm}
              className={cn('flex-1 sm:flex-none', variantStyle.confirmClass)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentConfirm?.confirmText ?? 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}