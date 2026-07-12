/**
 * FCM Push Notification Types
 *
 * Defines the payload structure for Firebase Cloud Messaging
 * push notifications received by the client.
 */

/** Raw FCM payload structure received from the push notification */
export interface FcmPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    image?: string;
  };
  data?: {
    notificationId?: string;
    type?: string;
    actionUrl?: string;
    actionLabel?: string;
    priority?: string;
    category?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    /** Any additional key-value pairs */
    [key: string]: string | undefined;
  };
}

/** Device information sent when registering a push token */
export interface DeviceInfo {
  token: string;
  platform: string;
  browser: string;
  os: string;
  deviceName: string;
  userAgent: string;
}