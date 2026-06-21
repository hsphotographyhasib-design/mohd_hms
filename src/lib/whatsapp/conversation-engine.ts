import { db } from '@/lib/db';
import type { WhatsAppSession, WhatsAppConfig } from '@prisma/client';
import { renderTemplate } from './provider';

// ============ Types ============

export interface ResponseItem {
  content: string;
  messageType?: string;
  isTemplate?: boolean;
}

type SessionState = WhatsAppSession['state'];

interface StateContext {
  session: WhatsAppSession;
  config: WhatsAppConfig;
  message: string;
  tenantId: string;
  customerId: string | null;
  stateData: Record<string, unknown>;
}

// ============ Main Entry Point ============

export async function processIncomingMessage(
  session: WhatsAppSession,
  message: string,
  tenantId: string,
  _providerMessageId?: string
): Promise<ResponseItem[]> {
  // Refresh session from DB to get latest state
  const freshSession = await db.whatsAppSession.findUnique({
    where: { id: session.id },
  });
  if (!freshSession) return [];

  const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
  if (!config) return [];

  const stateData = parseJson(freshSession.stateData);
  const ctx: StateContext = {
    session: freshSession,
    config,
    message: message.trim(),
    tenantId,
    customerId: freshSession.customerId,
    stateData,
  };

  // Check for global commands first
  const cmd = matchCommand(ctx.message);
  if (cmd) {
    return handleCommand(cmd, ctx);
  }

  // Route to state handler
  const handler = stateHandlers[ctx.session.state as SessionState];
  if (handler) {
    return handler(ctx);
  }

  // Default: return to menu
  return showMenu(ctx);
}

// ============ Command Matching ============

function matchCommand(text: string): string | null {
  const t = text.toLowerCase().trim();
  const commands: Record<string, string[]> = {
    menu: ['menu', '0', 'main menu', 'help'],
    new_complaint: ['1', 'new complaint', 'complaint', 'report issue', 'raise complaint'],
    service_request: ['2', 'service', 'service request', 'maintenance'],
    status_query: ['3', 'status', 'complaint status', 'track', 'track complaint'],
    equipment_list: ['4', 'equipment', 'my equipment', 'assets'],
    work_order_status: ['5', 'work order', 'wo status', 'work order status'],
    invoice_query: ['6', 'invoice', 'invoices', 'bill', 'billing'],
    emergency: ['7', 'emergency', 'urgent', 'sos', 'help emergency'],
    chat: ['8', 'chat', 'agent', 'speak', 'talk', 'human', 'support', 'customer support', 'live agent'],
    hi: ['hi', 'hello', 'hey', 'hola', 'good morning', 'good afternoon', 'good evening', 'start'],
    thanks: ['thanks', 'thank you', 'thx', 'ty', 'appreciate'],
  };

  for (const [cmd, keywords] of Object.entries(commands)) {
    if (keywords.includes(t)) return cmd;
  }
  return null;
}

function handleCommand(cmd: string, ctx: StateContext): ResponseItem[] {
  switch (cmd) {
    case 'hi':
      return showWelcome(ctx);
    case 'menu':
    case 'help':
      return showMenu(ctx);
    case 'new_complaint':
      return transitionTo(ctx, 'new_complaint_desc', 'Please describe your issue or complaint in detail.\n\nYou can also send a photo/video of the problem.');
    case 'service_request':
      return transitionTo(ctx, 'service_request_desc', 'Please describe the service you need.\n\nExamples:\n- AC maintenance\n- Electrical inspection\n- Plumbing repair\n- Generator servicing');
    case 'status_query':
      return transitionTo(ctx, 'status_query', 'Please enter your complaint ID (e.g., CMP-XXXXXX) to check its status.');
    case 'equipment_list':
      return handleEquipmentList(ctx);
    case 'work_order_status':
      return transitionTo(ctx, 'status_query', 'Please enter your complaint or work order ID to check the status.');
    case 'invoice_query':
      return handleInvoiceQuery(ctx);
    case 'emergency':
      return transitionTo(ctx, 'emergency_desc', '🚨 *EMERGENCY SERVICE*\n\nPlease describe the emergency situation.\nOur team will be alerted immediately.\n\nExpected response time: 15 minutes');
    case 'chat':
      return transitionTo(ctx, 'chat', '📞 Connecting you with a customer support agent...\n\nPlease describe your issue and an agent will assist you shortly.');
    case 'thanks':
      return [{ content: "You're welcome! Is there anything else I can help you with?\n\nReply *menu* to see all options.", isTemplate: false }];
    default:
      return showMenu(ctx);
  }
}

