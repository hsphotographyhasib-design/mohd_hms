// ============ Action Executor ============
// Parses [ACTION:...] tags from AI responses and executes
// corresponding database operations for the CMMS WhatsApp assistant.

import { db } from '@/core/database/db';

// ---- Action Types ----

export interface ActionData {
  type: string;
  data: Record<string, string>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  actionType: string;
  entityId?: string;
  entityData?: Record<string, unknown>;
}

// ---- Action Tag Parser ----

const ACTION_TAG_REGEX = /\[ACTION:\s*(\{.*?\})\s*\]/s;

/**
 * Extract an [ACTION:{...}] tag from the AI response text.
 * Returns the parsed action or null if no valid action tag found.
 */
export function parseActionTag(aiResponse: string): ActionData | null {
  const match = aiResponse.match(ACTION_TAG_REGEX);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]) as ActionData;
    if (parsed.type && typeof parsed.data === 'object') {
      return parsed;
    }
  } catch {
    console.error('[Action Executor] Failed to parse action tag:', match[1]);
  }

  return null;
}

/**
 * Strip the [ACTION:...] tag from the AI response so it's not sent to the customer.
 */
export function stripActionTag(aiResponse: string): string {
  return aiResponse.replace(ACTION_TAG_REGEX, '').trim();
}

// ---- Main Executor ----

/**
 * Execute a parsed action against the database.
 * Returns a confirmation message to send back to the customer.
 */
export async function executeAction(
  tenantId: string,
  sessionId: string,
  customerId: string | null,
  action: ActionData,
  stateData: Record<string, unknown> = {},
): Promise<ActionResult> {
  const { type, data } = action;

  try {
    switch (type) {
      case 'complaint_create':
        return await executeComplaintCreate(tenantId, sessionId, customerId, data, stateData);
      case 'status_query':
        return await executeStatusQuery(tenantId, sessionId, customerId, data);
      case 'quotation_request':
        return await executeQuotationRequest(tenantId, sessionId, customerId, data);
      case 'service_request':
        return await executeServiceRequest(tenantId, sessionId, customerId, data);
      case 'payment_screenshot':
        return {
          success: true,
          message: '',
          actionType: type,
        };
      default:
        console.warn('[Action Executor] Unknown action type:', type);
        return { success: false, message: 'Unknown action', actionType: type };
    }
  } catch (error) {
    console.error(`[Action Executor] Error executing ${type}:`, error);
    return {
      success: false,
      message: 'Sorry, something went wrong while processing your request. Our team has been notified.',
      actionType: type,
    };
  }
}

// ---- Action: Create Complaint ----

