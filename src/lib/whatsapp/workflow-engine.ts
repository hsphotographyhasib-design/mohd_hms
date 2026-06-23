import { db } from '@/lib/db';
import { createProvider, renderTemplate } from './provider';

// ============ Auto-Route Complaint ============
// Assigns a supervisor/technician based on complaint category

export async function autoRouteComplaint(complaintId: string, tenantId: string): Promise<void> {
  const complaint = await db.complaint.findUnique({
    where: { id: complaintId },
    include: { customer: true },
  });
  if (!complaint || complaint.tenantId !== tenantId) return;

  // Find supervisor with fewest active complaints in the category
  const supervisors = await db.user.findMany({
    where: {
      tenantId,
      role: { in: ['supervisor', 'manager', 'technician'] },
      isActive: true,
    },
    take: 10,
  });

  if (supervisors.length === 0) return;

  const counts = await Promise.all(
    supervisors.map(async (s) => {
      const count = await db.complaint.count({
        where: {
          tenantId,
          supervisorId: s.id,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      });
      return { user: s, count };
    })
  );

  counts.sort((a, b) => a.count - b.count);
  const assigned = counts[0];

  if (assigned) {
    await db.complaint.update({
      where: { id: complaintId },
      data: {
        supervisorId: assigned.user.id,
        status: 'ASSIGNED',
      },
    });

    // Send notification
    await db.notification.create({
      data: {
        tenantId,
        userId: assigned.user.id,
        type: 'complaint_assigned',
        title: 'New Complaint Assigned',
        message: `Complaint ${complaint.id.slice(-8).toUpperCase()} from ${complaint.customer?.name || 'WhatsApp User'} has been auto-assigned to you.\n\nPriority: ${complaint.priority}\nCategory: ${complaint.category || 'General'}`,
        relatedEntityType: 'complaint',
        relatedEntityId: complaintId,
      },
    });

    // Send WhatsApp notification to customer
    await sendComplaintUpdate(complaintId, 'assigned', tenantId);
  }
}

// ============ Auto-Create Work Order ============
// Creates a work order when a complaint is assigned

export async function autoCreateWorkOrder(complaintId: string, tenantId: string): Promise<void> {
  const complaint = await db.complaint.findUnique({
    where: { id: complaintId },
    include: {
      customer: true,
      equipment: true,
      assignedTo: true,
      supervisor: true,
    },
  });
  if (!complaint || complaint.tenantId !== tenantId) return;

  // Check if WO already exists for this complaint
  const existing = await db.workOrder.findFirst({
    where: { complaintId, tenantId },
  });
  if (existing) return;

  const wo = await db.workOrder.create({
    data: {
      tenantId,
      complaintId,
      equipmentId: complaint.equipmentId,
      title: `WO for: ${complaint.title}`,
      description: complaint.description,
      status: 'PENDING',
      priority: complaint.priority,
      type: complaint.priority === 'critical' ? 'emergency' : 'corrective',
      assignedToId: complaint.assignedToId || complaint.supervisorId || null,
      createdBy: complaint.supervisorId,
      scheduledDate: complaint.priority === 'critical'
        ? new Date(Date.now() + 15 * 60000) // 15 min for critical
        : new Date(Date.now() + 24 * 3600000), // next day for others
    },
    include: { assignedTo: { select: { name: true } } },
  });

  // Notify the assignee
  if (wo.assignedToId) {
    await db.notification.create({
      data: {
        tenantId,
        userId: wo.assignedToId,
        type: 'work_order_created',
        title: 'Work Order Created',
        message: `Work order ${wo.id.slice(-8).toUpperCase()} created for complaint ${complaint.id.slice(-8).toUpperCase()}.\n\nScheduled: ${wo.scheduledDate?.toLocaleDateString() || 'ASAP'}`,
        relatedEntityType: 'work_order',
        relatedEntityId: wo.id,
      },
    });
  }
}

// ============ Send Complaint Update ============
// Sends WhatsApp notification to customer on status change

export async function sendComplaintUpdate(
  complaintId: string,
  event: string,
  tenantId: string
): Promise<void> {
  const complaint = await db.complaint.findUnique({
    where: { id: complaintId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      assignedTo: { select: { name: true } },
      supervisor: { select: { name: true } },
    },
  });
  if (!complaint || !complaint.customer?.phone) return;

  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config?.isEnabled) return;

  // Find session by customer phone
  const session = await db.whatsAppSession.findFirst({
    where: { tenantId, phoneNumber: complaint.customer.phone.replace(/[^0-9]/g, '') },
  });
  if (!session || session.isBlocked) return;

  let content = '';
  let templateName = '';

  switch (event) {
    case 'assigned': {
      const tpl = await findTemplate(tenantId, 'assigned');
      content = tpl
        ? renderTemplate(tpl.content, {
            complaint_id: complaint.id.slice(-8).toUpperCase(),
            technician_name: complaint.assignedTo?.name || complaint.supervisor?.name || 'our team',
            eta: '60',
          })
        : `Your complaint ${complaint.id.slice(-8).toUpperCase()} has been assigned to ${complaint.assignedTo?.name || 'our team'}. We'll contact you shortly.`;
      templateName = 'assigned';
      break;
    }
    case 'in_progress': {
      const tpl = await findTemplate(tenantId, 'in_progress');
      content = tpl
        ? renderTemplate(tpl.content, {
            complaint_id: complaint.id.slice(-8).toUpperCase(),
            technician_name: complaint.assignedTo?.name || 'our team',
          })
        : `Work on your complaint ${complaint.id.slice(-8).toUpperCase()} has started. Technician: ${complaint.assignedTo?.name || 'our team'}.`;
      templateName = 'in_progress';
      break;
    }
    case 'resolved': {
      const tpl = await findTemplate(tenantId, 'completed');
      content = tpl
        ? renderTemplate(tpl.content, { complaint_id: complaint.id.slice(-8).toUpperCase() })
        : `Your complaint ${complaint.id.slice(-8).toUpperCase()} has been resolved! Please rate our service (reply 1-5 ⭐).`;
      templateName = 'completed';

      // Set session to feedback state
      await db.whatsAppSession.update({
        where: { id: session.id },
        data: {
          state: 'feedback_rating',
          stateData: JSON.stringify({ complaintId: complaint.id }),
        },
      });
      break;
    }
    default:
      content = `Update on your complaint ${complaint.id.slice(-8).toUpperCase()}: Status changed to ${event}.`;
  }

  if (!content) return;

  // Save outbound message
  await db.whatsAppMessage.create({
    data: {
      tenantId,
      sessionId: session.id,
      direction: 'outbound',
      messageType: 'text',
      content,
      isFromBot: true,
      isTemplate: !!templateName,
      fromNumber: config.phoneNumber || null,
      toNumber: session.phoneNumber,
      status: 'sent',
    },
  });

  await db.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
  });

  // Try to actually send via provider
  try {
    const provider = createProvider(config);
    await provider.sendMessage(session.phoneNumber, content, { isTemplate: !!templateName });
  } catch {
    // Provider send failure is non-critical
  }
}

