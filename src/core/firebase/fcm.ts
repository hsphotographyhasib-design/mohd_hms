/**
 * FCM Client Module for MOHD.HMS Frontend.
 *
 * Handles:
 * - Browser notification permission
 * - Device token registration/unregistration
 * - Foreground message listener
 * - Token refresh handling
 */

import {
  getMessagingInstance,
  getVapidKey,
  isFirebaseAvailable,
} from './firebase';
import { getToken, deleteToken, onMessage, Unsubscribe } from 'firebase/messaging';

// ─── Permission Management ──────────────────────────────────────────────

/**
 * Request browser notification permission.
 * Returns the permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

/**
 * Get current notification permission without prompting.
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

// ─── Device Detection ───────────────────────────────────────────────────

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'web';
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  return 'Unknown';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function getDeviceName(): string {
  const browser = detectBrowser();
  const os = detectOS();
  return `${browser} on ${os}`;
}

// ─── Device Token Registration ───────────────────────────────────────────

let currentToken: string | null = null;
let isRegistering = false;

/**
 * Register the device token with the backend.
 * Returns the FCM token on success, null on failure.
 */
export async function registerDeviceToken(): Promise<string | null> {
  if (!isFirebaseAvailable()) {
    console.log('[FCM] Firebase not configured — skipping device registration');
    return null;
  }

  if (isRegistering) {
    console.log('[FCM] Registration already in progress');
    return currentToken;
  }

  isRegistering = true;

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log('[FCM] Messaging not available');
      return null;
    }

    const vapidKey = getVapidKey();
    if (!vapidKey) {
      console.log('[FCM] VAPID key not configured — cannot get token');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await getSWRegistration(),
    });

    if (!token) {
      console.log('[FCM] No token received');
      return null;
    }

    currentToken = token;
    console.log('[FCM] Device token obtained');

    // Send to backend
    await sendTokenToBackend(token);

    // NOTE: onTokenRefresh() was removed in Firebase v9+ modular API.
    // Token freshness is handled by calling getToken() on every app start
    // (this function runs on each session), which returns a refreshed token
    // when the previous one was invalidated.

    return token;
  } catch (err) {
    console.error('[FCM] Device registration failed:', err);
    return null;
  } finally {
    isRegistering = false;
  }
}

/**
 * Unregister the device token (on logout).
 */
export async function unregisterDeviceToken(): Promise<void> {
  const messaging = await getMessagingInstance();
  if (messaging && currentToken) {
    try {
      await deleteToken(messaging);
    } catch {
      // Ignore
    }
  }

  if (currentToken) {
    // Tell backend to remove the token
    try {
      const authHeader = getAuthHeader();
      if (authHeader) {
        await fetch('/api/notifications/devices/unregister', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ token: currentToken }),
        });
      }
    } catch {
      // Ignore
    }
    currentToken = null;
  }
}

// ─── Foreground Message Listener ────────────────────────────────────────

/**
 * Listen for foreground FCM messages.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(callback: (payload: any) => void): () => void {
  let unsub: Unsubscribe | null = null;

  getMessagingInstance().then((messaging) => {
    if (messaging) {
      unsub = onMessage(messaging, callback);
    }
  });

  return () => {
    if (unsub) unsub();
  };
}

// ─── Utility ────────────────────────────────────────────────────────────

export function isFcmAvailable(): boolean {
  return isFirebaseAvailable();
}

async function getSWRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return undefined;
  try {
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (err) {
    console.error('[FCM] Service worker registration failed:', err);
    return undefined;
  }
}

function getAuthHeader(): string | null {
  try {
    const token = localStorage.getItem('cmms_token');
    if (token) return `Bearer ${token}`;
  } catch {
    // Not in browser
  }
  return null;
}

async function sendTokenToBackend(token: string): Promise<void> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    console.log('[FCM] No auth token — skipping backend registration');
    return;
  }

  try {
    const res = await fetch('/api/notifications/devices/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        token,
        platform: detectPlatform(),
        browser: detectBrowser(),
        os: detectOS(),
        deviceName: getDeviceName(),
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn('[FCM] Backend registration failed:', data.error || res.status);
    } else {
      console.log('[FCM] Device registered with backend');
    }
  } catch (err) {
    console.error('[FCM] Backend registration error:', err);
  }
}