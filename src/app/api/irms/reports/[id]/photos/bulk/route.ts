import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import sharp from 'sharp';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id: reportId } = await params;
    const body = await request.json();
    const { action, photoIds, category, room, swRef } = body as {
      action: 'delete' | 'move' | 'rotate' | 'duplicate';
      photoIds: string[];
      category?: string;
      room?: string;
      swRef?: string;
    };

    if (!action || !Array.isArray(photoIds)) {
      return NextResponse.json({ error: 'action and photoIds are required' }, { status: 400 });
    }

    switch (action) {
      case 'delete': {
        await db.irmPhoto.deleteMany({
          where: { id: { in: photoIds }, reportId },
        });
        return NextResponse.json({ deleted: photoIds.length });
      }

      case 'move': {
        if (!category && !room && !swRef) {
          return NextResponse.json({ error: 'At least one of category, room, or swRef is required' }, { status: 400 });
        }
        const moveData: Record<string, unknown> = {};
        if (category) moveData.type = category;
        if (room) moveData.room = room;
        if (swRef) moveData.swRef = swRef;

        const updated = await db.irmPhoto.updateMany({
          where: { id: { in: photoIds }, reportId },
          data: moveData,
        });
        return NextResponse.json({ updated: updated.count });
      }

      case 'rotate': {
        const rotatedPhotos: any[] = [];
        for (const photoId of photoIds) {
          const photo = await db.irmPhoto.findUnique({ where: { id: photoId } });
          if (!photo) continue;

          // Extract base64 data from data URL
          const base64Match = photo.data.match(/^data:image\/\w+;base64,(.+)$/);
          if (!base64Match) continue;

          const originalBuffer = Buffer.from(base64Match[1], 'base64');

          // Rotate 90 degrees
          const rotatedBuffer = await sharp(originalBuffer)
            .rotate(90)
            .jpeg({ quality: 80 })
            .toBuffer();

          const thumbBuffer = await sharp(rotatedBuffer)
            .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();

          const origMatch = photo.originalImage?.match(/^data:image\/\w+;base64,(.+)$/);
          let rotatedOriginal = photo.originalImage;
          if (origMatch) {
            const origBuf = Buffer.from(origMatch[1], 'base64');
            const rotatedOrig = await sharp(origBuf).rotate(90).jpeg({ quality: 90 }).toBuffer();
            rotatedOriginal = `data:image/jpeg;base64,${rotatedOrig.toString('base64')}`;
          }

          const rotatedMeta = await sharp(rotatedBuffer).metadata();

          const updated = await db.irmPhoto.update({
            where: { id: photoId },
            data: {
              data: `data:image/jpeg;base64,${rotatedBuffer.toString('base64')}`,
              thumbnail: `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`,
              originalImage: rotatedOriginal,
              width: rotatedMeta.width,
              height: rotatedMeta.height,
            },
          });
          rotatedPhotos.push(updated);
        }
        return NextResponse.json(rotatedPhotos);
      }

      case 'duplicate': {
        const duplicated: any[] = [];
        for (const photoId of photoIds) {
          const photo = await db.irmPhoto.findUnique({ where: { id: photoId } });
          if (!photo) continue;

          // eslint-disable-next-line no-unused-vars
          const { id: _id, createdAt: _createdAt, timestamp: _timestamp, ...copyData } = photo;
          const dup = await db.irmPhoto.create({
            data: {
              ...copyData,
              reportId,
              caption: `${photo.caption || ''} (copy)`,
              timestamp: new Date(),
            },
          });
          duplicated.push(dup);
        }
        return NextResponse.json(duplicated, { status: 201 });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bulk operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}