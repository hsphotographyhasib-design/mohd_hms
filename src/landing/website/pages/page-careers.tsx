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
  Reveal,
  PlaceholderFig,
  PageWrapper,
} from '../theme';
import {
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
  Heart,
  ChevronRight,
  ArrowRight,
  MapPin,
  Clock,
  HardHat,
  Shield,
  Award,
  Send,
} from 'lucide-react';

interface PageProps {
  navigate: (id: PageId) => void;
}

/* ───────────────────────────────────────────────────────────
   Data
   ─────────────────────────────────────────────────────────── */

const positions = [
  { title: 'HVAC Technician', type: 'Full-time', location: 'Field' },
  { title: 'Electrical Supervisor', type: 'Full-time', location: 'Field' },
  { title: 'Maintenance Planner', type: 'Full-time', location: 'Office' },
  { title: 'Customer Support Officer', type: 'Full-time', location: 'Office' },
  { title: 'HSE Officer', type: 'Full-time', location: 'Field' },
];

const benefits = [
  {
    icon: <GraduationCap size={20} />,
    title: 'Training & Certification',
    desc: 'Ongoing professional development and industry-certified training programs to keep your skills sharp.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Safe Work Culture',
    desc: 'HSE-first environment with proper PPE, protocols, and a zero-incident goal on every project.',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Career Growth',
    desc: 'Clear advancement paths from technician to supervisor, planner, and management roles.',
  },
  {
    icon: <Users size={20} />,
    title: 'Team Support',
    desc: 'Collaborative teams and mentorship from experienced professionals across all disciplines.',
  },
  {
    icon: <Heart size={20} />,
    title: 'Competitive Benefits',
    desc: 'Comprehensive package including health coverage, allowances, and performance-based incentives.',
  },
  {
    icon: <Clock size={20} />,
    title: 'Work-Life Balance',
    desc: 'Structured schedules with fair overtime policies and respect for personal time.',
  },
];

const values = [
  {
    icon: <Shield size={22} />,
    title: 'Safety First',
    desc: 'HSE-first environment with proper PPE and protocols.',
  },
  {
    icon: <Award size={22} />,
    title: 'Integrity',
    desc: 'Honest communication and transparent operations.',
  },
  {
    icon: <HardHat size={22} />,
    title: 'Craftsmanship',
    desc: 'Pride in quality work and attention to detail.',
  },
];

/* ───────────────────────────────────────────────────────────
   Page Component
   ─────────────────────────────────────────────────────────── */