// ============ State Handlers ============

const stateHandlers: Record<string, (ctx: StateContext) => Promise<ResponseItem[]>> = {
  menu: async (ctx) => showMenu(ctx),
  new_complaint_desc: handleNewComplaintDesc,
  new_complaint_media: handleNewComplaintMedia,
  new_complaint_equipment: handleNewComplaintEquipment,
  service_request_desc: handleServiceRequestDesc,
  status_query: handleStatusQuery,
  invoice_query: handleInvoiceQuery,
  equipment_list: handleEquipmentList,
  emergency_desc: handleEmergencyDesc,
  feedback_rating: handleFeedbackRating,
  feedback_comment: handleFeedbackComment,
  escalation_desc: handleEscalationDesc,
  chat: handleChat,
  appointment_date: handleAppointmentDate,
  appointment_time: handleAppointmentTime,
  appointment_location: handleAppointmentLocation,
};

// ============ Menu & Welcome ============

function showWelcome(ctx: StateContext): ResponseItem[] {
  const companyName = ctx.config.businessName || 'MOHD.HMS ENTERPRISE';
  const welcome = renderTemplate(ctx.config.welcomeMessage, { company_name: companyName });
  updateState(ctx, 'menu', {});
  return [{ content: welcome, isTemplate: true }];
}

function showMenu(ctx: StateContext): ResponseItem[] {
  updateState(ctx, 'menu', {});
  return [{
    content: `*Main Menu*\n\n1️⃣ New Complaint\n2️⃣ Service Request\n3️⃣ Complaint Status\n4️⃣ My Equipment\n5️⃣ Work Order Status\n6️⃣ Invoices\n7️⃣ Emergency Service\n8️⃣ Speak to Customer Support\n\nReply with a number or keyword.`,
    isTemplate: false,
  }];
}

// ============ New Complaint Flow ============

async function handleNewComplaintDesc(ctx: StateContext): Promise<ResponseItem[]> {
  const description = ctx.message;
  if (description.length < 5) {
    return [{ content: 'Please provide more details about your issue (at least a few words).' }];
  }

  // Save description in state data
  ctx.stateData.complaintDescription = description;
  updateState(ctx, 'new_complaint_equipment', ctx.stateData);

  // Get customer equipment for selection
  if (ctx.customerId) {
    const equipment = await db.equipment.findMany({
      where: { tenantId: ctx.tenantId, customerId: ctx.customerId, status: 'active' },
      select: { id: true, name: true, assetNumber: true, category: true },
      take: 10,
    });

    if (equipment.length > 0) {
      let msg = 'Which equipment is this related to?\n\n';
      equipment.forEach((eq, i) => {
        msg += `${i + 1}. ${eq.name} (${eq.assetNumber}) - ${eq.category}\n`;
      });
      msg += `\n${equipment.length + 1}. None / General\n\nReply with a number.`;
      ctx.stateData.equipmentList = equipment.map((e) => ({ id: e.id, name: e.name, assetNumber: e.assetNumber }));
      updateState(ctx, 'new_complaint_equipment', ctx.stateData);
      return [{ content: msg }];
    }
  }

  // No equipment — create complaint directly
  return createComplaintFromDescription(ctx);
}

async function handleNewComplaintEquipment(ctx: StateContext): Promise<ResponseItem[]> {
  const input = ctx.message.trim();

  if (input === '0' || input.toLowerCase() === 'none' || input.toLowerCase() === 'general') {
    ctx.stateData.equipmentId = null;
    return createComplaintFromDescription(ctx);
  }

  const idx = parseInt(input) - 1;
  const equipmentList = ctx.stateData.equipmentList as Array<{ id: string; name: string }> | undefined;

  if (equipmentList && idx >= 0 && idx < equipmentList.length) {
    ctx.stateData.equipmentId = equipmentList[idx].id;
    return createComplaintFromDescription(ctx);
  }

  // If it doesn't look like a number, treat as "none"
  if (isNaN(parseInt(input))) {
    ctx.stateData.equipmentId = null;
    return createComplaintFromDescription(ctx);
  }

  return [{ content: 'Invalid selection. Please choose a number from the list or reply "none".' }];
}

async function handleNewComplaintMedia(_ctx: StateContext): Promise<ResponseItem[]> {
  // Media messages are handled by the webhook — we store them and continue the flow
  return [{ content: 'Media received. Continue describing your issue or reply *done* when finished.' }];
}

