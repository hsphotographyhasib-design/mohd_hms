import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const template = await db.whatsAppTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      category: template.category,
      content: template.content,
      variables: template.variables,
      mediaType: template.mediaType,
      mediaUrl: template.mediaUrl,
      isActive: template.isActive,
      isSystem: template.isSystem,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp template detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;
    const body = await req.json();

    const template = await db.whatsAppTemplate.findFirst({ where: { id, tenantId } });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.content !== undefined) {
      data.content = body.content;
      const varMatch = body.content.match(/\{\{(\w+)\}\}/g);
      data.variables = varMatch ? JSON.stringify(varMatch.map((v: string) => v.replace(/[{}]/g, ''))) : null;
    }
    if (body.variables !== undefined) data.variables = body.variables;
    if (body.mediaType !== undefined) data.mediaType = body.mediaType;
    if (body.mediaUrl !== undefined) data.mediaUrl = body.mediaUrl;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await db.whatsAppTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      category: updated.category,
      content: updated.content,
      variables: updated.variables,
      mediaType: updated.mediaType,
      mediaUrl: updated.mediaUrl,
      isActive: updated.isActive,
      isSystem: updated.isSystem,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp template update error:', error);
    if (error instanceof Error && error.message.includes('Unique')) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const template = await db.whatsAppTemplate.findFirst({ where: { id, tenantId } });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.isSystem) {
      return NextResponse.json({ error: 'System templates cannot be deleted' }, { status: 403 });
    }

    await db.whatsAppTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('WhatsApp template delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}