async function executeComplaintCreate(
  tenantId: string,
  sessionId: string,
  customerId: string | null,
  data: Record<string, string>,
  stateData: Record<string, unknown>,
): Promise<ActionResult> {
  // Find or create customer by phone if not known
  let resolvedCustomerId = customerId;

  if (!resolvedCustomerId && stateData.phoneNumber) {
    const phone = String(stateData.phoneNumber);
    let customer = await db.customer.findFirst({
      where: { tenantId, phone, isActive: true },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          tenantId,
          name: data.title ? `Customer - ${data.title.slice(0, 30)}` : 'WhatsApp Customer',
          phone,
          customerNumber: `CUST-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
        },
      });
    }
    resolvedCustomerId = customer.id;
  }

  if (!resolvedCustomerId) {
    return {
      success: false,
      message: 'Unable to create complaint — customer not identified. Please contact us directly.',
      actionType: 'complaint_create',
    };
  }

  // Build complaint fields from AI-extracted data
  const title = data.title || data.equipment
    ? `${data.equipment || 'Equipment'} Issue`
    : 'WhatsApp Complaint';
  const description = data.description || data.issue_description || 'Reported via WhatsApp AI Assistant';
  const location = data.location || '';
  const preferredDate = data.preferredDate || '';
  const preferredTime = data.preferredTime || '';
  const equipment = data.equipment || '';

  // Build full description with all details
  const fullDescription = [
    description,
    location ? `Location: ${location}` : '',
    equipment ? `Equipment: ${equipment}` : '',
    preferredDate ? `Preferred Date: ${preferredDate}` : '',
    preferredTime ? `Preferred Time: ${preferredTime}` : '',
    '',
    'Source: WhatsApp AI Assistant',
    `Session: ${sessionId.slice(-8)}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Determine category from equipment type
  const equipLower = (equipment || '').toLowerCase();
  let category: string | null = null;
  if (equipLower.includes('aircond') || equipLower.includes('ac') || equipLower.includes('hvac')) {
    category = 'HVAC';
  } else if (equipLower.includes('electri') || equipLower.includes('power') || equipLower.includes('light')) {
    category = 'Electrical';
  } else if (equipLower.includes('water') || equipLower.includes('plumb') || equipLower.includes('leak')) {
    category = 'Plumbing';
  } else if (equipLower.includes('generat') || equipLower.includes('genset')) {
    category = 'Generator';
  } else if (equipLower.includes('fire') || equipLower.includes('alarm') || equipLower.includes('sprinkl')) {
    category = 'FireProtection';
  } else if (equipLower.includes('lift') || equipLower.includes('elevator')) {
    category = 'Mechanical';
  }

  // Determine priority
  let priority = 'medium';
  if (equipLower.includes('no power') || equipLower.includes('gas leak') || equipLower.includes('safety')) {
    priority = 'critical';
  }

  // Create the complaint
  const complaint = await db.complaint.create({
    data: {
      tenantId,
      customerId: resolvedCustomerId,
      title,
      description: fullDescription,
      priority,
      status: 'NEW',
      source: 'whatsapp',
      category,
    },
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  // Create timeline entry
  await db.complaintTimeline.create({
    data: {
      tenantId,
      complaintId: complaint.id,
      action: 'created',
      toStatus: 'NEW',
      description: 'Complaint created via WhatsApp AI Assistant',
      performedByRole: 'ai_assistant',
      metadata: JSON.stringify({ sessionId, source: 'whatsapp_ai' }),
    },
  });

  // Notify admin/supervisor
  try {
    const adminUser = await db.user.findFirst({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['admin', 'super_admin', 'supervisor'] },
      },
      orderBy: { role: 'asc' }, // super_admin first, then admin, then supervisor
    });

    if (adminUser) {
      const shortId = complaint.id.slice(-6).toUpperCase();
      await db.notification.create({
        data: {
          tenantId,
          userId: adminUser.id,
          type: 'whatsapp',
          title: 'New AI Complaint',
          message: `AI created complaint #${shortId} from WhatsApp — "${complaint.title}" (Customer: ${complaint.customer.name})`,
          relatedEntityType: 'complaint',
          relatedEntityId: complaint.id,
        },
      });
    }
  } catch (notifError) {
    console.error('[Action Executor] Failed to create notification:', notifError);
    // Non-critical — don't fail the complaint creation
  }

  // Log AI conversation
  try {
    await db.aiConversationLog.create({
      data: {
        tenantId,
        sessionId,
        customerId: resolvedCustomerId,
        phoneNumber: String(stateData.phoneNumber || ''),
        detectedIntent: 'complaint',
        actionTaken: 'complaint_created',
        actionData: JSON.stringify({ complaintId: complaint.id, title: complaint.title }),
      },
    });
  } catch (logError) {
    console.error('[Action Executor] Failed to log AI conversation:', logError);
  }

  const shortId = complaint.id.slice(-6).toUpperCase();
  return {
    success: true,
    message: `✅ Complaint #${shortId} has been created successfully!\n\n📋 ${complaint.title}\n📍 ${location || 'Location pending'}\n🔧 ${category || 'General'}\n\nOur team will review and assign a technician shortly. You'll receive updates via WhatsApp.`,
    actionType: 'complaint_create',
    entityId: complaint.id,
    entityData: {
      complaintId: complaint.id,
      shortId,
      status: complaint.status,
    },
  };
}

// ---- Action: Status Query ----

async function executeStatusQuery(
  tenantId: string,
  _sessionId: string,
  customerId: string | null,
  data: Record<string, string>,
): Promise<ActionResult> {
  let complaint = null;
  let workOrder = null;

  // Try to find by complaint ID
  if (data.complaint_id) {
    // Customer might provide a short ID — search by suffix
    const complaintId = data.complaint_id.trim();

    complaint = await db.complaint.findFirst({
      where: {
        tenantId,
        id: { endsWith: complaintId.toUpperCase() },
      },
      include: {
        customer: { select: { name: true } },
        assignedTo: { select: { name: true } },
        equipment: { select: { name: true, location: true } },
      },
    });
  }

  // If no complaint found by ID, try customer's latest
  if (!complaint && customerId && data.complaint_id === 'latest') {
    complaint = await db.complaint.findFirst({
      where: {
        tenantId,
        customerId,
        status: { not: 'CLOSED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        assignedTo: { select: { name: true } },
        equipment: { select: { name: true, location: true } },
      },
    });
  }

  // Also check work orders if no complaint found
  if (!complaint && data.complaint_id) {
    workOrder = await db.workOrder.findFirst({
      where: {
        tenantId,
        id: { endsWith: data.complaint_id.trim().toUpperCase() },
      },
      include: {
        assignedTo: { select: { name: true } },
        equipment: { select: { name: true, location: true } },
        complaint: { select: { id: true, title: true, status: true } },
      },
    });
  }

  // Build status message
  if (complaint) {
    const shortId = complaint.id.slice(-6).toUpperCase();
    const techName = complaint.assignedTo?.name || 'Not yet assigned';
    const equipName = complaint.equipment?.name || 'N/A';
    const equipLoc = complaint.equipment?.location || 'N/A';
    const createdDate = complaint.createdAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      success: true,
      message: `📋 Complaint #${shortId} Status Update\n\n📌 Title: ${complaint.title}\n📊 Status: ${complaint.status}\n🔧 Equipment: ${equipName}\n📍 Location: ${equipLoc}\n👷 Technician: ${techName}\n📅 Created: ${createdDate}\n\n${getStatusDescription(complaint.status)}`,
      actionType: 'status_query',
      entityId: complaint.id,
    };
  }

  if (workOrder) {
    const shortId = workOrder.id.slice(-6).toUpperCase();
    const techName = workOrder.assignedTo?.name || 'Not assigned';
    const startDate = workOrder.startedAt
      ? workOrder.startedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : 'Not started';
    const completedDate = workOrder.completedAt
      ? workOrder.completedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '';

    return {
      success: true,
      message: `🔧 Work Order #${shortId}\n\n📌 ${workOrder.title}\n📊 Status: ${workOrder.status}\n👷 Technician: ${techName}\n📅 Started: ${startDate}${completedDate ? `\n✅ Completed: ${completedDate}` : ''}`,
      actionType: 'status_query',
      entityId: workOrder.id,
    };
  }

  return {
    success: false,
    message: data.complaint_id && data.complaint_id !== 'latest'
      ? `Sorry, I couldn't find a complaint with ID "${data.complaint_id}". Please check the number and try again.`
      : 'I could not find any active complaints on your account. If you have a complaint ID, please share it.',
    actionType: 'status_query',
  };
}

// ---- Action: Quotation Request ----

async function executeQuotationRequest(
  tenantId: string,
  _sessionId: string,
  customerId: string | null,
  data: Record<string, string>,
): Promise<ActionResult> {
  if (!customerId) {
    return {
      success: false,
      message: 'Unable to create quotation request — customer not identified. Please contact us directly.',
      actionType: 'quotation_request',
    };
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { name: true },
  });

  if (!customer) {
    return {
      success: false,
      message: 'Customer record not found.',
      actionType: 'quotation_request',
    };
  }

  // Generate quotation number
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  const tenantCode = tenant ? tenant.name.substring(0, 4).toUpperCase() : 'MOHD';
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
  const count = await db.quotation.count({
    where: {
      tenantId,
      createdAt: { gte: monthStart, lte: monthEnd },
    },
  });
  const sequential = String(count + 1).padStart(4, '0');
  const quotationNo = `QTN/${tenantCode}/${month}/${sequential}`;

  // Build description from AI data
  const equipmentType = data.equipment || data.equipment_type || 'General Service';
  const brand = data.brand || '';
  const quantity = data.quantity || '1';
  const location = data.location || '';

  const title = `Quotation Request: ${equipmentType}`;
  const description = [
    `Equipment Type: ${equipmentType}`,
    brand ? `Brand: ${brand}` : '',
    `Quantity: ${quantity}`,
    location ? `Location: ${location}` : '',
    '',
    'Requested via WhatsApp AI Assistant',
  ]
    .filter(Boolean)
    .join('\n');

  // Create draft quotation
  const quotation = await db.quotation.create({
    data: {
      tenantId,
      customerId,
      quotationNo: '',
      title,
      description,
      site: location || null,
      items: JSON.stringify([]),
      subtotal: 0,
      tax: 0,
      discount: 0,
      shipping: 0,
      total: 0,
      status: 'DRAFT',
      notes: 'AI-initiated quotation request from WhatsApp. Awaiting pricing from admin.',
    },
  });

  // Update the quotationNo via raw SQL (Turbopack compatibility)
  try {
    await db.$executeRawUnsafe(
      `UPDATE Quotation SET quotationNo = '${quotationNo}' WHERE id = '${quotation.id}'`,
    );
  } catch {
    // Non-critical
  }

  // Notify admin
  try {
    const adminUser = await db.user.findFirst({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['admin', 'super_admin', 'manager'] },
      },
      orderBy: { role: 'asc' },
    });

    if (adminUser) {
      await db.notification.create({
        data: {
          tenantId,
          userId: adminUser.id,
          type: 'whatsapp',
          title: 'New Quotation Request',
          message: `AI created quotation request ${quotationNo} from ${customer.name} via WhatsApp — ${equipmentType}`,
          relatedEntityType: 'quotation',
          relatedEntityId: quotation.id,
        },
      });
    }
  } catch {
    // Non-critical
  }

  return {
    success: true,
    message: `📝 Quotation Request Received!\n\n📋 ${quotationNo}\n🔧 ${equipmentType}${brand ? ` (${brand})` : ''}\n📦 Quantity: ${quantity}${location ? `\n📍 ${location}` : ''}\n\nYour request has been submitted to our team. We'll prepare the quotation and send it to you soon. Thank you!`,
    actionType: 'quotation_request',
    entityId: quotation.id,
    entityData: { quotationNo, status: 'DRAFT' },
  };
}