async function createComplaintFromDescription(ctx: StateContext): Promise<ResponseItem[]> {
  const description = ctx.stateData.complaintDescription as string;
  const equipmentId = ctx.stateData.equipmentId as string | null;

  if (!description) {
    return showMenu(ctx);
  }

  // Determine category from keywords
  const category = detectCategory(description);
  const priority = ctx.config.defaultPriority || 'medium';

  // Create customer if needed
  let customerId = ctx.customerId;
  if (!customerId) {
    const customer = await db.customer.create({
      data: {
        tenantId: ctx.tenantId,
        name: `WhatsApp User ${ctx.session.phoneNumber.slice(-4)}`,
        phone: ctx.session.phoneNumber,
        customerNumber: `CUST-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
        isActive: true,
      },
    });
    customerId = customer.id;
    await db.whatsAppSession.update({
      where: { id: ctx.session.id },
      data: { customerId },
    });
  }

  // Auto-route: find supervisor by category
  const supervisor = await findSupervisorByCategory(category, ctx.tenantId);

  // Create complaint
  const complaint = await db.complaint.create({
    data: {
      tenantId: ctx.tenantId,
      customerId,
      equipmentId,
      title: `WhatsApp: ${description.slice(0, 80)}`,
      description: `[WhatsApp] ${description}`,
      priority,
      status: 'OPEN',
      category,
      supervisorId: supervisor?.id || null,
    },
  });

  updateState(ctx, 'menu', {});

  return [
    {
      content: `✅ *Complaint Created Successfully!*\n\n📋 ID: ${complaint.id.slice(-8).toUpperCase()}\n📝 ${description.slice(0, 100)}${description.length > 100 ? '...' : ''}\n⚠️ Priority: ${priority.toUpperCase()}\n📁 Category: ${category || 'General'}\n\nWe'll process this shortly. Reply *3* to check status.`,
      isTemplate: false,
    },
  ];
}

// ============ Service Request ============

async function handleServiceRequestDesc(ctx: StateContext): Promise<ResponseItem[]> {
  const description = ctx.message;
  if (description.length < 5) {
    return [{ content: 'Please provide more details about the service you need.' }];
  }

  let customerId = ctx.customerId;
  if (!customerId) {
    const customer = await db.customer.create({
      data: {
        tenantId: ctx.tenantId,
        name: `WhatsApp User ${ctx.session.phoneNumber.slice(-4)}`,
        phone: ctx.session.phoneNumber,
        customerNumber: `CUST-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
        isActive: true,
      },
    });
    customerId = customer.id;
    await db.whatsAppSession.update({ where: { id: ctx.session.id }, data: { customerId } });
  }

  const category = detectCategory(description);

  const complaint = await db.complaint.create({
    data: {
      tenantId: ctx.tenantId,
      customerId,
      title: `Service Request: ${description.slice(0, 80)}`,
      description: `[WhatsApp Service Request] ${description}`,
      priority: 'medium',
      status: 'OPEN',
      category,
    },
  });

  updateState(ctx, 'menu', {});

  return [
    {
      content: `✅ *Service Request Created!*\n\n📋 ID: ${complaint.id.slice(-8).toUpperCase()}\n📝 ${description.slice(0, 100)}\n📁 Category: ${category || 'General'}\n\nOur team will review and contact you soon.\nReply *3* to check status.`,
      isTemplate: false,
    },
  ];
}

// ============ Status Query ============

async function handleStatusQuery(ctx: StateContext): Promise<ResponseItem[]> {
  const query = ctx.message.trim().toUpperCase();

  // Try to find complaint by ID fragment
  const complaints = await db.complaint.findMany({
    where: {
      tenantId: ctx.tenantId,
      customerId: ctx.customerId || undefined,
      OR: [
        { id: { contains: query } },
        { title: { contains: query } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      assignedTo: { select: { name: true } },
    },
  });

  if (complaints.length === 0) {
    updateState(ctx, 'menu', {});
    return [{ content: 'No complaints found matching your query.\n\nPlease check the ID and try again, or reply *menu*.' }];
  }

  updateState(ctx, 'menu', {});

  const statusEmoji: Record<string, string> = {
    OPEN: '🟡',
    ASSIGNED: '🔵',
    IN_PROGRESS: '🟠',
    RESOLVED: '🟢',
    CLOSED: '✅',
  };

  let msg = `📋 *Found ${complaints.length} complaint(s):*\n\n`;
  complaints.forEach((c, i) => {
    const emoji = statusEmoji[c.status] || '⚪';
    const tech = c.assignedTo ? `🔧 ${c.assignedTo.name}` : '';
    msg += `${emoji} *${c.id.slice(-8).toUpperCase()}* — ${c.status}\n   ${c.title.slice(0, 60)}\n   ${tech}\n\n`;
  });

  msg += 'Reply *menu* for more options.';
  return [{ content: msg }];
}

// ============ Invoice Query ============

async function handleInvoiceQuery(ctx: StateContext): Promise<ResponseItem[]> {
  if (!ctx.customerId) {
    return [{ content: 'Please register first by creating a complaint.\nReply *1* to create a new complaint.' }];
  }

  const invoices = await db.invoice.findMany({
    where: { tenantId: ctx.tenantId, customerId: ctx.customerId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  updateState(ctx, 'menu', {});

  if (invoices.length === 0) {
    return [{ content: 'No invoices found for your account.\nReply *menu* for more options.' }];
  }

  const statusEmoji: Record<string, string> = {
    DRAFT: '📝',
    PENDING: '🟡',
    APPROVED: '🔵',
    PAID: '✅',
    CANCELLED: '❌',
    OVERDUE: '🔴',
  };

  let msg = `💰 *Your Recent Invoices:*\n\n`;
  invoices.forEach((inv) => {
    const emoji = statusEmoji[inv.status] || '⚪';
    msg += `${emoji} *${inv.invoiceNumber}*\n   Amount: $${inv.total.toFixed(2)}\n   Status: ${inv.status}\n   Due: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}\n\n`;
  });

  msg += 'Reply *menu* for more options.';
  return [{ content: msg }];
}

// ============ Equipment List ============

async function handleEquipmentList(ctx: StateContext): Promise<ResponseItem[]> {
  if (!ctx.customerId) {
    return [{ content: 'Please register first by creating a complaint.\nReply *1* to create a new complaint.' }];
  }

  const equipment = await db.equipment.findMany({
    where: { tenantId: ctx.tenantId, customerId: ctx.customerId },
    select: { name: true, assetNumber: true, category: true, status: true, location: true },
    take: 15,
  });

  updateState(ctx, 'menu', {});

  if (equipment.length === 0) {
    return [{ content: 'No equipment registered to your account.\nReply *menu* for more options.' }];
  }

  const statusEmoji: Record<string, string> = {
    active: '🟢',
    inactive: '🔴',
    under_maintenance: '🟠',
    decommissioned: '⚫',
  };

  let msg = `🔧 *Your Equipment (${equipment.length}):*\n\n`;
  equipment.forEach((eq) => {
    const emoji = statusEmoji[eq.status] || '⚪';
    msg += `${emoji} *${eq.assetNumber}*\n   ${eq.name} (${eq.category})\n   Location: ${eq.location || 'N/A'}\n\n`;
  });

  msg += 'Reply *menu* for more options.';
  return [{ content: msg }];
}

// ============ Emergency ============

async function handleEmergencyDesc(ctx: StateContext): Promise<ResponseItem[]> {
  const description = ctx.message;
  if (description.length < 5) {
    return [{ content: 'Please describe the emergency in detail.' }];
  }

  let customerId = ctx.customerId;
  if (!customerId) {
    const customer = await db.customer.create({
      data: {
        tenantId: ctx.tenantId,
        name: `WhatsApp User ${ctx.session.phoneNumber.slice(-4)}`,
        phone: ctx.session.phoneNumber,
        customerNumber: `CUST-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
        isActive: true,
      },
    });
    customerId = customer.id;
    await db.whatsAppSession.update({ where: { id: ctx.session.id }, data: { customerId } });
  }

  // Create high-priority complaint
  const complaint = await db.complaint.create({
    data: {
      tenantId: ctx.tenantId,
      customerId,
      title: `🚨 EMERGENCY: ${description.slice(0, 80)}`,
      description: `[WhatsApp Emergency] ${description}`,
      priority: 'critical',
      status: 'OPEN',
      category: detectCategory(description),
    },
  });

  // Create escalation report
  await db.customerReport.create({
    data: {
      tenantId: ctx.tenantId,
      customerId,
      sessionId: ctx.session.id,
      type: 'escalation',
      subject: `Emergency via WhatsApp: ${description.slice(0, 60)}`,
      description,
      priority: 'high',
      status: 'OPEN',
    },
  });

  updateState(ctx, 'menu', {});

  const responses: ResponseItem[] = [
    {
      content: `🚨 *EMERGENCY ACKNOWLEDGED*\n\nYour emergency report has been received.\n\n📋 ID: ${complaint.id.slice(-8).toUpperCase()}\n⚠️ Priority: CRITICAL\n\nOur emergency response team has been alerted.\nExpected response time: 15 minutes\n\nIf you need immediate assistance, call our emergency line.`,
      isTemplate: false,
    },
  ];

  // Send to emergency numbers if configured
  if (ctx.config.emergencyNumbers) {
    try {
      const numbers = JSON.parse(ctx.config.emergencyNumbers) as string[];
      if (numbers.length > 0) {
        responses.push({
          content: `⚠️ Emergency alert from ${ctx.session.phoneNumber}:\n\n${description}\n\nComplaint: ${complaint.id}`,
          isTemplate: false,
        });
      }
    } catch {
      // Invalid JSON in emergency numbers
    }
  }

  return responses;
}

// ============ Feedback ============

async function handleFeedbackRating(ctx: StateContext): Promise<ResponseItem[]> {
  const rating = parseInt(ctx.message.trim());

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return [{ content: 'Please reply with a number between 1 and 5.\n1 = Very Poor, 5 = Excellent' }];
  }

  ctx.stateData.feedbackRating = rating;

  if (rating >= 4) {
    // Happy path — optional comment
    updateState(ctx, 'feedback_comment', ctx.stateData);
    return [{ content: `Thank you for the ${rating} ⭐ rating!\n\nWould you like to leave a comment? (optional — reply *skip* to finish)` }];
  }

  // Low rating — ask for comment
  updateState(ctx, 'feedback_comment', ctx.stateData);
  return [{ content: `We're sorry for the ${rating} ⭐ experience.\n\nPlease tell us what went wrong so we can improve.` }];
}

