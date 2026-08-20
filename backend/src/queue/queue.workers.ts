/**
 * MOHD.HMS Enterprise — Queue Workers
 *
 * Background job handlers for async tasks.
 * Register these handlers during app startup.
 *
 * Workers run in the same Node.js process (no separate worker thread).
 * They poll Redis at intervals defined in QUEUE_CONFIG.
 */

import {
  registerHandler,
} from './queue.service.js';
import { QUEUE_JOB_TYPES } from '../cache/cache.constants.js';

// ─── Email Worker ──────────────────────────────────────────────────────────

registerHandler(QUEUE_JOB_TYPES.EMAIL_SEND, async (payload) => {
  const { to, subject, body, html } = payload as {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    from?: string;
  };

  // TODO: Integrate with Brevo/SMTP service
  // For now, log the email that would be sent
  console.log(`[Worker:Email] Sending email to ${JSON.stringify(to)}: ${subject}`);

  // Example integration (commented out):
  // const brevo = new BrevoApi(process.env.BREVO_API_KEY);
  // await brebo.sendEmail({ to, subject, body, html, from });
});

// ─── Firebase Notification Worker ──────────────────────────────────────────

registerHandler(QUEUE_JOB_TYPES.FIREBASE_NOTIFY, async (payload, jobId) => {
  const { tenantId, userIds, roles, title, body, data } = payload as {
    tenantId?: string;
    userIds?: string[];
    roles?: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  };

  console.log(`[Worker:Firebase] Sending notification: ${title}`);

  try {
    // Dynamic import to avoid loading firebase-admin at startup if not needed
    const { sendNotification } = await import('../lib/notification.service.js');
    await sendNotification({
      tenantId: tenantId || '',
      type: 'info',
      title,
      message: body,
      userIds,
      roles,
    });
    console.log(`[Worker:Firebase] Notification sent (job: ${jobId})`);
  } catch (err) {
    console.error(`[Worker:Firebase] Failed to send notification (job: ${jobId}):`, err);
    throw err; // Re-throw to trigger retry logic
  }
});

// ─── WhatsApp Worker ──────────────────────────────────────────────────────

registerHandler(QUEUE_JOB_TYPES.WHATSAPP_NOTIFY, async (payload) => {
  const { to, message } = payload as { to: string; message: string };

  console.log(`[Worker:WhatsApp] Sending to ${to}: ${message.slice(0, 50)}...`);

  // TODO: Integrate with WhatsApp service
  // const { waManager } = await import('../lib/whatsapp-service/manager.js');
  // await waManager.sendMessage(to, message);
});

// ─── PDF Generation Worker ─────────────────────────────────────────────────

registerHandler(QUEUE_JOB_TYPES.PDF_GENERATE, async (payload, jobId) => {
  const { type, id, tenantId } = payload as {
    type: 'invoice' | 'quotation' | 'report';
    id: string;
    tenantId: string;
  };

  console.log(`[Worker:PDF] Generating ${type} PDF for ${id} (job: ${jobId})`);

  // TODO: Implement PDF generation
  // const pdf = await generatePdf(type, id, tenantId);
  // Store PDF URL back to database
});

// ─── Scheduled Report Worker ───────────────────────────────────────────────

registerHandler(QUEUE_JOB_TYPES.SCHEDULED_REPORT, async (payload) => {
  const { reportType, tenantId, recipientIds } = payload as {
    reportType: string;
    tenantId: string;
    recipientIds: string[];
  };

  console.log(`[Worker:Report] Generating scheduled report: ${reportType}`);

  // TODO: Generate report and email to recipients
});

// ─── Reminder Workers ──────────────────────────────────────────────────────

registerHandler(QUEUE_JOB_TYPES.REMINDER_EMAIL, async (payload) => {
  const { userId, title, body } = payload as {
    type: 'email';
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  };

  console.log(`[Worker:Reminder] Email reminder to user ${userId}: ${title}`);
  // TODO: Fetch user email from DB, then send via email worker
});

registerHandler(QUEUE_JOB_TYPES.REMINDER_NOTIFY, async (payload) => {
  const { userId, tenantId, title, body } = payload as {
    type: 'notification';
    userId: string;
    tenantId?: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  };

  console.log(`[Worker:Reminder] Push reminder to user ${userId}: ${title}`);

  // Reuse the Firebase notification handler
  const { sendNotification } = await import('../lib/notification.service.js');
  await sendNotification({
    tenantId: tenantId || '',
    type: 'info',
    title,
    message: body,
    userIds: [userId],
  });
});

// ─── Maintenance Worker ────────────────────────────────────────────────────

registerHandler(QUEUE_JOB_TYPES.SCHEDULED_MAINTENANCE, async (payload) => {
  const { scheduleId, tenantId } = payload as {
    scheduleId: string;
    tenantId: string;
  };

  console.log(`[Worker:Maintenance] Processing PM schedule ${scheduleId}`);

  // TODO: Generate work order from PM schedule, notify assigned technician
});

console.log('[Queue:Workers] All job handlers registered');