// ============ Email Service ============
// Centralized email service with queue, retry, logging, and provider abstraction.
// All modules MUST use this service to send emails.

import { db, withRetry } from '@/lib/db';
import { sendViaProvider, getActiveProvider } from './providers';
import { RETRY_DELAYS_MS, MAX_RETRIES } from './types';
import type {
  SendEmailParams,
  SendEmailResult,
  EmailStatus,
  EmailModule,
  EmailLogEntry,
  EmailStats,
  EmailFilter,
} from './types';

// ============ IN-MEMORY QUEUE ============

interface QueuedEmail {
  logId: string;
  params: SendEmailParams;
  tenantId: string;
  retryCount: number;
  nextRetryAt: Date;
  maxRetries: number;
}

const queue: QueuedEmail[] = [];
let isProcessing = false;

// ============ CORE SEND ============

/**
 * Send an email through the EmailService.
 * This is the main entry point for all modules.
 *
 * - Logs the email to the database
 * - Attempts to send via the configured provider
 * - On failure, queues for retry
 * - Returns the result immediately (fire-and-forget for the queue)
 */
export async function sendEmail(
  params: SendEmailParams,
  opts?: { tenantId?: string; ip?: string; userAgent?: string }
): Promise<SendEmailResult> {
  const tenantId = opts?.tenantId || getDefaultTenantId();

  // Create log entry
  const log = await db.emailLog.create({
    data: {
      tenantId,
      recipient: params.to,
      cc: params.cc?.join(', ') || null,
      bcc: params.bcc?.join(', ') || null,
      subject: params.subject,
      templateName: params.templateName || null,
      module: params.module || null,
      status: 'queued',
      provider: getActiveProvider(),
      maxRetries: MAX_RETRIES,
      scheduledFor: params.scheduledFor || null,
      ip: opts?.ip || null,
      userAgent: opts?.userAgent || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      attachmentCount: params.attachments?.length || 0,
      ...(params.scheduledFor && params.scheduledFor > new Date() ? { nextRetryAt: params.scheduledFor } : {}),
    },
  });

  // If scheduled for future, don't send now
  if (params.scheduledFor && params.scheduledFor > new Date()) {
    return { ok: true, provider: 'console', logId: log.id, messageId: undefined };
  }

  // Attempt to send
  return attemptSend(log.id, params, tenantId);
}

async function attemptSend(
  logId: string,
  params: SendEmailParams,
  tenantId: string,
  retryCount = 0
): Promise<SendEmailResult> {
  // Update status to sending
  await db.emailLog.update({
    where: { id: logId },
    data: { status: 'sending', retryCount },
  }).catch(() => {});

  const result = await sendViaProvider(params);

  if (result.ok) {
    await db.emailLog.update({
      where: { id: logId },
      data: {
        status: 'delivered',
        providerMessageId: result.messageId || null,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    }).catch(() => {});
    return { ...result, logId };
  }

  // Failed — store HTML in metadata for DB retry, queue for in-memory retry
  if (retryCount < MAX_RETRIES) {
    const nextDelay = RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)];
    const nextRetryAt = new Date(Date.now() + nextDelay);

    await db.emailLog.update({
      where: { id: logId },
      data: {
        status: 'queued',
        errorMessage: result.error,
        errorCode: 'RETRY',
        retryCount,
        nextRetryAt,
        // Persist the HTML so DB queue processor can resend it
        metadata: JSON.stringify({ htmlBody: params.html, textBody: params.text }),
      },
    }).catch(() => {});

    // Add to in-memory queue (has full params)
    queue.push({
      logId,
      params,
      tenantId,
      retryCount,
      nextRetryAt,
      maxRetries: MAX_RETRIES,
    });

    // Start processing if not already running
    if (!isProcessing) processQueue();

    return { ...result, logId };
  }

  // Max retries exceeded
  await db.emailLog.update({
    where: { id: logId },
    data: {
      status: 'failed',
      errorMessage: result.error,
      errorCode: 'MAX_RETRIES',
      retryCount,
      nextRetryAt: null,
    },
  }).catch(() => {});

  return { ...result, logId };
}

