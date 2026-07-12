/**
 * Customer Memory — Build context about a customer for AI conversations.
 *
 * Aggregates customer profile, equipment, open tickets, and recent history
 * into a structured context string that the AI can use for personalized responses.
 */

import { db } from '@/core/database/db';

export interface CustomerContext {
  customerName: string;
  companyName: string | null;
  phoneNumber: string;
  equipment: Array<{ name: string; assetNumber: string; category: string; status: string }>;
  openComplaints: Array<{
    id: string;
    number: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    equipment?: string;
  }>;
  recentClosedComplaints: Array<{
    id: string;
    number: string;
    title: string;
    closedAt: string;
  }>;
  unpaidInvoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  summary: string;
}

/**
 * Build a comprehensive customer context string for the AI.
 */
export async function buildCustomerContext(
  tenantId: string,
  customerId: string | null,
  phoneNumber: string,
): Promise<CustomerContext> {
  if (!customerId) {
    return {
      customerName: 'WhatsApp User',
      companyName: null,
      phoneNumber,
      equipment: [],
      openComplaints: [],
      recentClosedComplaints: [],
      unpaidInvoices: [],
      summary: `New/unknown customer contacting via ${phoneNumber}. No linked CMMS account yet.`,
    };
  }

  // Fetch customer data in parallel
  const [customer, equipment, openComplaints, recentClosed, unpaidInvoices] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId } }),
    db.equipment.findMany({
      where: { tenantId, customerId, status: { in: ['active', 'under_maintenance', 'critical', 'overdue_pm'] } },
      select: { name: true, assetNumber: true, category: true, status: true },
      take: 10,
    }),
    db.complaint.findMany({
      where: { tenantId, customerId, status: { notIn: ['CLOSED', 'PAID'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { equipment: { select: { name: true } } },
    }),
    db.complaint.findMany({
      where: { tenantId, customerId, status: { in: ['CLOSED', 'PAID'] } },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
    db.invoice.findMany({
      where: { tenantId, customerId, status: { not: 'PAID' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  if (!customer) {
    return {
      customerName: 'Unknown',
      companyName: null,
      phoneNumber,
      equipment: [],
      openComplaints: [],
      recentClosedComplaints: [],
      unpaidInvoices: [],
      summary: `Customer ID ${customerId} not found in database.`,
    };
  }

  const context: CustomerContext = {
    customerName: customer.name,
    companyName: customer.companyName,
    phoneNumber,
    equipment: equipment.map((e) => ({
      name: e.name,
      assetNumber: e.assetNumber,
      category: e.category,
      status: e.status,
    })),
    openComplaints: openComplaints.map((c) => ({
      id: c.id,
      number: `CMP-${c.id.slice(-5).toUpperCase()}`,
      title: c.title,
      status: c.status,
      priority: c.priority,
      createdAt: c.createdAt.toISOString(),
      equipment: c.equipment?.name,
    })),
    recentClosedComplaints: recentClosed.map((c) => ({
      id: c.id,
      number: `CMP-${c.id.slice(-5).toUpperCase()}`,
      title: c.title,
      closedAt: c.closedAt?.toISOString() || c.updatedAt.toISOString(),
    })),
    unpaidInvoices: unpaidInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      totalAmount: inv.totalAmount,
      status: inv.status,
      createdAt: inv.createdAt.toISOString(),
    })),
    summary: '',
  };

  // Build human-readable summary
  const parts: string[] = [];
  parts.push(`Customer: ${customer.name}${customer.companyName ? ` (${customer.companyName})` : ''}`);
  parts.push(`Phone: ${phoneNumber}`);

  if (context.equipment.length > 0) {
    parts.push(`Registered Equipment (${context.equipment.length}): ${context.equipment.map((e) => `${e.name} [${e.assetNumber}]`).join(', ')}`);
  }

  if (context.openComplaints.length > 0) {
    parts.push(`Open Complaints (${context.openComplaints.length}):`);
    for (const c of context.openComplaints) {
      parts.push(`  - ${c.number}: "${c.title}" [${c.status}, ${c.priority} priority]${c.equipment ? ` (${c.equipment})` : ''}`);
    }
  } else {
    parts.push('No open complaints.');
  }

  if (context.unpaidInvoices.length > 0) {
    parts.push(`Outstanding Invoices: ${context.unpaidInvoices.length} unpaid invoice(s).`);
  }

  context.summary = parts.join('\n');
  return context;
}

/**
 * Format customer context into a concise string for the AI system prompt.
 */
export function formatContextForAI(context: CustomerContext): string {
  return context.summary;
}