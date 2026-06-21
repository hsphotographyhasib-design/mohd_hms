import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';

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
      publishedBlogs,
      activeServices,
      activeProjects,
      activeTestimonials,
      contactRequests,
      careerApplications,
      unreadMessages,
      announcements,
      recentActivity,
      draftBlogs,
      totalBlogs,
      totalProjects,
      totalMedia,
      activeCareers,
    ] = await Promise.all([
      db.cmsBlog.count({ where: { tenantId, status: 'published' } }),
      db.cmsService.count({ where: { tenantId, status: 'active' } }),
      db.cmsProject.count({ where: { tenantId, status: 'active' } }),
      db.cmsTestimonial.count({ where: { tenantId, status: 'active' } }),
      db.cmsContactMessage.count({ where: { tenantId } }),
      db.cmsCareerApplication.count({ where: { tenantId } }),
      db.cmsContactMessage.count({ where: { tenantId, status: 'new' } }),
      db.cmsAnnouncement.count({ where: { tenantId, isEnabled: true } }),
      db.cmsActivityLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.cmsBlog.count({ where: { tenantId, status: 'draft' } }),
      db.cmsBlog.count({ where: { tenantId } }),
      db.cmsProject.count({ where: { tenantId } }),
      db.cmsMedia.count({ where: { tenantId } }),
      db.cmsCareerJob.count({ where: { tenantId, status: 'open' } }),
    ]);

    return NextResponse.json({
      overview: {
        publishedBlogs,
        activeServices,
        activeProjects,
        activeTestimonials,
        contactRequests,
        careerApplications,
        unreadMessages,
        announcements,
      },
      quickStats: {
        draftBlogs,
        totalBlogs,
        totalProjects,
        totalMedia,
        activeCareers,
      },
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
    console.error('CMS dashboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}