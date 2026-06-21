'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/store';
import { LoginView } from '@/components/app/login-view';
import { AppShell } from '@/components/app/app-shell';

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function Home() {
  const { isAuthenticated, loadFromStorage } = useAuthStore();
  const hydrated = useHydrated();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadFromStorage();
    }
  }, [loadFromStorage]);

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

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <AppShell />;
}