async function handleFeedbackComment(ctx: StateContext): Promise<ResponseItem[]> {
  const rating = ctx.stateData.feedbackRating as number;
  const comment = ctx.message.toLowerCase().trim() === 'skip' ? null : ctx.message;

  // Save feedback if we have a complaint ID
  const complaintId = ctx.stateData.complaintId as string | undefined;
  if (complaintId && ctx.customerId) {
    try {
      await db.customerFeedback.create({
        data: {
          tenantId: ctx.tenantId,
          customerId: ctx.customerId,
          complaintId,
          rating,
          comment,
          source: 'whatsapp',
        },
      });

      // Update complaint with rating
      await db.complaint.update({
        where: { id: complaintId },
        data: { customerRating: rating, customerFeedback: comment },
      });
    } catch {
      // Feedback save failed — non-critical
    }
  }

  updateState(ctx, 'menu', {});

  if (rating >= 4) {
    return [{ content: 'Thank you for your feedback! 🎉\nWe appreciate your time.\n\nReply *menu* for more options.' }];
  }

  return [{ content: 'Thank you for your feedback. We take your concerns seriously and will work to improve.\n\nReply *menu* for more options.' }];
}

// ============ Escalation ============

async function handleEscalationDesc(ctx: StateContext): Promise<ResponseItem[]> {
  const description = ctx.message;
  if (description.length < 5) {
    return [{ content: 'Please describe your concern in detail.' }];
  }

  if (ctx.customerId) {
    await db.customerReport.create({
      data: {
        tenantId: ctx.tenantId,
        customerId: ctx.customerId,
        sessionId: ctx.session.id,
        type: 'escalation',
        subject: `Escalation via WhatsApp`,
        description,
        priority: 'high',
        status: 'OPEN',
      },
    });
  }

  updateState(ctx, 'menu', {});
  return [{ content: '✅ Your escalation has been submitted. A manager will review it and get back to you.\n\nReply *menu* for more options.' }];
}