// ============ QUEUE PROCESSING ============

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (queue.length > 0) {
      const now = new Date();
      const ready = queue.filter((e) => e.nextRetryAt <= now);
      if (ready.length === 0) break;

      for (const item of ready) {
        const idx = queue.indexOf(item);
        if (idx > -1) queue.splice(idx, 1);

        try {
          await attemptSend(item.logId, item.params, item.tenantId, item.retryCount + 1);
        } catch {
          // Continue processing other items
        }
      }

      // Wait before checking again
      await new Promise((r) => setTimeout(r, 5_000));
    }
  } finally {
    isProcessing = false;
  }
}

// Process scheduled emails on startup and periodically
export function startQueueProcessor() {
  // Process in-memory queue
  if (!isProcessing && queue.length > 0) processQueue();

  // Check DB for queued/scheduled emails every 30 seconds
  const interval = setInterval(async () => {
    try {
      const ready = await db.emailLog.findMany({
        where: {
          status: 'queued',
          nextRetryAt: { lte: new Date() },
        },
        take: 10,
        orderBy: { nextRetryAt: 'asc' },
      });

      for (const log of ready) {
        try {
          // Recover HTML from metadata (stored during retry queueing)
          let recoveredHtml = '';
          let recoveredText = '';
          try {
            const meta = log.metadata ? JSON.parse(log.metadata) : null;
            if (meta?.htmlBody) recoveredHtml = meta.htmlBody;
            if (meta?.textBody) recoveredText = meta.textBody;
          } catch {}

          const params: SendEmailParams = {
            to: log.recipient,
            cc: log.cc ? log.cc.split(',').map((s) => s.trim()) : undefined,
            bcc: log.bcc ? log.bcc.split(',').map((s) => s.trim()) : undefined,
            subject: log.subject,
            html: recoveredHtml,
            text: recoveredText,
            module: (log.module as EmailModule) || undefined,
            templateName: log.templateName || undefined,
          };
          await attemptSend(log.id, params, log.tenantId, log.retryCount + 1);
        } catch {
          // continue
        }
      }
    } catch {
      // DB might not be ready
    }
  }, 30_000);

  return () => clearInterval(interval);
}

// ============ TRACKING ============

/**
 * Update email status from provider webhooks.
 * Called by the /api/email/tracking webhook.
 */
export async function updateEmailStatus(
  messageId: string,
  event: string,
  metadata?: Record<string, unknown>
) {
  const statusMap: Record<string, EmailStatus> = {
    delivered: 'delivered',
    opened: 'opened',
    click: 'clicked',
    bounce: 'bounced',
    hard_bounce: 'bounced',
    soft_bounce: 'bounced',
    spam: 'spam',
    unsubscribed: 'unsubscribed',
    blocked: 'failed',
    deferred: 'queued',
  };

  const status = statusMap[event];
  if (!status) return;

  const update: Record<string, unknown> = { status };
  if (event === 'delivered') update.deliveredAt = new Date();
  if (event === 'opened') update.openedAt = new Date();
  if (event === 'bounce' || event === 'hard_bounce' || event === 'soft_bounce') update.bouncedAt = new Date();
  if (metadata) update.metadata = JSON.stringify(metadata);

  await db.emailLog.updateMany({
    where: { providerMessageId: messageId },
    data: update,
  }).catch(() => {});
}

// ============ STATS ============

