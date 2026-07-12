'use client';

import { useEffect } from 'react';
import { BroadcastLogout } from './broadcast-logout';
import { SessionHeartbeat } from './session-heartbeat';

/**
 * SessionProvider wraps the entire application and provides:
 * - Multi-tab logout synchronization (BroadcastLogout)
 * - Session heartbeat validation (SessionHeartbeat)
 *
 * The IdleTimerProvider wraps the children separately because it
 * needs to be inside the auth boundary.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Global: always active */}
      <BroadcastLogout />
      <SessionHeartbeat />
      {children}
    </>
  );
}