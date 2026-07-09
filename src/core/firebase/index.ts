// Firebase barrel export

// Firebase client initialization
export {
  type FirebaseClientConfig,
  getFirebaseApp,
  checkFcmSupport,
  getMessagingInstance,
  getVapidKey,
  isFirebaseAvailable,
} from './firebase';

// FCM client module (permission, registration, foreground messages)
export {
  requestNotificationPermission,
  getNotificationPermission,
  registerDeviceToken,
  unregisterDeviceToken,
  onForegroundMessage,
  isFcmAvailable,
} from './fcm';

// FCM admin module (server-side push notification sending)
export {
  type FcmMessagePayload,
  type FcmSendResult,
  isFcmAdminConfigured,
  sendFcmToToken,
  sendFcmToUser,
  sendFcmToUsers,
  logFcmDelivery,
} from './fcm-admin';

// FCM hooks
export { useFcm } from './hooks/use-fcm';