// ============ Chat ============

async function handleChat(ctx: StateContext): Promise<ResponseItem[]> {
  // In chat mode, we just acknowledge and wait for agent
  // The message is already saved by the webhook
  // Agent will respond via the admin panel
  return [{
    content: 'Your message has been received. An agent will respond shortly.\n\nReply *menu* to return to the main menu.',
  }];
}

// ============ Appointment Flow ============

async function handleAppointmentDate(ctx: StateContext): Promise<ResponseItem[]> {
  const dateStr = ctx.message.trim();
  // Try to parse the date
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return [{ content: 'Please provide a valid date (e.g., 2024-12-25 or "next Monday").' }];
  }

  ctx.stateData.appointmentDate = parsed.toISOString().split('T')[0];
  updateState(ctx, 'appointment_time', ctx.stateData);
  return [{ content: `Date: ${parsed.toLocaleDateString()}\n\nPlease provide your preferred time (e.g., 10:00 AM, 2:30 PM).` }];
}

async function handleAppointmentTime(ctx: StateContext): Promise<ResponseItem[]> {
  const time = ctx.message.trim();
  ctx.stateData.appointmentTime = time;
  updateState(ctx, 'appointment_location', ctx.stateData);
  return [{ content: `Time: ${time}\n\nPlease provide the location/address for the appointment.` }];
}

