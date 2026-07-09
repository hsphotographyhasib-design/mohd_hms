import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    let config = await db.whatsAppConfig.findUnique({ where: { tenantId } });

    if (!config) {
      config = await db.whatsAppConfig.create({
        data: {
          tenantId,
          provider: 'openwa',
          isEnabled: false,
          openwaStatus: 'disconnected',
          welcomeMessage: 'Welcome to MOHD.HMS ENTERPRISE! How can we help?',
          defaultPriority: 'medium',
          autoReplyEnabled: true,
        },
      });
    }

    return NextResponse.json({
      aiEnabled: config.aiEnabled,
      aiSystemPrompt: config.aiSystemPrompt,
      aiTypingDelay: config.aiTypingDelay,
      aiMaxContext: config.aiMaxContext,
      aiBusinessHours: config.aiBusinessHours,
      aiLanguage: config.aiLanguage,
      aiEscalationRules: config.aiEscalationRules,
      aiKnowledgeBase: config.aiKnowledgeBase,
    });
  } catch (error) {
    console.error('[AI Settings GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await req.json();

    // Ensure config exists
    const existing = await db.whatsAppConfig.findUnique({ where: { tenantId } });
    if (!existing) {
      await db.whatsAppConfig.create({
        data: {
          tenantId,
          provider: 'openwa',
          isEnabled: false,
          openwaStatus: 'disconnected',
          welcomeMessage: 'Welcome to MOHD.HMS ENTERPRISE! How can we help?',
          defaultPriority: 'medium',
          autoReplyEnabled: true,
        },
      });
    }

    // Build update data — only include fields that are provided
    const updateData: Record<string, unknown> = {};
    if (body.aiEnabled !== undefined) updateData.aiEnabled = Boolean(body.aiEnabled);
    if (body.aiSystemPrompt !== undefined) updateData.aiSystemPrompt = body.aiSystemPrompt || null;
    if (body.aiTypingDelay !== undefined) updateData.aiTypingDelay = Number(body.aiTypingDelay);
    if (body.aiMaxContext !== undefined) updateData.aiMaxContext = Number(body.aiMaxContext);
    if (body.aiBusinessHours !== undefined) updateData.aiBusinessHours = body.aiBusinessHours;
    if (body.aiLanguage !== undefined) updateData.aiLanguage = body.aiLanguage;
    if (body.aiEscalationRules !== undefined) updateData.aiEscalationRules = body.aiEscalationRules;
    if (body.aiKnowledgeBase !== undefined) updateData.aiKnowledgeBase = body.aiKnowledgeBase;

    const config = await db.whatsAppConfig.update({
      where: { tenantId },
      data: updateData,
    });

    return NextResponse.json({
      aiEnabled: config.aiEnabled,
      aiSystemPrompt: config.aiSystemPrompt,
      aiTypingDelay: config.aiTypingDelay,
      aiMaxContext: config.aiMaxContext,
      aiBusinessHours: config.aiBusinessHours,
      aiLanguage: config.aiLanguage,
      aiEscalationRules: config.aiEscalationRules,
      aiKnowledgeBase: config.aiKnowledgeBase,
    });
  } catch (error) {
    console.error('[AI Settings PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}