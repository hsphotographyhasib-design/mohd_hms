'use client';

import React from 'react';
import type { PageId } from '../public-website';
import {
  SectionHeader,
  ThemeSection,
  ThemeCard,
  ThemeButton,
  ThemeLink,
  IconBox,
  MonoLabel,
  DisplayHeading,
  Reveal,
  PlaceholderFig,
  Divider,
  bodyStyle,
  PageWrapper,
} from '../theme';
import {
  Building2,
  Factory,
  Cog,
  GraduationCap,
  BookOpen,
  Hospital,
  BedDouble,
  Store,
  Building,
  Warehouse,
  Landmark,
  Home,
  Server,
  Zap,
  ArrowRight,
  Phone,
  ChevronRight,
} from 'lucide-react';

interface PageProps {
  navigate: (id: PageId) => void;
}

/* ───────────────────────────────────────────────────────────
   Industry data
   ─────────────────────────────────────────────────────────── */
const industries = [
  { name: 'Commercial Buildings', icon: Building2 },
  { name: 'Factories', icon: Factory },
  { name: 'Industrial Plants', icon: Cog },
  { name: 'Universities', icon: GraduationCap },
  { name: 'Schools', icon: BookOpen },
  { name: 'Hospitals', icon: Hospital },
  { name: 'Hotels', icon: BedDouble },
  { name: 'Shopping Malls', icon: Store },
  { name: 'Office Buildings', icon: Building },
  { name: 'Warehouses', icon: Warehouse },
  { name: 'Government', icon: Landmark },
  { name: 'Residential', icon: Home },
  { name: 'Data Centres', icon: Server },
  { name: 'Power Stations', icon: Zap },
];

/* ───────────────────────────────────────────────────────────
   Case study highlights
   ─────────────────────────────────────────────────────────── */
const highlights = [
  {
    industry: 'Healthcare',
    fig: 'hospital-ward',
    aspect: '4/3' as const,
    img: '/images/industry-hospital.jpg',
    description:
      'Comprehensive HVAC maintenance, medical gas systems, and clean-room environmental controls ensuring regulatory compliance and patient safety.',
  },
  {
    industry: 'Education',
    fig: 'university-campus',
    aspect: '4/3' as const,
    img: '/images/industry-university.jpg',
    description:
      'Full mechanical and electrical services for lecture halls, laboratories, and campus-wide building management systems with 24/7 emergency support.',
  },
  {
    industry: 'Industrial',
    fig: 'factory-floor',
    aspect: '4/3' as const,
    img: '/images/industry-factory.jpg',
    description:
      'Process-critical cooling, compressed air, and power distribution systems with planned preventive maintenance to minimise production downtime.',
  },
  {
    industry: 'Commercial',
    fig: 'office-interior',
    aspect: '4/3' as const,
    img: '/images/industry-office.jpg',
    description:
      'Tenant-fit MEP services, chiller plant optimisation, and energy-performance contracting for high-occupancy office towers and retail spaces.',
  },
];

/* ───────────────────────────────────────────────────────────
   Stats
   ─────────────────────────────────────────────────────────── */
const stats = [
  { value: '14', label: 'Sectors' },
  { value: '186+', label: 'Facilities' },
  { value: '1,200+', label: 'Assets' },
];

/* ───────────────────────────────────────────────────────────
   Page — Industries We Serve
   ─────────────────────────────────────────────────────────── */
