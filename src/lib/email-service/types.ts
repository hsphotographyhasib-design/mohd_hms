// ============ Email Service Types ============

export type EmailStatus =
  | 'queued'
  | 'sending'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'
  | 'spam'
  | 'unsubscribed';

export type EmailModule =
  | 'auth'
  | 'complaints'
  | 'work-orders'
  | 'invoices'
  | 'quotations'
  | 'pm'
  | 'equipment'
  | 'inventory'
  | 'finance'
  | 'hr'
  | 'inspection'
  | 'general';

export type EmailProvider = 'brevo' | 'resend' | 'smtp-relay' | 'console';

export type ScheduleFrequency = 'one-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string; // base64 string or Buffer
  contentType?: string;
}

export interface SendEmailParams {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  templateName?: string;
  module?: EmailModule;
  attachments?: EmailAttachment[];
  metadata?: Record<string, unknown>;
  scheduledFor?: Date;
  replyTo?: string;
  tags?: string[];
}

export interface SendEmailResult {
  ok: boolean;
  provider: EmailProvider;
  messageId?: string;
  logId?: string;
  error?: string;
}

export interface EmailStats {
  sentToday: number;
  failedToday: number;
  queueSize: number;
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  scheduledCount: number;
}

export interface EmailLogEntry {
  id: string;
  tenantId: string;
  recipient: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  templateId: string | null;
  templateName: string | null;
  module: string | null;
  status: string;
  provider: string;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  scheduledFor: string | null;
  attachmentCount: number;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  bouncedAt: string | null;
}

export interface EmailFilter {
  module?: string;
  status?: string;
  recipient?: string;
  templateName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
}

export interface EmailTemplateData {
  name: string;
  identifier: string;
  subject: string;
  module: EmailModule;
  description?: string;
  bodyHtml: string;
  bodyText?: string;
  variables: TemplateVariable[];
}

// Retry schedule: 30s, 1m, 5m, 15m, 30m
export const RETRY_DELAYS_MS = [30_000, 60_000, 300_000, 900_000, 1_800_000];
export const MAX_RETRIES = 5;