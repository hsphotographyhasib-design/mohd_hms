/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker for MOHD.HMS Enterprise.
 *
 * This handles:
 * - Background push notifications (when app is not focused)
 * - Notification click → deep link to correct page
 * - Foreground message relay to the main app tab
 *
 * IMPORTANT: This is plain JS (no TypeScript, no ES modules).
 * Service workers run in an isolated context.
 */

let firebaseApp = null;
let messaging = null;

// ─── Initialize Firebase from config endpoint ──────────────────────────

async function initFirebase() {
  try {
    // Fetch public Firebase config from our API
    const res = await fetch('/api/notifications/firebase-config');
    if (!res.ok) return;
    const config = await res.json();

    if (!config.apiKey || !config.projectId) {
      console.log('[FCM SW] Firebase not configured');
      return;
    }

    // Check if already initialized
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.apps[0];
    }

    messaging = firebase.messaging(firebaseApp);

    // Handle background messages
    messaging.onBackgroundMessage(function(payload) {
      const notification = payload.notification || {};
      const data = payload.data || {};

      const title = notification.title || 'MOHD.HMS';
      const body = notification.body || '';
      const icon = notification.icon || '/logo-192.png';
      const actionUrl = data.actionUrl || '/';
      const notificationId = data.notificationId || '';

      self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: '/logo-192.png',
        tag: notificationId || 'mohd-hms-' + Date.now(),
        data: {
          actionUrl: actionUrl,
          notificationId: notificationId,
          type: data.type || '',
          category: data.category || '',
          relatedEntityType: data.relatedEntityType || '',
          relatedEntityId: data.relatedEntityId || '',
        },
        requireInteraction: (data.priority === 'urgent' || data.priority === 'high'),
        vibrate: data.priority === 'urgent' ? [200, 100, 200] : undefined,
      });

      console.log('[FCM SW] Background notification shown:', title);
    });

    console.log('[FCM SW] Firebase initialized successfully');
  } catch (err) {
    console.error('[FCM SW] Initialization failed:', err);
  }
}

// ─── Notification Click Handler ────────────────────────────────────────

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = event.notification.data?.actionUrl || '/';
  const notificationId = event.notification.data?.notificationId || '';
  const relatedEntityType = event.notification.data?.relatedEntityType || '';
  const relatedEntityId = event.notification.data?.relatedEntityId || '';

  // Build proper internal navigation path
  let targetUrl = '/';
  if (relatedEntityType && relatedEntityId) {
    targetUrl = '/' + relatedEntityType.replace('_', '-') + '-detail?id=' + relatedEntityId;
  } else if (url && url.startsWith('/')) {
    targetUrl = url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      // Try to focus an existing tab
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Send message to the focused tab to handle navigation
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            actionUrl: targetUrl,
            notificationId: notificationId,
          });
          return client.focus();
        }
      }
      // No open tab — open a new one
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Push Event Handler ────────────────────────────────────────────────

self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notification = payload.notification || {};
    const data = payload.data || {};

    const title = notification.title || 'MOHD.HMS';
    const body = notification.body || '';

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: notification.icon || '/logo-192.png',
        badge: '/logo-192.png',
        tag: data.notificationId || 'mohd-hms-' + Date.now(),
        data: {
          actionUrl: data.actionUrl || '',
          notificationId: data.notificationId || '',
          type: data.type || '',
          category: data.category || '',
          relatedEntityType: data.relatedEntityType || '',
          relatedEntityId: data.relatedEntityId || '',
          priority: data.priority || 'normal',
        },
        requireInteraction: (data.priority === 'urgent' || data.priority === 'high'),
      })
    );
  } catch (err) {
    console.error('[FCM SW] Push event error:', err);
  }
});

// ─── Message Handler (from main app) ───────────────────────────────────

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Install & Activate ───────────────────────────────────────────────

self.addEventListener('install', function(event) {
  console.log('[FCM SW] Installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  console.log('[FCM SW] Activating...');
  event.waitUntil(
    self.clients.claim().then(function() {
      console.log('[FCM SW] Claimed all clients');
    })
  );
});

// Start initialization
initFirebase();