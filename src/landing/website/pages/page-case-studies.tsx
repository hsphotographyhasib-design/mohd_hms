'use client';

import React from 'react';
import type { PageId } from '../public-website';
import {
  ThemeSection,
  ThemeLink,
  MonoLabel,
  DisplayHeading,
  Reveal,
  PlaceholderFig,
  PageWrapper,
} from '../theme';
import {
  ChevronRight,
  Building2,
  Users,
  CheckCircle2,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

/* ============================================================
   Case study data
   ============================================================ */
interface CaseStudy {
  title: string;
  category: string;
  duration: string;
  year: string;
  challenge: string;
  solution: string;
  results: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    title: 'Brunei International Airport — Terminal 2 HVAC Overhaul',
    category: 'HVAC',
    duration: '8 months',
    year: '2024',
    challenge:
      'Aging chiller plant with frequent breakdowns affecting passenger comfort and operational efficiency across Terminal 2.',
    solution:
      'Complete chiller plant replacement with BMS integration, including new variable-speed drives, optimised controls, and remote monitoring capabilities.',
    results:
      '40% energy reduction, 99.2% uptime, B$2.1M annual savings',
  },
  {
    title: 'The Radisson Hotel — Full Facility Maintenance Contract',
    category: 'Multi-service',
    duration: 'Ongoing (3+ years)',
    year: '2022',
    challenge:
      'Multiple contractors managing different systems resulted in inconsistent service quality, poor communication, and zero visibility into maintenance operations.',
    solution:
      'Single-point maintenance contract covering HVAC, electrical, plumbing, and fire protection with full CMMS integration and real-time reporting dashboards.',
    results:
      '95% guest satisfaction, 60% faster response times, 30% cost reduction',
  },
  {
    title: 'Ripas Hospital — Fire Protection System Upgrade',
    category: 'Fire Protection',
    duration: '6 months',
    year: '2023',
    challenge:
      'Non-compliant fire systems in a critical healthcare facility, posing risks to patient safety and regulatory compliance.',
    solution:
      'Full fire alarm, sprinkler and suppression system upgrade with continuous monitoring and integrated emergency response protocols.',
    results: '100% compliance, zero incidents, continuous monitoring',
  },
  {
    title: 'Government Office Complex — Electrical Infrastructure Modernisation',
    category: 'Electrical',
    duration: '10 months',
    year: '2024',
    challenge:
      'Outdated electrical systems causing frequent outages, safety concerns, and inability to support modern office equipment loads.',
    solution:
      'Complete electrical rewiring with smart monitoring, UPS installation, and automated load balancing across all building zones.',
    results: 'Zero unplanned outages, 25% energy savings, real-time monitoring',
  },
  {
    title: 'International School Brunei — Preventive Maintenance Programme',
    category: 'Preventive Maintenance',
    duration: 'Ongoing (2+ years)',
    year: '2023',
    challenge:
      'Reactive maintenance approach leading to high equipment failure rates, classroom disruptions, and unpredictable budget overruns.',
    solution:
      'Comprehensive PPM programme with CMMS scheduling, seasonal maintenance calendars, and dedicated on-site technician coverage during term time.',
    results:
      '85% reduction in breakdowns, extended equipment life, predictable costs',
  },
  {
    title: 'Times Square Shopping Centre — Plumbing & Mechanical Systems',
    category: 'Plumbing',
    duration: '4 months',
    year: '2025',
    challenge:
      'Recurrent plumbing failures affecting retail operations, causing water damage to tenant spaces, and damaging customer experience.',
    solution:
      'Complete plumbing system overhaul with preventive schedule, water pressure optimisation, and leak detection sensor network.',
    results:
      '92% reduction in plumbing issues, improved water efficiency',
  },
];

const STATS = [
  { icon: <BookOpen size={20} />, value: '6', label: 'Case studies' },
  { icon: <Building2 size={20} />, value: '14', label: 'Sectors served' },
  { icon: <Users size={20} />, value: 'B$12M+', label: 'Managed projects' },
  { icon: <CheckCircle2 size={20} />, value: '99%', label: 'Client retention' },
];

/* ============================================================
   PageCaseStudies Component
   ============================================================ */
interface PageProps {
  navigate: (id: PageId) => void;
}

