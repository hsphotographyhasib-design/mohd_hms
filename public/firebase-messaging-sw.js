 
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

// ─── Firebase Config (hardcoded for reliability) ──────────────────

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBall9UEdFqCudYlOWHbTAEOIZHasqMVjE",
  authDomain: "mohd-hms-enterprise.firebaseapp.com",
  projectId: "mohd-hms-enterprise",
  storageBucket: "mohd-hms-enterprise.firebasestorage.app",
  messagingSenderId: "49370297010",
  appId: "1:49370297010:web:d2e892fa18a30c724d0fab",
};

var firebaseApp = null;
var messaging = null;

// ─── Initialize Firebase ──────────────────────────────────────────

async function initFirebase() {
  try {
    // Also try to fetch from API in case config changes
    try {
      var res = await fetch('/api/notifications/firebase-config');
      if (res.ok) {
        var apiConfig = await res.json();
        if (apiConfig.apiKey && apiConfig.projectId) {
          FIREBASE_CONFIG = apiConfig;
          console.log('[FCM SW] Using config from API');
        }
      }
    } catch (e) {
      // Use hardcoded config
    }

    if (!firebase.apps || !firebase.apps.length) {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = firebase.apps[0];
    }

    messaging = firebase.messaging(firebaseApp);

    // Handle background messages
    messaging.onBackgroundMessage(function(payload) {
      var notification = payload.notification || {};
      var data = payload.data || {};

      var title = notification.title || 'MOHD.HMS';
      var body = notification.body || '';
      var icon = notification.icon || '/logo-512.png';
      var actionUrl = data.actionUrl || '/';
      var notificationId = data.notificationId || '';

      self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: '/logo-512.png',
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

// ─── Notification Click Handler ────────────────────────────────────

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var url = event.notification.data?.actionUrl || '/';
  var notificationId = event.notification.data?.notificationId || '';
  var relatedEntityType = event.notification.data?.relatedEntityType || '';
  var relatedEntityId = event.notification.data?.relatedEntityId || '';

  // Build proper internal navigation path
  var targetUrl = '/';
  if (relatedEntityType && relatedEntityId) {
    targetUrl = '/' + relatedEntityType.replace('_', '-') + '-detail?id=' + relatedEntityId;
  } else if (url && url.startsWith('/')) {
    targetUrl = url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      // Try to focus an existing tab
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
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

// ─── Push Event Handler ────────────────────────────────────────────

self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    var payload = event.data.json();
    var notification = payload.notification || {};
    var data = payload.data || {};

    var title = notification.title || 'MOHD.HMS';
    var body = notification.body || '';

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: notification.icon || '/logo-512.png',
        badge: '/logo-512.png',
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

// ─── Message Handler (from main app) ───────────────────────────────

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Install & Activate ────────────────────────────────────────────

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