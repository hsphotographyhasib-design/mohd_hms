import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const SYSTEM_TEMPLATES = [
  {
    name: 'welcome',
    category: 'welcome',
    content: 'Welcome to {{company_name}}! How can we help you today?\n\n1️⃣ New Complaint\n2️⃣ Service Request\n3️⃣ Complaint Status\n4️⃣ My Equipment\n5️⃣ Work Order Status\n6️⃣ Invoices\n7️⃣ Emergency Service\n8️⃣ Speak to Customer Support',
    variables: JSON.stringify(['company_name']),
  },
  {
    name: 'complaint_created',
    category: 'complaint_created',
    content: 'Your complaint {{complaint_id}} has been created. Priority: {{priority}}. We\'ll get back to you shortly.',
    variables: JSON.stringify(['complaint_id', 'priority']),
  },
  {
    name: 'assigned',
    category: 'assigned',
    content: 'Your complaint {{complaint_id}} has been assigned to {{technician_name}}. ETA: {{eta}} minutes.',
    variables: JSON.stringify(['complaint_id', 'technician_name', 'eta']),
  },
  {
    name: 'in_progress',
    category: 'in_progress',
    content: 'Work on your complaint {{complaint_id}} is in progress. Technician {{technician_name}} is working on it.',
    variables: JSON.stringify(['complaint_id', 'technician_name']),
  },
  {
    name: 'completed',
    category: 'completed',
    content: 'Your complaint {{complaint_id}} has been resolved. Please rate our service (1-5 ⭐).',
    variables: JSON.stringify(['complaint_id']),
  },
  {
    name: 'invoice',
    category: 'invoice',
    content: 'Invoice {{invoice_number}} for {{amount}} is ready. Due: {{due_date}}.',
    variables: JSON.stringify(['invoice_number', 'amount', 'due_date']),
  },
  {
    name: 'feedback',
    category: 'feedback',
    content: 'How would you rate our service? Reply with a number 1-5 ⭐',
    variables: null,
  },
  {
    name: 'emergency',
    category: 'emergency',
    content: '🚨 Emergency service request received! Our team has been alerted. Expected response: 15 minutes.',
    variables: null,
  },
  {
    name: 'appointment',
    category: 'appointment',
    content: 'Your appointment is confirmed for {{date}} at {{time}}. Technician: {{technician_name}}. Location: {{location}}.',
    variables: JSON.stringify(['date', 'time', 'technician_name', 'location']),
  },
  {
    name: 'notification',
    category: 'notification',
    content: '{{title}}\n\n{{message}}',
    variables: JSON.stringify(['title', 'message']),
  },
];

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    let created = 0;
    let skipped = 0;

    for (const tpl of SYSTEM_TEMPLATES) {
      try {
        await db.whatsAppTemplate.create({
          data: {
            tenantId,
            name: tpl.name,
            category: tpl.category,
            content: tpl.content,
            variables: tpl.variables,
            isActive: true,
            isSystem: true,
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: SYSTEM_TEMPLATES.length,
      message: `Seeded ${created} templates, ${skipped} already existed`,
    });
  } catch (error) {
    console.error('WhatsApp seed templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}