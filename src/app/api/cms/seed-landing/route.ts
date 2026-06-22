import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function upsertByFind<T extends { id: string }>(
  model: any,
  where: Record<string, any>,
  data: Record<string, any>,
): Promise<T> {
  const existing = await model.findFirst({ where });
  if (existing) {
    return model.update({ where: { id: existing.id }, data });
  }
  return model.create({ data: { ...where, ...data } });
}

export async function POST() {
  try {
    const result = await db.$transaction(async (tx) => {
      // ── Tenant ──────────────────────────────────────────────────────
      const tenant = await tx.tenant.upsert({
        where: { domain: 'mohdhms.com' },
        update: { name: 'MOHD.HMS ENTERPRISE' },
        create: { name: 'MOHD.HMS ENTERPRISE', domain: 'mohdhms.com' },
      });
      const tid = tenant.id;

      // ── 1. CmsHero ──────────────────────────────────────────────────
      await upsertByFind(
        tx.cmsHero,
        { tenantId: tid },
        {
          headline: 'Engineering maintenance that keeps your facility running.',
          subheadline:
            'From HVAC to fire protection — one contract, one team, one platform. Certified technicians. Documented work. Measured performance.',
          cta1Text: 'Get a quote',
          cta1Link: '#contact',
          cta2Text: 'Sign in to portal',
          cta2Link: '#',
          stat1Value: '15+',
          stat1Label: 'Years experience',
          stat2Value: '24/7',
          stat2Label: 'Emergency cover',
          stat3Value: '1,200+',
          stat3Label: 'Assets maintained',
          chipText: '98% SLA met',
          chipSubtext: 'across active contracts',
          isActive: true,
          publishedAt: new Date(),
        },
      );

      // ── 2. CmsService (15 services) ─────────────────────────────────
      const servicesData = [
        { name: 'HVAC Maintenance', slug: 'hvac-maintenance', description: 'Chillers, AHUs, ducting, controls', icon: 'wind', category: 'Engineering Maintenance', displayOrder: 1 },
        { name: 'Electrical Maintenance', slug: 'electrical-maintenance', description: 'LV systems, panels, testing', icon: 'bolt', category: 'Engineering Maintenance', displayOrder: 2 },
        { name: 'Plumbing', slug: 'plumbing', description: 'Supply, drainage, pumps', icon: 'drop', category: 'Engineering Maintenance', displayOrder: 3 },
        { name: 'Mechanical', slug: 'mechanical', description: 'Rotating equipment & motors', icon: 'gear', category: 'Engineering Maintenance', displayOrder: 4 },
        { name: 'Generator Maintenance', slug: 'generator-maintenance', description: 'Standby power & load testing', icon: 'truck', category: 'Engineering Maintenance', displayOrder: 5 },
        { name: 'Fire Protection', slug: 'fire-protection', description: 'Detection & suppression checks', icon: 'flame', category: 'Facility & Specialist', displayOrder: 6 },
        { name: 'Civil Maintenance', slug: 'civil-maintenance', description: 'Repairs & waterproofing', icon: 'bricks', category: 'Facility & Specialist', displayOrder: 7 },
        { name: 'Building Maintenance', slug: 'building-maintenance', description: 'Day-to-day facility upkeep', icon: 'building', category: 'Facility & Specialist', displayOrder: 8 },
        { name: 'Cleaning Services', slug: 'cleaning-services', description: 'Facility & specialist cleaning', icon: 'broom', category: 'Facility & Specialist', displayOrder: 9 },
        { name: 'Pest Control', slug: 'pest-control', description: 'Scheduled treatment', icon: 'bug', category: 'Facility & Specialist', displayOrder: 10 },
        { name: 'Landscape', slug: 'landscape', description: 'Grounds & irrigation', icon: 'leaf', category: 'Facility & Specialist', displayOrder: 11 },
        { name: 'Preventive (PPM)', slug: 'preventive-ppm', description: 'Planned maintenance schedules', icon: 'calendar', category: 'Contracts & Response', displayOrder: 12 },
        { name: 'Reactive Maintenance', slug: 'reactive-maintenance', description: 'Fast, documented fault response', icon: 'refresh', category: 'Contracts & Response', displayOrder: 13 },
        { name: 'Emergency Breakdown', slug: 'emergency-breakdown', description: '24/7 rapid response', icon: 'alert', category: 'Contracts & Response', displayOrder: 14 },
        { name: 'Annual Contracts (AMC)', slug: 'annual-contracts-amc', description: 'Bundled cover with SLAs', icon: 'contract', category: 'Contracts & Response', displayOrder: 15 },
      ];

      const serviceResults = await Promise.all(
        servicesData.map((s) =>
          tx.cmsService.upsert({
            where: { tenantId_slug: { tenantId: tid, slug: s.slug } },
            update: {
              name: s.name,
              description: s.description,
              icon: s.icon,
              category: s.category,
              displayOrder: s.displayOrder,
              status: 'active',
              isEnabled: true,
            },
            create: {
              tenantId: tid,
              name: s.name,
              slug: s.slug,
              description: s.description,
              icon: s.icon,
              category: s.category,
              displayOrder: s.displayOrder,
              status: 'active',
              isEnabled: true,
            },
          }),
        ),
      );

      // ── 3. CmsIndustry (14 industries) ──────────────────────────────
      const industriesData = [
        { name: 'Commercial buildings', icon: 'building', displayOrder: 1 },
        { name: 'Factories', icon: 'factory', displayOrder: 2 },
        { name: 'Industrial plants', icon: 'gear', displayOrder: 3 },
        { name: 'Universities', icon: 'school', displayOrder: 4 },
        { name: 'Schools', icon: 'book', displayOrder: 5 },
        { name: 'Hospitals', icon: 'hospital', displayOrder: 6 },
        { name: 'Hotels', icon: 'hotel', displayOrder: 7 },
        { name: 'Shopping malls', icon: 'mall', displayOrder: 8 },
        { name: 'Office buildings', icon: 'building', displayOrder: 9 },
        { name: 'Warehouses', icon: 'warehouse', displayOrder: 10 },
        { name: 'Government', icon: 'gov', displayOrder: 11 },
        { name: 'Residential', icon: 'home', displayOrder: 12 },
        { name: 'Data centres', icon: 'server', displayOrder: 13 },
        { name: 'Power stations', icon: 'power', displayOrder: 14 },
      ];

      const industryResults = await Promise.all(
        industriesData.map((ind) =>
          upsertByFind(
            tx.cmsIndustry,
            { tenantId: tid, name: ind.name },
            {
              icon: ind.icon,
              displayOrder: ind.displayOrder,
              isEnabled: true,
            },
          ),
        ),
      );

      // ── 4. CmsTestimonial (3 testimonials) ─────────────────────────
      const testimonialsData = [
        {
          customerName: 'Facilities Director',
          company: 'Regional Hospital',
          comment: 'Their team turned our reactive maintenance into a planned, measurable operation. Downtime dropped dramatically.',
          rating: 5,
          displayOrder: 1,
          status: 'published',
          isEnabled: true,
        },
        {
          customerName: 'Operations Head',
          company: 'Manufacturing Plant',
          comment: 'Fast emergency response and clear documentation on every job. A genuinely reliable partner.',
          rating: 5,
          displayOrder: 2,
          status: 'published',
          isEnabled: true,
        },
        {
          customerName: 'Property Manager',
          company: 'Commercial Tower',
          comment: 'Their client app gives us full visibility — we always know the status of every request.',
          rating: 5,
          displayOrder: 3,
          status: 'published',
          isEnabled: true,
        },
      ];

      const testimonialResults = await Promise.all(
        testimonialsData.map((t) =>
          upsertByFind(
            tx.cmsTestimonial,
            { tenantId: tid, customerName: t.customerName },
            {
              company: t.company,
              comment: t.comment,
              rating: t.rating,
              displayOrder: t.displayOrder,
              status: t.status,
              isEnabled: t.isEnabled,
            },
          ),
        ),
      );

      // ── 5. CmsProject (6 projects) ──────────────────────────────────
      const projectsData = [
        { title: 'Hospital HVAC Overhaul', slug: 'hospital-hvac-overhaul', description: 'Air-handling unit & ductwork upgrade', category: 'hvac', completionStatus: 'completed', isFeatured: true, displayOrder: 1, status: 'published', publishedAt: new Date('2025-09-01') },
        { title: 'Mall Electrical Upgrade', slug: 'mall-electrical-upgrade', description: 'LV distribution & panel testing', category: 'electrical', completionStatus: 'completed', isFeatured: true, displayOrder: 2, status: 'published', publishedAt: new Date('2025-11-15') },
        { title: 'Data Centre Fire System', slug: 'data-centre-fire-system', description: 'Suppression & detection install', category: 'fire', completionStatus: 'in_progress', isFeatured: true, displayOrder: 3, status: 'published', publishedAt: new Date('2026-01-10') },
        { title: 'Factory PPM Contract', slug: 'factory-ppm-contract', description: 'Plant-wide preventive maintenance', category: 'hvac', completionStatus: 'in_progress', isFeatured: true, displayOrder: 4, status: 'published', publishedAt: new Date('2026-02-01') },
        { title: 'Office Facade Refit', slug: 'office-facade-refit', description: 'Civil & waterproofing works', category: 'civil', completionStatus: 'completed', isFeatured: true, displayOrder: 5, status: 'published', publishedAt: new Date('2025-07-20') },
        { title: 'University Generator Install', slug: 'university-generator-install', description: 'Standby power & ATS install', category: 'electrical', completionStatus: 'completed', isFeatured: true, displayOrder: 6, status: 'published', publishedAt: new Date('2025-10-05') },
      ];

      const projectResults = await Promise.all(
        projectsData.map((p) =>
          tx.cmsProject.upsert({
            where: { tenantId_slug: { tenantId: tid, slug: p.slug } },
            update: {
              title: p.title,
              description: p.description,
              category: p.category,
              completionStatus: p.completionStatus,
              isFeatured: p.isFeatured,
              displayOrder: p.displayOrder,
              status: p.status,
              publishedAt: p.publishedAt,
            },
            create: {
              tenantId: tid,
              title: p.title,
              slug: p.slug,
              description: p.description,
              category: p.category,
              completionStatus: p.completionStatus,
              isFeatured: p.isFeatured,
              displayOrder: p.displayOrder,
              status: p.status,
              publishedAt: p.publishedAt,
            },
          }),
        ),
      );

      // ── 6. CmsSetting (4 about settings) ───────────────────────────
      const settingsData = [
        {
          key: 'mission',
          value: '"To deliver reliable, safe and efficient maintenance that protects our clients\' assets and uptime."',
          category: 'about',
        },
        {
          key: 'vision',
          value: '"To be the region\'s most trusted facility maintenance and engineering partner."',
          category: 'about',
        },
        {
          key: 'values',
          value: '"Safety first. Integrity, craftsmanship, responsiveness and continuous improvement."',
          category: 'about',
        },
        {
          key: 'description',
          value: '"We are a multi-disciplinary engineering and maintenance company serving commercial, industrial, healthcare and government facilities. From routine preventive maintenance to emergency breakdowns, our certified technicians respond fast and document every job through our maintenance management system."',
          category: 'about',
        },
      ];

      const settingResults = await Promise.all(
        settingsData.map((s) =>
          tx.cmsSetting.upsert({
            where: { tenantId_key: { tenantId: tid, key: s.key } },
            update: { value: s.value, category: s.category },
            create: { tenantId: tid, key: s.key, value: s.value, category: s.category },
          }),
        ),
      );

      // ── 7. CmsFooter ────────────────────────────────────────────────
      await upsertByFind(
        tx.cmsFooter,
        { tenantId: tid },
        {
          companyDescription:
            'Facility maintenance and engineering services — keeping your assets safe, compliant and running.',
          address: 'Unit 5, Industrial Avenue, Bandar Seri Begawan, Brunei Darussalam',
          phone: '+673 000 0000',
          email: 'info@mohdhms.com',
          whatsapp: '+673 000 0000',
          facebook: '#',
          instagram: '#',
          linkedin: '#',
          twitter: '#',
          youtube: '#',
          copyrightText: '© 2026 MOHD.HMS ENTERPRISE. All rights reserved.',
        },
      );

      // ── 8. CmsCareerJob (4 jobs) ────────────────────────────────────
      const careersData = [
        { title: 'HVAC Technician', department: 'Engineering', description: 'Maintain and repair HVAC systems', location: 'Bandar Seri Begawan', type: 'fulltime', status: 'open' },
        { title: 'Electrical Supervisor', department: 'Engineering', description: 'Lead electrical maintenance team', location: 'Bandar Seri Begawan', type: 'fulltime', status: 'open' },
        { title: 'Maintenance Planner', department: 'Operations', description: 'Plan and schedule maintenance activities', location: 'Bandar Seri Begawan', type: 'fulltime', status: 'open' },
        { title: 'Customer Support Officer', department: 'Support', description: 'Handle client inquiries and complaints', location: 'Bandar Seri Begawan', type: 'fulltime', status: 'open' },
      ];

      const careerResults = await Promise.all(
        careersData.map((c) =>
          upsertByFind(
            tx.cmsCareerJob,
            { tenantId: tid, title: c.title },
            {
              department: c.department,
              description: c.description,
              location: c.location,
              type: c.type,
              status: c.status,
            },
          ),
        ),
      );

      // ── 9. CmsBlog (3 posts) ────────────────────────────────────────
      const blogsData = [
        {
          title: '5 Signs Your Chiller Needs Servicing',
          slug: 'chiller-servicing-signs',
          excerpt: 'Catch performance loss before it becomes a costly breakdown — the early indicators every facility team should track.',
          status: 'published',
          publishedAt: new Date('2026-03-15'),
          isFeatured: true,
        },
        {
          title: 'Lower Energy Use with Smarter PPM',
          slug: 'energy-saving-ppm',
          excerpt: 'Why planned maintenance directly cuts your bill.',
          status: 'published',
          publishedAt: new Date('2026-02-20'),
          isFeatured: false,
        },
        {
          title: 'We Expand Our Technical Team',
          slug: 'expand-technical-team',
          excerpt: 'New certified technicians strengthen field response.',
          status: 'published',
          publishedAt: new Date('2026-02-10'),
          isFeatured: false,
        },
      ];

      const blogResults = await Promise.all(
        blogsData.map((b) =>
          tx.cmsBlog.upsert({
            where: { tenantId_slug: { tenantId: tid, slug: b.slug } },
            update: {
              title: b.title,
              excerpt: b.excerpt,
              status: b.status,
              publishedAt: b.publishedAt,
              isFeatured: b.isFeatured,
            },
            create: {
              tenantId: tid,
              title: b.title,
              slug: b.slug,
              excerpt: b.excerpt,
              status: b.status,
              publishedAt: b.publishedAt,
              isFeatured: b.isFeatured,
            },
          }),
        ),
      );

      return {
        hero: 1,
        services: serviceResults.length,
        industries: industryResults.length,
        testimonials: testimonialResults.length,
        projects: projectResults.length,
        about: settingResults.length,
        footer: 1,
        careers: careerResults.length,
        blogs: blogResults.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Landing page content seeded successfully',
      counts: result,
    });
  } catch (error) {
    console.error('Seed landing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed landing page content', details: String(error) },
      { status: 500 },
    );
  }
}