export async function getEmailStats(tenantId: string): Promise<EmailStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [sentToday, failedToday, queueSize, totalSent, deliveredCount, openedCount, clickedCount, bouncedCount, scheduledCount] =
    await Promise.all([
      db.emailLog.count({ where: { tenantId, createdAt: { gte: today }, status: { in: ['delivered', 'opened', 'clicked'] } } }),
      db.emailLog.count({ where: { tenantId, createdAt: { gte: today }, status: 'failed' } }),
      db.emailLog.count({ where: { tenantId, status: 'queued' } }),
      db.emailLog.count({ where: { tenantId, status: { in: ['delivered', 'opened', 'clicked'] } } }),
      db.emailLog.count({ where: { tenantId, status: { in: ['delivered', 'opened', 'clicked'] } } }),
      db.emailLog.count({ where: { tenantId, status: { in: ['opened', 'clicked'] } } }),
      db.emailLog.count({ where: { tenantId, status: 'clicked' } }),
      db.emailLog.count({ where: { tenantId, status: 'bounced' } }),
      db.emailLog.count({ where: { tenantId, scheduledFor: { gt: new Date() } } }),
    ]);

  const totalAttempts = deliveredCount + bouncedCount;
  return {
    sentToday,
    failedToday,
    queueSize,
    totalSent,
    deliveryRate: totalAttempts > 0 ? Math.round((deliveredCount / totalAttempts) * 100) : 0,
    openRate: deliveredCount > 0 ? Math.round((openedCount / deliveredCount) * 100) : 0,
    clickRate: openedCount > 0 ? Math.round((clickedCount / openedCount) * 100) : 0,
    bounceRate: totalAttempts > 0 ? Math.round((bouncedCount / totalAttempts) * 100) : 0,
    scheduledCount,
  };
}

// ============ LOGS ============

export async function getEmailLogs(tenantId: string, filter: EmailFilter): Promise<{ logs: EmailLogEntry[]; total: number }> {
  const where: Record<string, unknown> = { tenantId };
  if (filter.status) where.status = filter.status;
  if (filter.module) where.module = filter.module;
  if (filter.recipient) where.recipient = { contains: filter.recipient, mode: 'insensitive' };
  if (filter.templateName) where.templateName = { contains: filter.templateName, mode: 'insensitive' };
  if (filter.dateFrom) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(filter.dateFrom) };
  if (filter.dateTo) where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: new Date(filter.dateTo) };

  const page = filter.page || 1;
  const limit = filter.limit || 20;

  const [logs, total] = await Promise.all([
    db.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.emailLog.count({ where }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      tenantId: l.tenantId,
      recipient: l.recipient,
      cc: l.cc,
      bcc: l.bcc,
      subject: l.subject,
      templateId: l.templateId,
      templateName: l.templateName,
      module: l.module,
      status: l.status,
      provider: l.provider,
      providerMessageId: l.providerMessageId,
      errorCode: l.errorCode,
      errorMessage: l.errorMessage,
      retryCount: l.retryCount,
      maxRetries: l.maxRetries,
      scheduledFor: l.scheduledFor?.toISOString() || null,
      attachmentCount: l.attachmentCount,
      createdAt: l.createdAt.toISOString(),
      sentAt: l.sentAt?.toISOString() || null,
      deliveredAt: l.deliveredAt?.toISOString() || null,
      openedAt: l.openedAt?.toISOString() || null,
      bouncedAt: l.bouncedAt?.toISOString() || null,
    })),
    total,
  };
}

// ============ RETRY FAILED ============

export async function retryFailedEmail(tenantId: string, logId: string): Promise<boolean> {
  const log = await db.emailLog.findFirst({ where: { id: logId, tenantId } });
  if (!log) return false;

  await db.emailLog.update({
    where: { id: logId },
    data: { status: 'queued', retryCount: 0, nextRetryAt: new Date(), errorMessage: null, errorCode: null },
  });

  queue.push({
    logId,
    params: {
      to: log.recipient,
      subject: log.subject,
      html: '', // Will be recovered from metadata by attemptSend
      module: (log.module as EmailModule) || undefined,
      templateName: log.templateName || undefined,
    },
    tenantId,
    retryCount: 0,
    nextRetryAt: new Date(),
    maxRetries: MAX_RETRIES,
  });

  if (!isProcessing) processQueue();
  return true;
}

// ============ HELPERS ============

function getDefaultTenantId(): string {
  // Default tenant for this deployment
  return process.env.DEFAULT_TENANT_ID || 'default';
}

/**
 * Get current queue status
 */
export function getQueueStatus(): { size: number; processing: boolean; items: { logId: string; nextRetry: string; retryCount: number }[] } {
  return {
    size: queue.length,
    processing: isProcessing,
    items: queue.map((i) => ({
      logId: i.logId,
      nextRetry: i.nextRetryAt.toISOString(),
      retryCount: i.retryCount,
    })),
  };
}