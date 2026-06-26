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
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({ title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info', description: message, variant: type === 'error' ? 'destructive' : 'default' });
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
      <FetchInterceptorSetup />
      <ToastListener />
      {isAuthenticated ? (
        <ProtectedApp />
      ) : showLogin ? (
        <LoginView />
      ) : (
        <LandingHome onSignIn={() => setShowLogin(true)} />
      )}
    </SessionProvider>
  );
}