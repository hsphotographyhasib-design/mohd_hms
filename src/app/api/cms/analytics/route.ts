import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const headersList = await headers();
  const auth = headersList.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

function isAuth(user: JwtPayload | null): user is JwtPayload {
  return !!user;
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAuth(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;

    const [
      totalVisitors,
      publishedBlogsCount,
      activeProjectsCount,
      activeTestimonialsCount,
      activeServicesCount,
      unreadMessagesCount,
      newApplicationsCount,
      recentActivity,
    ] = await Promise.all([
      db.cmsActivityLog.count({ where: { tenantId } }),
      db.cmsBlog.count({ where: { tenantId, status: 'published' } }),
      db.cmsProject.count({ where: { tenantId, status: 'active' } }),
      db.cmsTestimonial.count({ where: { tenantId, status: 'active' } }),
      db.cmsService.count({ where: { tenantId, status: 'active' } }),
      db.cmsContactMessage.count({ where: { tenantId, status: 'new' } }),
      db.cmsCareerApplication.count({ where: { tenantId, status: 'new' } }),
      db.cmsActivityLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      totalVisitors,
      publishedBlogsCount,
      activeProjectsCount,
      activeTestimonialsCount,
      activeServicesCount,
      unreadMessagesCount,
      newApplicationsCount,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        userId: a.userId,
        action: a.action,
        section: a.section,
        details: a.details,
        ipAddress: a.ipAddress,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('CMS analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}