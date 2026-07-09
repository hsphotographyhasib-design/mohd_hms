// ─── Components ───────────────────────────────────────────────────────────────
export { NotificationList } from './components/notification-list';
export {
  NotificationPermissionBanner,
  EnablePushButton,
  TestNotificationButton,
} from './components/ui/notification-permission';
export { NotificationHistoryPanel } from './components/ui/notification-history';
export {
  NotificationToast,
  NotificationContainer,
} from './components/ui/notification-toast';
export { NotificationProvider } from './components/ui/notification-provider';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useNotification } from './hooks/use-notification';
export { useNotificationPolling } from './hooks/use-notification-polling';

// ─── Services ─────────────────────────────────────────────────────────────────
export {
  type RealtimeNotification,
  realtimeNotificationStore,
  useNotificationRealtime,
} from './services/notifications/realtime';
export {
  type FcmPayload,
  type DeviceInfo,
} from './services/notifications/fcm-types';
export {
  type NotificationItem,
  type ClientToast,
  type NotificationSettings as NotificationStoreSettings,
  useNotificationStore,
} from './services/notifications/store';
export {
  type NotificationType as ServiceNotificationType,
  type NotificationPriority,
  type CreateNotificationInput,
  type NotificationRecord,
  createNotification,
  createNotifications,
  notifyComplaintAssigned,
  notifyComplaintStatusChange,
  notifyWorkOrderCreated,
  notifyInvoiceCreated,
  notifyLowStock,
} from './services/notifications/notification-service';
export {
  type NotificationType,
  type NotificationModule,
  type NotificationAction,
  type Notification as AppNotification,
  type NotificationSettings as AppNotificationSettings,
  type NotificationLogEntry,
  NOTIFICATION_CONFIG,
} from './services/notifications/types';