export function PageCareers({ navigate }: PageProps) {
  return (
    <PageWrapper>
      {/* ─── 1. Hero Banner ─── */}
      <ThemeSection variant="forest" className="!py-16 md:!py-24">
        <Reveal>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <span
              className="cursor-pointer hover:underline"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(247,248,243,0.5)',
              }}
              onClick={() => navigate('home')}
            >
              Home
            </span>
            <ChevronRight
              size={12}
              style={{ color: 'rgba(247,248,243,0.35)' }}
            />
            <span
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--hm-green-bright)',
              }}
            >
              Careers
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: 'var(--hm-disp)',
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              fontSize: 'clamp(2rem, 4.4vw, 3.3rem)',
              color: 'var(--hm-paper)',
              maxWidth: '18ch',
            }}
          >
            Build Your Career With Us
          </h1>

          {/* Subtext */}
          <p
            className="mt-4"
            style={{
              fontSize: '1.08rem',
              color: 'rgba(247,248,243,0.72)',
              maxWidth: '50ch',
              lineHeight: 1.62,
            }}
          >
            We invest in our people with training, certification and a strong
            safety culture.
          </p>
        </Reveal>
      </ThemeSection>

      {/* ─── 2. Open Positions ─── */}
      <ThemeSection variant="default">
        <Reveal>
          <SectionHeader
            label="Careers"
            title="Open positions"
            lede="Find a role that matches your skills and passion for building services."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--hm-paper-2)',
              border: '1px solid var(--hm-line)',
              borderRadius: 'var(--hm-r)',
            }}
          >
            {positions.map((pos, i) => (
              <React.Fragment key={pos.title}>
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 md:px-7 py-5 transition-colors"
                  style={{
                    borderBottom:
                      i < positions.length - 1
                        ? '1px solid var(--hm-line)'
                        : 'none',
                  }}
                >
                  {/* Left: title + meta */}
                  <div className="min-w-0">
                    <h3
                      className="font-semibold text-[0.98rem]"
                      style={{
                        fontFamily: 'var(--hm-body)',
                        color: 'var(--hm-ink)',
                      }}
                    >
                      {pos.title}
                    </h3>
                    <div
                      className="flex items-center gap-3 mt-1"
                      style={{ color: 'var(--hm-muted)', fontSize: '0.82rem' }}
                    >
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {pos.type}
                      </span>
                      <span
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: '50%',
                          background: 'var(--hm-muted)',
                          opacity: 0.5,
                          display: 'inline-block',
                        }}
                      />
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        {pos.location}
                      </span>
                    </div>
                  </div>

                  {/* Right: Apply button */}
                  <div className="shrink-0 self-start sm:self-center">
                    <ThemeButton variant="outline" className="text-sm !py-2 !px-4">
                      Apply now
                      <ArrowRight size={14} />
                    </ThemeButton>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </Reveal>
      </ThemeSection>

      {/* ─── 3. Why Join Us ─── */}
      <ThemeSection variant="stone">
        <Reveal>
          <SectionHeader
            label="Culture"
            title="Benefits & culture"
            lede="We believe great work starts with a supportive, safe and growth-oriented workplace."
          />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left: Placeholder image */}
          <Reveal delay={0.1}>
            <PlaceholderFig
              aspect="4/2.7"
              label="Workshop & Tools"
              className="w-full"
              src="/images/tools.jpg"
            />
          </Reveal>

          {/* Right: Benefits list */}
          <div className="flex flex-col gap-6">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={0.1 + i * 0.06}>
                <div className="flex gap-4">
                  <IconBox size="md">{b.icon}</IconBox>
                  <div>
                    <h4
                      className="font-semibold text-[0.95rem] mb-1"
                      style={{
                        fontFamily: 'var(--hm-body)',
                        color: 'var(--hm-ink)',
                      }}
                    >
                      {b.title}
                    </h4>
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--hm-muted)',
                        lineHeight: 1.6,
                        maxWidth: '48ch',
                      }}
                    >
                      {b.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </ThemeSection>

      {/* ─── 4. Our Values ─── */}
      <ThemeSection variant="default">
        <Reveal>
          <SectionHeader
            label="Principles"
            title="Our values"
            lede="The foundations that guide every project, decision and interaction."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={0.1 + i * 0.08}>
              <ThemeCard hover={true}>
                <div className="flex flex-col gap-4">
                  <IconBox size="lg">{v.icon}</IconBox>
                  <h3
                    className="font-semibold text-[1.02rem]"
                    style={{
                      fontFamily: 'var(--hm-body)',
                      color: 'var(--hm-forest)',
                    }}
                  >
                    {v.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    {v.desc}
                  </p>
                </div>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* ─── 5. CTA ─── */}
      <ThemeSection variant="forest">
        <Reveal>
          <div className="max-w-lg">
            <span
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(247,248,243,0.5)',
              }}
            >
              Join Us
            </span>
            <h2
              className="mt-4 mb-3"
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)',
                color: 'var(--hm-paper)',
              }}
            >
              Don&apos;t see your role?
            </h2>
            <p
              className="mb-8"
              style={{
                fontSize: '1.02rem',
                color: 'rgba(247,248,243,0.65)',
                lineHeight: 1.62,
                maxWidth: '42ch',
              }}
            >
              We&apos;re always looking for talented people. Send us your CV and
              we&apos;ll keep you in mind for future openings.
            </p>

            <div className="flex flex-wrap gap-3">
              <ThemeLink variant="fill" onClick={() => navigate('contact')}>
                Send your CV
                <Send size={16} />
              </ThemeLink>
              <ThemeLink
                variant="outline"
                className="!border-[rgba(255,255,255,0.2)] !text-[var(--hm-paper)]"
                onClick={() => navigate('contact')}
              >
                Contact us
                <ArrowRight size={16} />
              </ThemeLink>
            </div>
          </div>
        </Reveal>
      </ThemeSection>
    </PageWrapper>
  );
}