// ---- Action: Service Request ----

async function executeServiceRequest(
  tenantId: string,
  _sessionId: string,
  customerId: string | null,
  data: Record<string, string>,
): Promise<ActionResult> {
  if (!customerId) {
    return {
      success: false,
      message: 'Unable to create service request — customer not identified. Please contact us directly.',
      actionType: 'service_request',
    };
  }

  const site = data.location || data.site || 'Customer Site';
  const equipmentType = data.equipment || data.equipment_type || 'General';
  const quantity = data.quantity || '1';
  const preferredDate = data.preferredDate || '';
  const preferredTime = data.preferredTime || '';

  const title = `Service Request: ${equipmentType} Maintenance`;
  const description = [
    `Equipment Type: ${equipmentType}`,
    `Estimated Count: ${quantity}`,
    `Site: ${site}`,
    preferredDate ? `Preferred Date: ${preferredDate}` : '',
    preferredTime ? `Preferred Time: ${preferredTime}` : '',
    '',
    'Requested via WhatsApp AI Assistant',
  ]
    .filter(Boolean)
    .join('\n');

  // Create as a complaint (service request source)
  const complaint = await db.complaint.create({
    data: {
      tenantId,
      customerId,
      title,
      description,
      priority: 'low',
      status: 'NEW',
      source: 'whatsapp',
      category: guessCategoryFromEquipment(equipmentType),
    },
    include: {
      customer: { select: { name: true } },
    },
  });

  // Create timeline
  await db.complaintTimeline.create({
    data: {
      tenantId,
      complaintId: complaint.id,
      action: 'created',
      toStatus: 'NEW',
      description: 'Service request created via WhatsApp AI Assistant',
      performedByRole: 'ai_assistant',
      metadata: JSON.stringify({ source: 'whatsapp_ai', requestType: 'service' }),
    },
  });

  // Notify admin
  try {
    const adminUser = await db.user.findFirst({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['admin', 'super_admin', 'supervisor', 'manager'] },
      },
      orderBy: { role: 'asc' },
    });

    if (adminUser) {
      const shortId = complaint.id.slice(-6).toUpperCase();
      await db.notification.create({
        data: {
          tenantId,
          userId: adminUser.id,
          type: 'whatsapp',
          title: 'New AI Service Request',
          message: `AI created service request #${shortId} from ${complaint.customer.name} — ${equipmentType} at ${site}`,
          relatedEntityType: 'complaint',
          relatedEntityId: complaint.id,
        },
      });
    }
  } catch {
    // Non-critical
  }

  const shortId = complaint.id.slice(-6).toUpperCase();
  return {
    success: true,
    message: `📅 Service Request #${shortId} Created!\n\n🔧 ${equipmentType} Maintenance\n📦 Count: ${quantity}\n📍 ${site}${preferredDate ? `\n🗓️ Preferred: ${preferredDate}` : ''}${preferredTime ? ` at ${preferredTime}` : ''}\n\nOur team will contact you to confirm the schedule. Thank you!`,
    actionType: 'service_request',
    entityId: complaint.id,
    entityData: { complaintId: complaint.id, shortId, status: complaint.status },
  };
}

