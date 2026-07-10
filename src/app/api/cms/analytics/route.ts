import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

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