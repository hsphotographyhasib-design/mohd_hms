// ============================================================================
// MOHD.HMS — Core Layer Master Barrel Export
// ============================================================================
// Single entry point for all core modules.
// Import from '@/core' to access any core functionality.
// ============================================================================

// ─── Database ────────────────────────────────────────────────────────
export { db, withRetry, getDbFriendlyMessage, getErrorInfo, getErrorHeaders } from './database';
export type { PrismaClient } from '../../generated/prisma/client';

// ─── Auth ────────────────────────────────────────────────────────────
export {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateAssetNumber,
  generateInvoiceNumber,
  generatePONumber,
  generateCustomerNumber,
  sanitizeInput,
  parseJsonSafe,
  ROLE_HIERARCHY,
  hasPermission,
  hasMinRole,
  canAccess,
  PERMISSIONS,
} from './auth';

// ─── Config ──────────────────────────────────────────────────────────
export { env } from './config';
export type { Env } from './config';

// ─── Logger ──────────────────────────────────────────────────────────
export { logger } from './logger';

// ─── Storage / Uploads ───────────────────────────────────────────────
export {
  getStorageProvider,
  calculateFileChecksum,
  generateStoragePath,
  formatFileSize,
  getFileExtension,
  isFileTypeAllowed,
} from './storage';
export type { StorageProvider } from './storage';

// ─── Utils ───────────────────────────────────────────────────────────
export {
  cn,
  ErrorCode,
  ApiError,
  apiSuccess,
  apiError,
  getAuth,
  requireAuth,
  requireRole,
  safeHandler,
  normalizePhone,
  normalizeDialCode,
  numberToCurrencyWords,
  generateLabelHtml,
  generateBatchLabelHtml,
} from './utils';
export type {
  ErrorCodeType,
  ApiErrorShape,
  ApiSuccessShape,
  AuthResult,
  PhoneNormalizationResult,
  EquipmentLabelData,
  CompanyInfo,
} from './utils';

// ─── Constants ───────────────────────────────────────────────────────
export {
  COMPANY,
  COMPANY_COLORS,
  DEFAULT_INVOICE_TERMS,
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_PAYMENT,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_COUNTRY,
  countries,
  LABEL_TEMPLATES,
} from './constants';
export type { Country, LabelTemplate } from './constants';

// ─── Permissions / RBAC ──────────────────────────────────────────────
export * from './permissions';

// ─── Errors ──────────────────────────────────────────────────────────
export { logErrorToServer, sanitizeError } from './errors';
export { useErrorHandler, useApiHandler } from './hooks';

// ─── Firebase / FCM ──────────────────────────────────────────────────
export {
  getFirebaseApp,
  checkFcmSupport,
  getMessagingInstance,
  getVapidKey,
  isFirebaseAvailable,
  requestNotificationPermission,
  getNotificationPermission,
  registerDeviceToken,
  unregisterDeviceToken,
  onForegroundMessage,
  isFcmAvailable,
  isFcmAdminConfigured,
  sendFcmToToken,
  sendFcmToUser,
  sendFcmToUsers,
  logFcmDelivery,
} from './firebase';
export type { FirebaseClientConfig, FcmMessagePayload, FcmSendResult } from './firebase';
export { useFcm } from './firebase';

// ─── Email ───────────────────────────────────────────────────────────
export {
  sendEmail,
  startQueueProcessor,
  updateEmailStatus,
  getEmailStats,
  getEmailLogs,
  retryFailedEmail,
  getQueueStatus,
} from './email';
export type {
  SendEmailParams,
  SendEmailResult,
  EmailStatus,
  EmailModule,
  EmailLogEntry,
  EmailStats,
  EmailFilter,
} from './email';

// ─── WhatsApp ────────────────────────────────────────────────────────
export {
  createProvider,
  renderTemplate,
  processIncomingAiMessage,
  processIncomingMessage,
  autoRouteComplaint,
  autoCreateWorkOrder,
  sendComplaintUpdate,
  sendInvoiceNotification,
  sendEtaUpdate,
  sendFeedbackRequest,
  handleEmergency,
  executeBroadcast,
  waManager,
} from './whatsapp';
export type {
  ConnectionStatus,
  SendMessageOptions,
  SendMessageResult,
  WhatsAppProviderInterface,
  WAStatus,
} from './whatsapp';

// ─── Maps ────────────────────────────────────────────────────────────
export {
  useMapsContext,
  MapsProvider,
  useMapsLoader,
  createEmptyLocationData,
} from './maps';
export type { LocationData, ComplaintMapData, DashboardComplaint, MapMarker, GoogleMapWrapperProps } from './maps';

// ─── AI ──────────────────────────────────────────────────────────────
export {
  parseActionTag,
  executeAction,
  LANGUAGE_DETECTION_PROMPT,
  INTENT_DETECTION_PROMPT,
  MAIN_SYSTEM_PROMPT,
  PAYMENT_ANALYSIS_PROMPT,
} from './ai';
export type { ActionData, ActionResult } from './ai';

// ─── Workflow ────────────────────────────────────────────────────────
export * from './workflow';

// ─── Types ───────────────────────────────────────────────────────────
export * from './types';
// Explicit re-exports resolve star-export ambiguity with ./permissions and ./workflow
export type { UserRole, ComplaintStatus } from './types';

// ─── Middleware ──────────────────────────────────────────────────────
export {
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  isEmailLocked,
  checkRegistrationRateLimit,
} from './middleware';