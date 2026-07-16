import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { photoId } = await params;
    const body = await request.json();

    const { type, ...rest } = body;
    const updateData: Record<string, unknown> = { ...rest };
    if (type !== undefined) updateData.type = type;

    const photo = await db.irmPhoto.update({
      where: { id: photoId },
      data: updateData,
    });

    return NextResponse.json(photo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { photoId } = await params;

    await db.irmPhoto.delete({ where: { id: photoId } });

    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}