// ---- Helpers ----

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    NEW: 'Your complaint has been received and is waiting for review by our team.',
    ASSIGNED: 'A technician has been assigned and will review your complaint soon.',
    ACCEPTED: 'The technician has accepted the job and will schedule a visit.',
    WORK_ORDER_CREATED: 'A work order has been created. The technician will be dispatched soon.',
    IN_PROGRESS: 'A technician is currently working on your issue.',
    WAITING_CLIENT_CONFIRMATION: 'The technician has completed the work. Waiting for your confirmation.',
    CLIENT_CONFIRMED: 'You have confirmed the work is complete. Invoice is being prepared.',
    DRAFT_INVOICE: 'An invoice is being drafted for the completed work.',
    INVOICE_APPROVED: 'The invoice has been approved and will be sent to you.',
    INVOICE_SENT: 'The invoice has been sent to you. Please check your records.',
    PAID: 'Payment has been received. Thank you for your business!',
    CLOSED: 'This complaint has been resolved and closed.',
    REWORK_REQUIRED: 'A rework has been requested. Our team will contact you shortly.',
  };
  return descriptions[status] || 'Please contact our team for more details.';
}

function guessCategoryFromEquipment(equipment: string): string | null {
  const lower = equipment.toLowerCase();
  if (lower.includes('aircond') || lower.includes('ac') || lower.includes('hvac') || lower.includes('split')) return 'HVAC';
  if (lower.includes('electri') || lower.includes('power') || lower.includes('light') || lower.includes('wiring')) return 'Electrical';
  if (lower.includes('water') || lower.includes('plumb') || lower.includes('pipe') || lower.includes('drain')) return 'Plumbing';
  if (lower.includes('generat') || lower.includes('genset') || lower.includes('ups')) return 'Generator';
  if (lower.includes('fire') || lower.includes('alarm') || lower.includes('sprinkl') || lower.includes('extinguish')) return 'FireProtection';
  if (lower.includes('lift') || lower.includes('elevator') || lower.includes('escalator') || lower.includes('pump')) return 'Mechanical';
  return null;
}