'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import { Building2 } from 'lucide-react';

/**
 * AuthGuard validates the session on mount by calling /api/auth/me.
 * If the token is invalid or missing, forces logout to landing page.
 * Also handles browser back button protection and tab switch validation.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const validatedRef = useRef(false);
  const validationRef = useRef<Promise<void> | null>(null);

  // Validate session with server (defined as a stable ref-based function)
  const validateRef = useRef(async () => {
    if (validatedRef.current) return;

    const storedToken = localStorage.getItem('cmms_token');
    const storedUser = localStorage.getItem('cmms_user');

    if (!storedToken || !storedUser) {
      setIsValidating(false);
      setIsValid(false);
      return;
    }

    // Hydrate store from storage
    const state = useAuthStore.getState();
    state.loadFromStorage();

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const userData = await res.json();
        useAuthStore.setState({
          user: userData,
          token: storedToken,
          isAuthenticated: true,
        });
        validatedRef.current = true;
        setIsValid(true);
      } else {
        localStorage.clear();
        sessionStorage.clear();
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        setIsValid(false);
      }
    } catch {
      // Network error — allow with stored token (heartbeat will catch later)
      validatedRef.current = true;
      setIsValid(true);
    }

    setIsValidating(false);
  });

  // Start validation on mount
  useEffect(() => {
    validateRef.current();
  }, []);

  // Browser back button protection
  useEffect(() => {
    if (!isValid) return;

    const handlePopState = () => {
      const state = useAuthStore.getState();
      if (!state.isAuthenticated) {
        window.history.pushState(null, '', '/');
      }
    };

    window.history.pushState(null, '', '/');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isValid]);

  // Tab visibility change — revalidate on tab focus
  useEffect(() => {
    if (!isValid) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validatedRef.current = false;
        validateRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isValid]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Building2 className="h-12 w-12 text-emerald-600 animate-pulse" />
          <p className="text-muted-foreground text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return null;
  }

  return <>{children}</>;
}