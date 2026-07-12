'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store';
import { LoginView } from '@/components/app/login-view';
import { AppShell } from '@/components/app/app-shell';
import { AuthGuard } from '@/components/session/auth-guard';
import { IdleTimerProvider } from '@/components/session/idle-timer';
import { SessionProvider } from '@/components/session/session-provider';
import { NotificationProvider } from '@/components/notifications/notification-provider';
import { ConfirmProvider } from '@/components/ui/confirm-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { MapsProvider } from '@/lib/maps/maps-context';
import { setupFetchInterceptor, markLoginTime } from '@/hooks/use-secure-fetch';
import { useNotificationPolling } from '@/hooks/use-notification-polling';
import { useNotificationStore } from '@/lib/notifications/store';

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Dynamic import — landing CSS/JS only loaded when user is NOT authenticated
const LandingHome = dynamic(
  () => import('@/components/landing/landing-home').then(mod => ({ default: mod.LandingHome })),
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