export function PageIndustries({ navigate }: PageProps) {
  return (
    <PageWrapper>
      {/* ─── 1. Hero Banner (forest) ─── */}
      <section
        style={{
          background: 'var(--hm-forest)',
          color: 'var(--hm-paper)',
          padding: 'clamp(80px, 12vw, 160px) 0 clamp(56px, 8vw, 96px)',
        }}
      >
        <div
          className="mx-auto px-7"
          style={{ maxWidth: 'var(--hm-container)' }}
        >
          {/* Breadcrumb */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(247,248,243,0.55)' }}>
              <li>
                <button
                  onClick={() => navigate('home')}
                  className="hover:underline cursor-pointer"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'rgba(247,248,243,0.55)',
                  }}
                >
                  Home
                </button>
              </li>
              <li>
                <ChevronRight
                  size={12}
                  style={{ color: 'rgba(247,248,243,0.3)', strokeWidth: 2 }}
                />
              </li>
              <li
                style={{
                  fontFamily: 'var(--hm-mono)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--hm-paper)',
                }}
              >
                Industries
              </li>
            </ol>
          </nav>

          <Reveal>
            <h1
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: '-0.025em',
                fontSize: 'clamp(2.4rem, 5.6vw, 4.2rem)',
                color: 'var(--hm-paper)',
                maxWidth: '14ch',
              }}
            >
              Industries We Serve
            </h1>
            <p
              className="mt-5"
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '1.12rem',
                lineHeight: 1.6,
                color: 'rgba(247,248,243,0.68)',
                maxWidth: '48ch',
              }}
            >
              Trusted across demanding environments.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── 2. Industries Grid (default bg) ─── */}
      <ThemeSection variant="default">
        <Reveal>
          <SectionHeader
            label="Sectors"
            title="Trusted across demanding environments."
            lede="From hospitals to power stations, we deliver reliable mechanical and electrical solutions tailored to the unique demands of each sector."
          />
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {industries.map((ind, i) => (
            <Reveal key={ind.name} delay={i * 0.04}>
              <ThemeCard className="flex flex-col items-center text-center gap-3.5">
                <IconBox size="lg">
                  <ind.icon
                    size={20}
                    style={{ color: 'var(--hm-green)', strokeWidth: 1.6 }}
                  />
                </IconBox>
                <span
                  className="text-sm font-medium leading-snug"
                  style={{
                    fontFamily: 'var(--hm-body)',
                    color: 'var(--hm-ink)',
                  }}
                >
                  {ind.name}
                </span>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* ─── 3. Case Study / Highlight (stone bg) ─── */}
      <ThemeSection variant="stone">
        <Reveal>
          <SectionHeader
            label="Expertise"
            title="Our industry expertise"
            lede="Deep domain knowledge backed by decades of hands-on experience across critical sectors."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {highlights.map((h, i) => (
            <Reveal key={h.industry} delay={i * 0.06}>
              <ThemeCard className="flex flex-col gap-0 overflow-hidden" hover={false}>
                <PlaceholderFig aspect={h.aspect} label={h.fig} src={h.img} />
                <div className="pt-5 px-1 pb-1">
                  <DisplayHeading as="h3" className="mb-2" size="1.2rem">
                    {h.industry}
                  </DisplayHeading>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      fontFamily: 'var(--hm-body)',
                      color: 'var(--hm-muted)',
                    }}
                  >
                    {h.description}
                  </p>
                </div>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* ─── 4. Sector Stats (forest bg, light text) ─── */}
      <ThemeSection variant="forest">
        <Reveal>
          <div className="flex items-center gap-4 mb-14">
            <MonoLabel className="!text-[var(--hm-green-bright)]">
              By the numbers
            </MonoLabel>
            <div
              className="flex-1 h-px"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            />
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="text-center">
                <div
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 700,
                    lineHeight: 1,
                    fontSize: 'clamp(2.8rem, 6vw, 4.4rem)',
                    color: 'var(--hm-paper)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="mt-3"
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(247,248,243,0.5)',
                  }}
                >
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* ─── 5. CTA (default bg) ─── */}
      <ThemeSection variant="default">
        <Reveal>
          <div className="text-center max-w-[560px] mx-auto">
            <DisplayHeading as="h2" className="mb-4 text-center" size="clamp(1.6rem, 3.2vw, 2.4rem)">
              Don&apos;t see your industry?
            </DisplayHeading>
            <p
              className="mb-8 text-sm leading-relaxed"
              style={{
                fontFamily: 'var(--hm-body)',
                color: 'var(--hm-muted)',
              }}
            >
              We adapt our services to meet the needs of any sector. Get in touch
              and we&apos;ll tailor a solution for your environment.
            </p>
            <ThemeButton variant="fill" onClick={() => navigate('home')}>
              <Phone size={16} />
              Contact Us
            </ThemeButton>
          </div>
        </Reveal>
      </ThemeSection>
    </PageWrapper>
  );
}