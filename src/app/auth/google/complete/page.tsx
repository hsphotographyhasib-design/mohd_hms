'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2 } from 'lucide-react';

/**
 * Post-OAuth handoff page.
 *
 * The callback route set a short-lived HttpOnly cookie containing the session
 * token + user payload. We call /api/auth/google/session once to read and
 * clear it, then write the token/user into localStorage (matching the email
 * and WhatsApp flows) and redirect into the app.
 */
export default function GoogleCompletePage() {
  const ran = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') || '/';

    fetch('/api/auth/google/session', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
        return res.json() as Promise<{ token: string; user: Record<string, unknown> }>;
      })
      .then(({ token, user }) => {
        try {
          localStorage.setItem('cmms_token', token);
          localStorage.setItem('cmms_user', JSON.stringify(user));
        } catch {
          /* storage might be blocked; fall through to redirect anyway */
        }
        const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/';
        window.location.replace(safeReturnTo);
      })
      .catch(() => {
        setErrorMessage('Google sign-in could not be completed. Please try again.');
        setTimeout(() => {
          window.location.replace('/?googleAuthError=session_pickup_failed');
        }, 2500);
      });
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Building2 className="h-12 w-12 text-emerald-600 animate-pulse" />
        <p className="text-base text-gray-700 dark:text-gray-300">
          {errorMessage ?? 'Finishing Google sign-in…'}
        </p>
      </div>
    </div>
  );
}
