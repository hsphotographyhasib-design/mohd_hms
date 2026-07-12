'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/store';
import type { AuthUser } from '@/types';
import { useNotificationStore } from '@/lib/notifications/store';
import { LoginView } from '@/components/app/login-view';
import { AppShell } from '@/components/app/app-shell';
import { AuthGuard } from '@/components/session/auth-guard';
import { IdleTimerProvider } from '@/components/session/idle-timer';
import { SessionProvider } from '@/components/session/session-provider';
import { NotificationProvider } from '@/components/notifications/notification-provider';
import { ConfirmProvider } from '@/components/ui/confirm-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { setupFetchInterceptor } from '@/hooks/use-secure-fetch';
import { useNotificationPolling } from '@/hooks/use-notification-polling';
import { useFcm } from '@/hooks/use-fcm';
import { NotificationPermissionBanner } from '@/components/notifications/notification-permission';

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function FetchInterceptorSetup() {
  useEffect(() => { setupFetchInterceptor(); }, []);
  return null;
}

function NotificationPollingSetup() {
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

function FcmSetup() {
  useFcm();
  return null;
}

function ProtectedApp() {
  return (
    <AuthGuard>
      <QueryProvider>
        <IdleTimerProvider>
          <FcmSetup />
          <NotificationPermissionBanner />
          <AppShell />
        </IdleTimerProvider>
      </QueryProvider>
    </AuthGuard>
  );
}

// Dynamic import — landing CSS/JS only loaded when user is NOT authenticated
const LandingHome = dynamic(
  () => import('@/components/landing/landing-home').then(mod => ({ default: mod.LandingHome })),
  { ssr: false }
);

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const hydrated = useHydrated();
  const [showLogin, setShowLogin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const token = localStorage.getItem('cmms_token');
      const userStr = localStorage.getItem('cmms_user');
      if (token && userStr) {
        try {
          const raw = JSON.parse(userStr) as AuthUser;
          // Normalize role to lowercase (consistent with store's normalizeUser)
          const user = { ...raw, role: ((raw.role as string) || '').toLowerCase() as AuthUser['role'] };
          useAuthStore.setState({ user, token, isAuthenticated: true });
        } catch {
          localStorage.clear();
        }
      }
      // Mark auth check complete — prevents LandingHome flash for authed users
      requestAnimationFrame(() => setAuthChecked(true));
    }
  }, []);

  // Show loading until both hydration AND auth restoration are complete.
  // This prevents LandingHome from mounting (and calling CMS API) during
  // the brief flash before localStorage auth is restored.
  if (!hydrated || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Building2 className="h-12 w-12 text-emerald-600 animate-pulse" />
          <p className="text-muted-foreground">Loading FacilityPro...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <ConfirmProvider>
        <NotificationProvider>
          <FetchInterceptorSetup />
          <NotificationPollingSetup />
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