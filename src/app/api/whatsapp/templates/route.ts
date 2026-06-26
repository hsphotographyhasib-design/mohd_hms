import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '50');
    const category = req.nextUrl.searchParams.get('category') || '';
    const search = req.nextUrl.searchParams.get('search') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.WhatsAppTemplateWhereInput = { tenantId };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      db.whatsAppTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
      }),
      db.whatsAppTemplate.count({ where }),
    ]);

    const data = items.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      name: t.name,
      category: t.category,
      content: t.content,
      variables: t.variables,
      mediaType: t.mediaType,
      mediaUrl: t.mediaUrl,
      isActive: t.isActive,
      isSystem: t.isSystem,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('WhatsApp templates list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await req.json();
    const { name, category, content, variables, mediaType, mediaUrl, isActive } = body;

    if (!name || !category || !content) {
      return NextResponse.json({ error: 'Name, category, and content are required' }, { status: 400 });
    }

    // Extract variables from content if not provided
    const varMatch = content.match(/\{\{(\w+)\}\}/g);
    const extractedVars = variables || (varMatch ? JSON.stringify(varMatch.map((v: string) => v.replace(/[{}]/g, ''))) : null);

    const template = await db.whatsAppTemplate.create({
      data: {
        tenantId,
        name,
        category,
        content,
        variables: extractedVars,
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
        isActive: isActive !== undefined ? isActive : true,
        isSystem: false,
      },
    });

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
    }, { status: 201 });
  } catch (error) {
    console.error('WhatsApp template create error:', error);
    if (error instanceof Error && error.message.includes('Unique')) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}