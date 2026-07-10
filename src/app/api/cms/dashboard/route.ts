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
      db.cmsProject.count({ where: { tenantId, status: { in: ['published', 'active'] } } }),
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
        description: a.details ?? '',
        ipAddress: a.ipAddress,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('CMS dashboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}