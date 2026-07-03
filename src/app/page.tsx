'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/store';
import { LoginView } from '@/components/app/login-view';
import { AppShell } from '@/components/app/app-shell';
import { AuthGuard } from '@/components/session/auth-guard';
import { IdleTimerProvider } from '@/components/session/idle-timer';
import { SessionProvider } from '@/components/session/session-provider';
import { NotificationProvider } from '@/components/notifications/notification-provider';
import { setupFetchInterceptor } from '@/hooks/use-secure-fetch';

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function FetchInterceptorSetup() {
  useEffect(() => { setupFetchInterceptor(); }, []);
  return null;
}

function ToastListener() {
  useEffect(() => {
    const handleToast = (e: Event) => {
      const { type = 'info', message = '' } = (e as CustomEvent).detail || {};
      // Bridge to existing sonner toast
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({ title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info', description: message, variant: type === 'error' ? 'destructive' : 'default' });
      });
      // Bridge to new enterprise notification system
      import('@/lib/notifications/store').then(({ useNotificationStore }) => {
        const nType = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
        useNotificationStore.getState().add({ type: nType, title: message || (type === 'error' ? 'Error' : 'Info') });
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
      <IdleTimerProvider>
        <AppShell />
      </IdleTimerProvider>
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

  // Handle Google OAuth callback (runs on every page load, before auth check)
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;

      // --- Google OAuth callback handler ---
      const hash = window.location.hash;
      if (hash.includes('google_auth=1')) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const errorMsg = params.get('error');
        const token = params.get('token');
        const userJson = params.get('user');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        if (errorMsg) {
          import('sonner').then(({ toast }) => toast.error(errorMsg));
          return;
        }

        if (token && userJson) {
          try {
            const user = JSON.parse(userJson);
            localStorage.setItem('cmms_token', token);
            localStorage.setItem('cmms_user', JSON.stringify(user));
            useAuthStore.setState({ user, token, isAuthenticated: true });
            window.dispatchEvent(
              new CustomEvent('cmms:toast', { detail: { type: 'success', message: `Welcome, ${user.name}!` } }),
            );
            return; // Auth state set, component will re-render with app
          } catch {
            import('sonner').then(({ toast }) => toast.error('Google sign-in failed.'));
            return;
          }
        }
      }

      // --- Normal localStorage restore ---
      const token = localStorage.getItem('cmms_token');
      const userStr = localStorage.getItem('cmms_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          useAuthStore.setState({ user, token, isAuthenticated: true });
        } catch {
          localStorage.clear();
        }
      }
    }
  }, []);

  if (!hydrated) {
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
      <NotificationProvider>
        <FetchInterceptorSetup />
        <ToastListener />
        {isAuthenticated ? (
          <ProtectedApp />
        ) : showLogin ? (
          <LoginView />
        ) : (
          <LandingHome onSignIn={() => setShowLogin(true)} />
        )}
      </NotificationProvider>
    </SessionProvider>
  );
}