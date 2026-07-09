/**
 * Firebase Client SDK initialization for MOHD.HMS Frontend.
 *
 * All config comes from NEXT_PUBLIC_ environment variables.
 * If config is missing, the app still works; FCM features are disabled.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey?: string;
}

let _messaging: Messaging | null = null;
let _isSupported: boolean | null = null;
let _vapidKey: string | null = null;

function loadConfig(): FirebaseClientConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain: authDomain || '',
    projectId,
    storageBucket: storageBucket || '',
    messagingSenderId: messagingSenderId || '',
    appId: appId || '',
    vapidKey: vapidKey || '',
  };
}

/**
 * Get or create the Firebase app singleton.
 */
export function getFirebaseApp() {
  const config = loadConfig();
  if (!config) return null;

  if (!getApps().length) {
    return initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
  }
  return getApp();
}

/**
 * Check if Firebase Cloud Messaging is supported in this browser.
 * Results are cached after the first call.
 */
export async function checkFcmSupport(): Promise<boolean> {
  if (_isSupported !== null) return _isSupported;
  try {
    _isSupported = await isSupported();
  } catch {
    _isSupported = false;
  }
  return _isSupported;
}

/**
 * Get the Messaging instance. Returns null if not supported or not configured.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (_messaging) return _messaging;

  const supported = await checkFcmSupport();
  if (!supported) return null;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    _messaging = getMessaging(app);
    return _messaging;
  } catch (err) {
    console.error('[Firebase] Failed to get Messaging:', err);
    return null;
  }
}

/**
 * Get the VAPID key for push notifications.
 */
export function getVapidKey(): string | null {
  if (_vapidKey !== null) return _vapidKey;
  const config = loadConfig();
  _vapidKey = config?.vapidKey || null;
  return _vapidKey;
}

/**
 * Check if Firebase is fully configured and available.
 */
export function isFirebaseAvailable(): boolean {
  return loadConfig() !== null;
}