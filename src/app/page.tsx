'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/app-shell/store';
import type { AuthUser } from '@/core/types';
import { useNotificationStore } from '@/modules/notifications/services/store';
import { LoginView } from '@/app-shell/login-view';
import { AppShell } from '@/app-shell/app-shell';
import { AuthGuard } from '@/core/auth/session/auth-guard';
import { IdleTimerProvider } from '@/core/auth/session/idle-timer';
import { SessionProvider } from '@/core/auth/session/session-provider';
import { NotificationProvider } from '@/modules/notifications/components/ui/notification-provider';
import { ConfirmProvider } from '@/shared/ui/confirm-provider';
import { QueryProvider } from '@/app-shell/providers/query-provider';
import { setupFetchInterceptor } from '@/shared/hooks/use-secure-fetch';
import { useNotificationPolling } from '@/modules/notifications/hooks/use-notification-polling';
import { useFcm } from '@/core/firebase/hooks/use-fcm';
import { NotificationPermissionBanner } from '@/modules/notifications/components/ui/notification-permission';

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
// Wrapped in SafeLandingHome with error boundary to handle Turbopack chunk load failures
const LandingHome = dynamic(
  () => import('@/landing/components/landing-home').then(mod => ({ default: mod.LandingHome })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Building2 className="h-12 w-12 text-emerald-600 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    ),
  }
);

function SafeLandingHome({ onSignIn }: { onSignIn: () => void }) {
  const [chunkError, setChunkError] = useState(false);

  if (chunkError) {
    return <LoginView />;
  }

  return (
    <ErrorBoundary onError={() => setChunkError(true)}>
      <LandingHome onSignIn={onSignIn} />
    </ErrorBoundary>
  );
}

// Minimal error boundary for catching chunk load errors
class ErrorBoundary extends React.Component<{ onError: () => void; children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.hasError ? null : this.props.children; }
}

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
            <SafeLandingHome onSignIn={() => setShowLogin(true)} />
          )}
        </NotificationProvider>
      </ConfirmProvider>
    </SessionProvider>
  );
}