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
export {
  EnterprisePopup,
  EnterprisePopupContainer,
  isEnterpriseToast,
} from './components/ui/enterprise-popup';
export type { EnterpriseToast } from './components/ui/enterprise-popup';
export { NotificationProvider } from './components/ui/notification-provider';

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useNotification } from './hooks/use-notification';
export { useNotificationPolling } from './hooks/use-notification-polling';

// ─── Services (client-safe only) ──────────────────────────────────────────
// NOTE: Server-side services (notification-service, role-router) are imported
// directly by API routes — NOT re-exported here to prevent native modules
// (libsql, prisma) from leaking into the client bundle.
export {
  type RealtimeNotification,
  realtimeNotificationStore,
  useNotificationRealtime,
} from './services/realtime';
export {
  type FcmPayload,
  type DeviceInfo,
} from './services/fcm-types';
export {
  type NotificationItem,
  type ClientToast,
  type NotificationSettings as NotificationStoreSettings,
  useNotificationStore,
} from './services/store';
// Server-side types (safe to re-export as type-only)
export type {
  NotificationType as ServiceNotificationType,
  NotificationPriority,
  CreateNotificationInput,
  NotificationRecord,
} from './services/notification-service';
export type {
  NotificationEventKey,
  RecipientContext,
  ResolveRecipientsParams,
  SendRoleBasedNotificationParams,
  LogNotificationEventParams,
} from './services/role-router';
export {
  type NotificationType,
  type NotificationModule,
  type NotificationAction,
  type Notification as AppNotification,
  type NotificationSettings as AppNotificationSettings,
  type NotificationLogEntry,
  NOTIFICATION_CONFIG,
} from './services/types';