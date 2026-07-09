'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/app-shell/store';
import { LoginView } from '@/app-shell/login-view';
import { AppShell } from '@/app-shell/app-shell';
import { AuthGuard } from '@/core/auth/session/auth-guard';
import { IdleTimerProvider } from '@/core/auth/session/idle-timer';
import { SessionProvider } from '@/core/auth/session/session-provider';
import { NotificationProvider } from '@/modules/notifications/components/ui/notification-provider';
import { ConfirmProvider } from '@/shared/ui/confirm-provider';
import { QueryProvider } from '@/app-shell/providers/query-provider';
import { MapsProvider } from '@/core/maps/maps-context';
import { setupFetchInterceptor, markLoginTime } from '@/shared/hooks/use-secure-fetch';
import { useNotificationPolling } from '@/modules/notifications/hooks/use-notification-polling';
import { useNotificationStore } from '@/modules/notifications/services/store';

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Dynamic import — landing CSS/JS only loaded when user is NOT authenticated
const LandingHome = dynamic(
  () => import('@/landing/components/landing-home').then(mod => ({ default: mod.LandingHome })),
  { ssr: false }
);

function SetupHelpers() {
  useEffect(() => { setupFetchInterceptor(); }, []);
  useNotificationPolling();
  return null;
}

function ToastListener() {
  useEffect(() => {
    const handleToast = (e: Event) => {
      const { type = 'info', message = '' } = (e as CustomEvent).detail || {};
      const store = useNotificationStore.getState();
      store.addToast({
        type: type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info',
        title: message || (type === 'error' ? 'Error' : 'Info'),
      });
    };
    window.addEventListener('cmms:toast', handleToast);
    return () => window.removeEventListener('cmms:toast', handleToast);
  }, []);
  return null;
}

function ProtectedApp() {
  return (
    <AuthGuard>
      <QueryProvider>
        <MapsProvider>
          <IdleTimerProvider>
            <AppShell />
          </IdleTimerProvider>
        </MapsProvider>
      </QueryProvider>
    </AuthGuard>
  );
}

export default function AppEntry() {
  const { isAuthenticated } = useAuthStore();
  const hydrated = useHydrated();
  const [showLogin, setShowLogin] = useState(false);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const token = localStorage.getItem('cmms_token');
      const userStr = localStorage.getItem('cmms_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          useAuthStore.setState({ user, token, isAuthenticated: true });
          markLoginTime(); // Grace period for page refresh
        } catch {
          localStorage.clear();
        }
      }
    }
  }, []);

  if (!hydrated) {
    return null;
  }

  return (
    <SessionProvider>
      <ConfirmProvider>
        <NotificationProvider>
          <SetupHelpers />
          <ToastListener />
          {isAuthenticated ? (
            <ProtectedApp />
          ) : showLogin ? (
            <LoginView />
          ) : (
            <LandingHome onSignIn={() => setShowLogin(true)} />
          )}
        </NotificationProvider>
      </ConfirmProvider>
    </SessionProvider>
  );
}