// ============ Send Invoice Notification ============

export async function sendInvoiceNotification(invoiceId: string, tenantId: string): Promise<void> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });
  if (!invoice || !invoice.customer?.phone) return;

  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config?.isEnabled) return;

  const session = await db.whatsAppSession.findFirst({
    where: { tenantId, phoneNumber: invoice.customer.phone.replace(/[^0-9]/g, '') },
  });
  if (!session || session.isBlocked) return;

  const tpl = await findTemplate(tenantId, 'invoice');
  const content = tpl
    ? renderTemplate(tpl.content, {
        invoice_number: invoice.invoiceNumber,
        amount: `$${invoice.total.toFixed(2)}`,
        due_date: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
      })
    : `Invoice ${invoice.invoiceNumber} for $${invoice.total.toFixed(2)} is ready. Due: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}.`;

  await db.whatsAppMessage.create({
    data: {
      tenantId,
      sessionId: session.id,
      direction: 'outbound',
      messageType: 'text',
      content,
      isFromBot: true,
      isTemplate: true,
      fromNumber: config.phoneNumber || null,
      toNumber: session.phoneNumber,
      status: 'sent',
    },
  });

  await db.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
  });

  try {
    const provider = createProvider(config);
    await provider.sendMessage(session.phoneNumber, content, { isTemplate: true });
  } catch {
    // Non-critical
  }
}

// ============ Send ETA Update ============

export async function sendEtaUpdate(workOrderId: string, eta: number, tenantId: string): Promise<void> {
  const wo = await db.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      complaint: {
        include: { customer: { select: { id: true, name: true, phone: true } } },
      },
      assignedTo: { select: { name: true } },
    },
  });
  if (!wo?.complaint?.customer?.phone) return;

  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config?.isEnabled) return;

  const phone = wo.complaint.customer.phone.replace(/[^0-9]/g, '');
  const session = await db.whatsAppSession.findFirst({
    where: { tenantId, phoneNumber: phone },
  });
  if (!session || session.isBlocked) return;

  const content = `🕐 *ETA Update*\n\nWork order for complaint ${wo.complaint.id.slice(-8).toUpperCase()}:\n\n Technician: ${wo.assignedTo?.name || 'Our team'}\n⏱️ Expected arrival: ${eta} minutes\n\nYou'll be notified when the technician arrives.`;

  await db.whatsAppMessage.create({
    data: {
      tenantId,
      sessionId: session.id,
      direction: 'outbound',
      messageType: 'text',
      content,
      isFromBot: true,
      fromNumber: config.phoneNumber || null,
      toNumber: session.phoneNumber,
      status: 'sent',
    },
  });

  await db.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
  });
}

// ============ Send Feedback Request ============

