import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    // Find tenant — look for MOHD.HMS or fall back to first with CMS content
    let tenant = await db.tenant.findUnique({ where: { domain: 'mohdhms.com' } });
    if (!tenant) {
      // Find first tenant that has CMS hero content
      const heroWithTenant = await db.cmsHero.findFirst({
        where: { isActive: true },
        select: { tenantId: true },
      });
      if (heroWithTenant) {
        tenant = await db.tenant.findUnique({ where: { id: heroWithTenant.tenantId } });
      }
    }
    if (!tenant) {
      tenant = await db.tenant.findFirst();
    }
    if (!tenant) {
      return NextResponse.json({
        success: true,
        data: {
          hero: null,
          services: [],
          industries: [],
          testimonials: [],
          projects: [],
          about: null,
          footer: null,
          announcements: [],
          blogs: [],
          careers: [],
        },
      });
    }

    const tenantId = tenant.id;
    const now = new Date();

    // Fire all queries in parallel for performance
    const [
      hero,
      services,
      industries,
      testimonials,
      projects,
      aboutSettings,
      footer,
      announcements,
      blogs,
      careers,
    ] = await Promise.all([
      // Hero: active, latest by publishedAt
      db.cmsHero.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { publishedAt: 'desc' },
      }),

      // Services: enabled & active, ordered by displayOrder
      db.cmsService.findMany({
        where: { tenantId, isEnabled: true, status: 'active' },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          category: true,
          displayOrder: true,
        },
      }),

      // Industries: enabled, ordered by displayOrder
      db.cmsIndustry.findMany({
        where: { tenantId, isEnabled: true },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          name: true,
          icon: true,
          displayOrder: true,
        },
      }),

      // Testimonials: enabled & published, ordered by displayOrder
      db.cmsTestimonial.findMany({
        where: { tenantId, isEnabled: true, status: 'published' },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          customerName: true,
          company: true,
          photo: true,
          rating: true,
          comment: true,
          displayOrder: true,
        },
      }),

      // Projects: published & featured, ordered by displayOrder
      db.cmsProject.findMany({
        where: { tenantId, status: 'published', isFeatured: true },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          category: true,
          completionStatus: true,
          featuredImage: true,
          displayOrder: true,
        },
      }),

      // About: CmsSetting where category = 'about'
      db.cmsSetting.findMany({
        where: {
          tenantId,
          category: 'about',
          key: { in: ['mission', 'vision', 'values', 'description'] },
        },
      }),

      // Footer: first record (singleton per tenant)
      db.cmsFooter.findFirst({
        where: { tenantId },
      }),

      // Announcements: enabled & within schedule (or no schedule)
      db.cmsAnnouncement.findMany({
        where: {
          tenantId,
          isEnabled: true,
          OR: [
            { scheduledFrom: null, scheduledTo: null },
            { scheduledFrom: { lte: now }, scheduledTo: null },
            { scheduledFrom: null, scheduledTo: { gte: now } },
            { scheduledFrom: { lte: now }, scheduledTo: { gte: now } },
          ],
        },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          text: true,
          type: true,
          link: true,
        },
      }),

      // Blogs: published, ordered by publishedAt desc, limit 3
      db.cmsBlog.findMany({
        where: { tenantId, status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          category: { select: { name: true } },
          publishedAt: true,
        },
      }),

      // Careers: open positions
      db.cmsCareerJob.findMany({
        where: { tenantId, status: 'open' },
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          type: true,
          status: true,
        },
      }),
    ]);

    // Build about object from CmsSetting key-value pairs
    const aboutObj: { mission: string | null; vision: string | null; values: string | null; description: string | null } = {
      mission: null,
      vision: null,
      values: null,
      description: null,
    };
    for (const setting of aboutSettings) {
      if (setting.key in aboutObj) {
        try {
          (aboutObj as Record<string, string | null>)[setting.key] = JSON.parse(setting.value);
        } catch {
          (aboutObj as Record<string, string | null>)[setting.key] = setting.value;
        }
      }
    }
    const about = Object.values(aboutObj).every((v) => v === null) ? null : aboutObj;

    // Format hero (exclude internal fields)
    const heroData = hero
      ? {
          headline: hero.headline,
          subheadline: hero.subheadline,
          cta1Text: hero.cta1Text,
          cta1Link: hero.cta1Link,
          cta2Text: hero.cta2Text,
          cta2Link: hero.cta2Link,
          stat1Value: hero.stat1Value,
          stat1Label: hero.stat1Label,
          stat2Value: hero.stat2Value,
          stat2Label: hero.stat2Label,
          stat3Value: hero.stat3Value,
          stat3Label: hero.stat3Label,
          chipText: hero.chipText,
          chipSubtext: hero.chipSubtext,
        }
      : null;

    // Format footer (exclude internal fields)
    const footerData = footer
      ? {
          companyDescription: footer.companyDescription,
          address: footer.address,
          phone: footer.phone,
          email: footer.email,
          whatsapp: footer.whatsapp,
          facebook: footer.facebook,
          instagram: footer.instagram,
          linkedin: footer.linkedin,
          twitter: footer.twitter,
          youtube: footer.youtube,
          copyrightText: footer.copyrightText,
          privacyPolicyLink: footer.privacyPolicyLink,
          termsLink: footer.termsLink,
        }
      : null;

    // Format blogs — flatten category name
    const blogsData = blogs.map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      featuredImage: b.featuredImage,
      category: b.category?.name ?? null,
      publishedAt: b.publishedAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        hero: heroData,
        services,
        industries,
        testimonials,
        projects,
        about,
        footer: footerData,
        announcements,
        blogs: blogsData,
        careers,
      },
    });
  } catch (error) {
    console.error('Public landing API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