export function PageCaseStudies({ navigate }: PageProps) {
  return (
    <PageWrapper>
      {/* ── 1. Hero Banner (forest) ── */}
      <div
        style={{
          background: 'var(--hm-forest)',
          padding: 'clamp(48px,6vw,80px) 0',
          color: 'var(--hm-paper)',
        }}
      >
        <div
          className="mx-auto px-7"
          style={{ maxWidth: 'var(--hm-container)' }}
        >
          <Reveal>
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <button
                onClick={() => navigate('home')}
                className="bg-transparent border-0 cursor-pointer p-0"
                style={{
                  fontFamily: 'var(--hm-mono)',
                  fontSize: '0.78rem',
                  color: 'rgba(247,248,243,0.6)',
                }}
              >
                Home
              </button>
              <span
                style={{
                  color: 'rgba(247,248,243,0.4)',
                  fontSize: '0.78rem',
                }}
              >
                /
              </span>
              <span
                style={{
                  fontFamily: 'var(--hm-mono)',
                  fontSize: '0.78rem',
                  color: 'rgba(247,248,243,0.9)',
                }}
              >
                Case Studies
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 700,
                fontSize: 'clamp(2rem,5vw,3.6rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.025em',
                maxWidth: '18ch',
              }}
            >
              Case Studies
            </h1>
            <p
              style={{
                marginTop: 16,
                fontSize: '1.08rem',
                color: 'rgba(247,248,243,0.7)',
                maxWidth: '55ch',
              }}
            >
              Real projects, real results. See how we&apos;ve helped
              organisations across Brunei transform their maintenance
              operations.
            </p>
          </Reveal>
        </div>
      </div>

      {/* ── 2. Stats Bar (forest) ── */}
      <div
        style={{
          background: 'var(--hm-forest)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="mx-auto px-7"
          style={{ maxWidth: 'var(--hm-container)' }}
        >
          <Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-10">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3.5"
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.10)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--hm-paper)',
                      flexShrink: 0,
                      opacity: 0.85,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--hm-disp)',
                        fontWeight: 700,
                        fontSize: '1.35rem',
                        color: 'var(--hm-paper)',
                        lineHeight: 1.1,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--hm-body)',
                        fontSize: '0.78rem',
                        color: 'rgba(247,248,243,0.55)',
                        marginTop: 2,
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── 3. Case Study Cards (alternating layout) ── */}
      <ThemeSection>
        {CASE_STUDIES.map((study, idx) => {
          const isReversed = idx % 2 === 1;
          return (
            <div key={study.title} className={idx > 0 ? 'mb-16' : 'mb-16'}>
              <div
                className={`grid lg:grid-cols-2 gap-12 items-start ${
                  isReversed ? 'lg:direction-rtl' : ''
                }`}
              >
                {/* Figure column */}
                <Reveal
                  delay={isReversed ? 0.1 : 0}
                  className={isReversed ? 'lg:order-2' : ''}
                >
                  <PlaceholderFig
                    aspect="4/3"
                    label={study.category}
                  />
                  <div
                    className="mt-4 flex items-center gap-4"
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.76rem',
                      color: 'var(--hm-faint)',
                    }}
                  >
                    <span>Duration: {study.duration}</span>
                  </div>
                </Reveal>

                {/* Text column */}
                <Reveal
                  delay={isReversed ? 0 : 0.1}
                  className={isReversed ? 'lg:order-1' : ''}
                >
                  <MonoLabel className="mb-3">
                    {study.category} · {study.year}
                  </MonoLabel>
                  <DisplayHeading className="text-xl mb-6">
                    {study.title}
                  </DisplayHeading>

                  {/* Challenge */}
                  <div className="mb-5">
                    <h4
                      style={{
                        fontFamily: 'var(--hm-body)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--hm-ink)',
                        marginBottom: 6,
                      }}
                    >
                      Challenge
                    </h4>
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--hm-muted)',
                        lineHeight: 1.7,
                      }}
                    >
                      {study.challenge}
                    </p>
                  </div>

                  {/* Solution */}
                  <div className="mb-6">
                    <h4
                      style={{
                        fontFamily: 'var(--hm-body)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--hm-ink)',
                        marginBottom: 6,
                      }}
                    >
                      Solution
                    </h4>
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--hm-muted)',
                        lineHeight: 1.7,
                      }}
                    >
                      {study.solution}
                    </p>
                  </div>

                  {/* Results */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {study.results.split(', ').map((r, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--hm-stone)',
                          borderRadius: 'var(--hm-r-sm)',
                          padding: '14px 12px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--hm-disp)',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            color: 'var(--hm-forest)',
                            lineHeight: 1.3,
                          }}
                        >
                          {r}
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>

              {/* Divider between studies (not after last) */}
              {idx < CASE_STUDIES.length - 1 && (
                <div
                  className="mt-16 h-px"
                  style={{ background: 'var(--hm-line)' }}
                />
              )}
            </div>
          );
        })}
      </ThemeSection>

      {/* ── 4. CTA — Want to be our next success story? (forest) ── */}
      <ThemeSection variant="forest">
        <Reveal>
          <div className="max-w-[580px] mx-auto text-center">
            <div
              className="mx-auto mb-5"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CheckCircle2 size={22} style={{ color: 'var(--hm-paper)' }} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                lineHeight: 1.04,
                letterSpacing: '-0.02em',
                fontSize: 'clamp(1.8rem, 3.8vw, 2.8rem)',
                color: 'var(--hm-paper)',
              }}
            >
              Want to be our next success story?
            </h2>
            <p
              className="mt-3"
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '1.05rem',
                color: 'rgba(247,248,243,0.64)',
                lineHeight: 1.6,
              }}
            >
              Let&apos;s discuss how we can transform your facility
              maintenance. Get in touch with our team today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
              <ThemeLink
                variant="green"
                onClick={() => navigate('contact')}
              >
                Start a Conversation <ChevronRight size={15} />
              </ThemeLink>
              <ThemeLink
                variant="outline"
                onClick={() => navigate('services')}
                style={{
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: 'var(--hm-paper)',
                }}
              >
                View Our Services <Building2 size={15} />
              </ThemeLink>
            </div>
          </div>
        </Reveal>
      </ThemeSection>
    </PageWrapper>
  );
}