async function handleAppointmentLocation(ctx: StateContext): Promise<ResponseItem[]> {
  const location = ctx.message.trim();
  const date = ctx.stateData.appointmentDate as string;
  const time = ctx.stateData.appointmentTime as string;

  updateState(ctx, 'menu', {});

  // Store as a notification/work order for the team
  if (ctx.customerId) {
    await db.notification.create({
      data: {
        tenantId: ctx.tenantId,
        type: 'appointment',
        title: 'New Appointment Request via WhatsApp',
        message: `Customer: ${ctx.session.phoneNumber}\nDate: ${date}\nTime: ${time}\nLocation: ${location}`,
        data: JSON.stringify({ date, time, location, sessionId: ctx.session.id, source: 'whatsapp' }),
      },
    });
  }

  return [{
    content: `✅ *Appointment Request Submitted*\n\n📅 Date: ${date}\n🕐 Time: ${time}\n📍 Location: ${location}\n\nWe will confirm your appointment shortly.\nReply *menu* for more options.`,
  }];
}

// ============ Helpers ============

function transitionTo(ctx: StateContext, newState: string, message: string): ResponseItem[] {
  updateState(ctx, newState, ctx.stateData);
  return [{ content: message }];
}

function updateState(ctx: StateContext, state: string, stateData: Record<string, unknown>): void {
  // Fire and forget — don't await in state handlers
  db.whatsAppSession.update({
    where: { id: ctx.session.id },
    data: {
      state,
      stateData: Object.keys(stateData).length > 0 ? JSON.stringify(stateData) : null,
    },
  }).catch(() => {});
}

function parseJson(str: string | null | undefined): Record<string, unknown> {
  if (!str) return {};
  try {
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function detectCategory(text: string): string {
  const t = text.toLowerCase();
  const patterns: Record<string, string[]> = {
    HVAC: ['ac', 'air con', 'aircond', 'cooling', 'heating', 'thermostat', 'duct', 'ventilation', 'fan', 'compressor', 'refrigeration', 'chiller', 'furnace'],
    Electrical: ['electric', 'power', 'light', 'switch', 'outlet', 'circuit', 'wiring', 'generator', 'ups', 'voltage', 'fuse', 'panel', 'breaker'],
    Plumbing: ['plumb', 'pipe', 'drain', 'leak', 'water', 'faucet', 'toilet', 'sewage', 'bathroom', 'sink', 'valve', 'pump', 'tank'],
    Mechanical: ['mechanical', 'motor', 'pump', 'belt', 'bearing', 'gear', 'shaft', 'hydraulic', 'pneumatic', 'elevator', 'lift', 'escalator'],
    FireProtection: ['fire', 'alarm', 'sprinkler', 'extinguisher', 'smoke', 'detector', 'fire suppression', 'fire escape'],
  };

  for (const [category, keywords] of Object.entries(patterns)) {
    if (keywords.some((kw) => t.includes(kw))) {
      return category;
    }
  }

  return 'General';
}

async function findSupervisorByCategory(category: string, tenantId: string) {
  // Find a supervisor or manager in the same department (or any active supervisor)
  const supervisors = await db.user.findMany({
    where: {
      tenantId,
      role: { in: ['supervisor', 'manager'] },
      isActive: true,
    },
    take: 5,
  });

  if (supervisors.length === 0) {
    // Fallback: find any admin
    const admins = await db.user.findMany({
      where: { tenantId, role: 'admin', isActive: true },
      take: 1,
    });
    return admins[0] || null;
  }

  // Simple round-robin based on current complaint count
  const supervisorCounts = await Promise.all(
    supervisors.map(async (s) => {
      const count = await db.complaint.count({
        where: { tenantId, supervisorId: s.id, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
      });
      return { supervisor: s, count };
    })
  );

  supervisorCounts.sort((a, b) => a.count - b.count);
  return supervisorCounts[0]?.supervisor || null;
}