export async function sendFeedbackRequest(complaintId: string, tenantId: string): Promise<void> {
  const complaint = await db.complaint.findUnique({
    where: { id: complaintId },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });
  if (!complaint?.customer?.phone) return;

  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config?.isEnabled) return;

  const phone = complaint.customer.phone.replace(/[^0-9]/g, '');
  const session = await db.whatsAppSession.findFirst({
    where: { tenantId, phoneNumber: phone },
  });
  if (!session || session.isBlocked) return;

  const tpl = await findTemplate(tenantId, 'feedback');
  const content = tpl
    ? tpl.content
    : 'How would you rate our service for your recent complaint? Reply with a number 1-5 ⭐\n\n1 = Very Poor, 5 = Excellent';

  await db.whatsAppSession.update({
    where: { id: session.id },
    data: {
      state: 'feedback_rating',
      stateData: JSON.stringify({ complaintId }),
    },
  });

  await db.whatsAppMessage.create({
    data: {
      tenantId,
      sessionId: session.id,
      direction: 'outbound',
      messageType: 'text',
      content,
      isFromBot: true,
      isTemplate: true,
      fromNumber: config.phoneNumber || null,
      toNumber: session.phoneNumber,
      status: 'sent',
    },
  });

  await db.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
  });
}

// ============ Handle Emergency ============

export async function handleEmergency(complaintId: string, tenantId: string): Promise<void> {
  const complaint = await db.complaint.findUnique({
    where: { id: complaintId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!complaint) return;

  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config) return;

  // Send to all emergency numbers
  if (config.emergencyNumbers) {
    try {
      const numbers = JSON.parse(config.emergencyNumbers) as string[];
      const provider = createProvider(config);
      const msg = `🚨 EMERGENCY ALERT\n\nCustomer: ${complaint.customer?.name || complaint.customer?.phone}\nIssue: ${complaint.title}\nDescription: ${complaint.description.slice(0, 200)}\nComplaint ID: ${complaint.id.slice(-8).toUpperCase()}\nPriority: CRITICAL\n\nImmediate response required!`;

      for (const num of numbers) {
        await provider.sendMessage(num, msg).catch(() => {});
      }
    } catch {
      // Non-critical
    }
  }

  // Create urgent notifications for all supervisors/managers/admins
  const staff = await db.user.findMany({
    where: {
      tenantId,
      role: { in: ['admin', 'manager', 'supervisor'] },
      isActive: true,
    },
  });

  for (const user of staff) {
    await db.notification.create({
      data: {
        tenantId,
        userId: user.id,
        type: 'emergency',
        title: '🚨 EMERGENCY - Immediate Action Required',
        message: `Emergency complaint ${complaint.id.slice(-8).toUpperCase()} from ${complaint.customer?.name || 'WhatsApp User'}.\n\n${complaint.description.slice(0, 150)}`,
        relatedEntityType: 'complaint',
        relatedEntityId: complaintId,
      },
    });
  }
}

// ============ Execute Broadcast Campaign ============

export async function executeBroadcast(campaignId: string, tenantId: string): Promise<void> {
  const campaign = await db.broadcastLog.findFirst({ where: { id: campaignId, tenantId } });
  if (!campaign) return;

  // Mark as sending
  await db.broadcastLog.update({
    where: { id: campaignId },
    data: { status: 'sending', sentAt: new Date() },
  });

  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config?.isEnabled) {
    await db.broadcastLog.update({ where: { id: campaignId }, data: { status: 'failed' } });
    return;
  }

  const provider = createProvider(config);

  // Get all active WhatsApp sessions (customers)
  const sessions = await db.whatsAppSession.findMany({
    where: { tenantId, isActive: true, isBlocked: false },
    select: { id: true, phoneNumber: true },
  });

  let sent = 0;
  let failed = 0;

  // Render template if specified
  let content = campaign.content;
  if (campaign.templateId) {
    const tpl = await db.whatsAppTemplate.findFirst({
      where: { id: campaign.templateId, tenantId },
    });
    if (tpl) content = tpl.content;
  }

  for (const session of sessions) {
    try {
      const result = await provider.sendMessage(session.phoneNumber, content, { isTemplate: !!campaign.templateId });
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Save message record
    await db.whatsAppMessage.create({
      data: {
        tenantId,
        sessionId: session.id,
        direction: 'outbound',
        messageType: 'text',
        content,
        isFromBot: true,
        isTemplate: !!campaign.templateId,
        fromNumber: config.phoneNumber || null,
        toNumber: session.phoneNumber,
        status: sent > 0 ? 'sent' : 'failed',
      },
    });
  }

  await db.broadcastLog.update({
    where: { id: campaignId },
    data: {
      status: sent > 0 ? 'completed' : 'failed',
      sentCount: sent,
      failedCount: failed,
      recipientCount: sessions.length,
      completedAt: new Date(),
    },
  });
}

// ============ Helpers ============

async function findTemplate(tenantId: string, category: string) {
  return db.whatsAppTemplate.findFirst({
    where: { tenantId, category, isActive: true },
  });
}