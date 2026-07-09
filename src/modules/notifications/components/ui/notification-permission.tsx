'use client';

import { useState } from 'react';
import { Bell, BellOff, X, Loader2, Zap } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/core/utils/utils';
import { useFcm } from '@/core/firebase/hooks/use-fcm';
import { useAuthStore } from '@/app-shell/store';

/**
 * Notification Permission Banner.
 *
 * Shows after login if:
 * - FCM is configured
 * - Permission is "default" (not yet asked)
 * - User hasn't dismissed this banner
 *
 * Also shows a small "Enable Push" button in the notification bell dropdown.
 */
export function NotificationPermissionBanner() {
  const { isAuthenticated, user } = useAuthStore();
  const { permissionStatus, isSupported, isLoading, requestPermission } = useFcm();
  const [dismissed, setDismissed] = useState(false);
  const [justRequested, setJustRequested] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  // Don't show if:
  if (!isAuthenticated || !isSupported || permissionStatus === 'granted' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    const perm = await requestPermission();
    setJustRequested(true);
    if (perm === 'denied') {
      // Keep banner visible so user can see the "dismiss" option
    } else {
      // Permission granted — banner will auto-hide
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('cmms_notif_banner_dismissed', '1'); } catch {}
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md">
      <div className={cn(
        'flex items-start gap-3 rounded-xl border p-4 shadow-lg',
        'bg-white dark:bg-zinc-900 border-emerald-200 dark:border-emerald-800'
      )}>
        <div className="flex-shrink-0 mt-0.5">
          {justRequested && permissionStatus === 'denied' ? (
            <BellOff className="h-5 w-5 text-amber-500" />
          ) : (
            <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {justRequested && permissionStatus === 'denied' ? (
            <>
              <p className="text-sm font-medium text-foreground">Notifications blocked</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable notifications in your browser settings to receive real-time alerts.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Enable Push Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stay updated with real-time alerts for complaints, work orders, and more.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!justRequested && (
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={isLoading}
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Zap className="h-3.5 w-3.5 mr-1" />
              )}
              Enable
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Small button for inline notification permission request.
 * Used inside the notification bell dropdown.
 */
export function EnablePushButton() {
  const { permissionStatus, isSupported, isLoading, requestPermission } = useFcm();

  if (!isSupported || permissionStatus === 'granted' || permissionStatus === 'denied') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={requestPermission}
      disabled={isLoading}
      className="w-full justify-start gap-2 h-8 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      Enable Push Notifications
    </Button>
  );
}

/**
 * Admin test notification button.
 */
export function TestNotificationButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');
  const { isRegistered } = useFcm();

  const handleTest = async () => {
    setSending(true);
    setResult('idle');
    try {
      const token = localStorage.getItem('cmms_token');
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      setResult(data.success ? 'success' : 'error');
    } catch {
      setResult('error');
    } finally {
      setSending(false);
      setTimeout(() => setResult('idle'), 3000);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleTest}
      disabled={sending}
      className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground hover:text-foreground"
    >
      {sending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : result === 'success' ? (
        <span className="text-emerald-500">✓ Sent</span>
      ) : result === 'error' ? (
        <span className="text-rose-500">✗ Failed</span>
      ) : (
        <Zap className="h-3.5 w-3.5" />
      )}
      Send Test Notification
      {!isRegistered && <span className="text-amber-500 ml-1">(No device)</span>}
    </Button>
  );
}