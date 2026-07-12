'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/store';

const BROADCAST_CHANNEL = 'cmms-logout';

function performLogout(reason: string) {
  const { logout } = useAuthStore.getState();
  const { setView } = useAppStore.getState();

  localStorage.clear();
  sessionStorage.clear();
  logout();
  setView('dashboard');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cmms:toast', {
        detail: { type: 'info', message: reason },
      })
    );
  }
}

/**
 * Broadcasts logout events to all tabs via BroadcastChannel API.
 * Falls back to storage events for older browsers.
 */
export function BroadcastLogout() {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === 'LOGOUT') {
          performLogout(event.data.reason || 'Logged out from another tab');
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cmms_logout_broadcast' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'LOGOUT') {
            performLogout(data.reason || 'Logged out from another tab');
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      channelRef.current?.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
}

/**
 * Broadcast logout to all other tabs
 */
export function broadcastLogoutEvent(reason: string) {
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.postMessage({ type: 'LOGOUT', reason });
    channel.close();
  } catch {
    localStorage.setItem(
      'cmms_logout_broadcast',
      JSON.stringify({ type: 'LOGOUT', reason, timestamp: Date.now() })
    );
    setTimeout(() => {
      localStorage.removeItem('cmms_logout_broadcast');
    }, 100);
  }
}