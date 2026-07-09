// Email barrel export

// Legacy email helper (backward compatibility)
export { sendEmail as sendEmailLegacy } from './email';
export type { SendEmailParams as LegacySendEmailParams } from './email';

// Email service (centralized, with queue, retry, logging)
export { sendEmail, startQueueProcessor, updateEmailStatus, getEmailStats, getEmailLogs, retryFailedEmail, getQueueStatus } from './service';
export type {
  SendEmailParams,
  SendEmailResult,
  EmailStatus,
  EmailModule,
  EmailLogEntry,
  EmailStats,
  EmailFilter,
} from './service/types';

// Email providers
export { getActiveProvider, sendViaProvider, refreshProviderCache } from './service/providers';
export type { ProviderName } from './service/providers';
export { isBrevoConfigured, isSmtpConfigured } from './service/providers';

// Email templates
export * from './service/templates';