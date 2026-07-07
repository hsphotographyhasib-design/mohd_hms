/**
 * Firebase Admin SDK initialization for MOHD.HMS Backend.
 *
 * All config comes from environment variables — never hard-coded.
 * If config is missing, the app still works; FCM features are disabled.
 */

import admin from 'firebase-admin';

let _app: admin.app.App | null = null;

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseURL?: string;
}

function loadConfig(): FirebaseConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  // Private key from env may have literal \n that needs to be real newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey, databaseURL };
}

/**
 * Get or create the Firebase Admin app singleton.
 * Returns null if Firebase is not configured.
 */
export function getFirebaseApp(): admin.app.App | null {
  if (_app) return _app;

  const config = loadConfig();
  if (!config) {
    console.warn('[Firebase] Admin SDK not configured — FCM disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    return null;
  }

  try {
    const cred = admin.credential.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    });

    _app = admin.initializeApp({
      credential: cred,
      ...(config.databaseURL && { databaseURL: config.databaseURL }),
    }, 'mohd-hms-admin');

    console.log(`[Firebase] Admin SDK initialized for project: ${config.projectId}`);
    return _app;
  } catch (err) {
    console.error('[Firebase] Failed to initialize Admin SDK:', err);
    return null;
  }
}

/**
 * Get the Firebase Cloud Messaging instance.
 * Returns null if Firebase is not configured.
 */
export function getMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return admin.messaging(app);
  } catch (err) {
    console.error('[Firebase] Failed to get Messaging instance:', err);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return loadConfig() !== null;
}