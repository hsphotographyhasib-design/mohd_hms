'use client';

import React, { useState } from 'react';
import type { PageId } from '../public-website';
import {
  SectionHeader,
  ThemeSection,
  ThemeCard,
  ThemeButton,
  ThemeLink,
  MonoLabel,
  DisplayHeading,
  Reveal,
  PlaceholderFig,
  Divider,
  PageWrapper,
  bodyStyle,
} from '../theme';
import {
  ArrowRight,
  Building2,
  Zap,
  Shield,
  HardHat,
  Clock,
  Wrench,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  FileCheck,
  ChevronRight,
} from 'lucide-react';

interface PageProps {
  navigate: (id: PageId) => void;
}

/* ───────────────────────────────────────────────────────────
   Data
   ─────────────────────────────────────────────────────────── */

const FILTERS = ['All', 'HVAC', 'Electrical', 'Fire', 'Civil'] as const;
type FilterKey = (typeof FILTERS)[number];

interface Project {
  title: string;
  description: string;
  category: FilterKey | 'AMC' | 'Generator';
  duration: string;
  status: 'Completed' | 'Ongoing';
  figLabel: string;
  img: string;
}

const projects: Project[] = [
  {
    title: 'Hospital HVAC overhaul',
    description: 'Air-handling unit & ductwork upgrade',
    category: 'HVAC',
    duration: '9 months',
    status: 'Completed',
    figLabel: 'HVAC / Hospital',
    img: '/images/ahu.jpg',
  },
  {
    title: 'Mall electrical upgrade',
    description: 'LV distribution & panel testing',
    category: 'Electrical',
    duration: '5 months',
    status: 'Completed',
    figLabel: 'Electrical / Mall',
    img: '/images/multimeter.jpg',
  },
  {
    title: 'Data centre fire system',
    description: 'Suppression & detection install',
    category: 'Fire',
    duration: 'In progress',
    status: 'Ongoing',
    figLabel: 'Fire / Data Centre',
    img: '/images/project-fire.jpg',
  },
  {
    title: 'Factory PPM contract',
    description: 'Plant-wide preventive maintenance',
    category: 'AMC',
    duration: 'Ongoing',
    status: 'Ongoing',
    figLabel: 'AMC / Factory',
    img: '/images/project-factory.jpg',
  },
  {
    title: 'Office facade refit',
    description: 'Civil & waterproofing works',
    category: 'Civil',
    duration: '7 months',
    status: 'Completed',
    figLabel: 'Civil / Office',
    img: '/images/project-civil.jpg',
  },
  {
    title: 'University generator',
    description: 'Standby power & ATS install',
    category: 'Generator',
    duration: '4 months',
    status: 'Completed',
    figLabel: 'Generator / University',
    img: '/images/project-generator.jpg',
  },
];

const stats = [
  {
    value: '500+',
    label: 'Projects completed',
    icon: <FileCheck size={22} />,
  },
  {
    value: '38',
    label: 'Active contracts',
    icon: <CheckCircle2 size={22} />,
  },
  {
    value: '1,200+',
    label: 'Assets serviced',
    icon: <Wrench size={22} />,
  },
  {
    value: '99%',
    label: 'On-time delivery',
    icon: <TrendingUp size={22} />,
  },
];

/* ───────────────────────────────────────────────────────────
   PageProjects
   ─────────────────────────────────────────────────────────── */
export function PageProjects({ navigate }: PageProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

  const filtered =
    activeFilter === 'All'
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  return (
    <PageWrapper>
      {/* ── 1. Hero Banner ─────────────────────────────── */}
      <ThemeSection variant="forest" className="!py-16 md:!py-20">
        <Reveal>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(247,248,243,0.5)' }}>
              <li>
                <span
                  className="cursor-pointer transition-colors hover:text-white"
                  style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', letterSpacing: '0.04em' }}
                  onClick={() => navigate('home')}
                >
                  Home
                </span>
              </li>
              <li>
                <ChevronRight size={14} style={{ opacity: 0.5 }} />
              </li>
              <li>
                <span
                  style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', letterSpacing: '0.04em', color: 'var(--hm-paper)' }}
                >
                  Projects
                </span>
              </li>
            </ol>
          </nav>

          <h1
            style={{
              fontFamily: 'var(--hm-disp)',
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              color: 'var(--hm-paper)',
            }}
          >
            Our Projects
          </h1>
          <p
            className="mt-4 max-w-[46ch]"
            style={{
              fontFamily: 'var(--hm-body)',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'rgba(247,248,243,0.65)',
            }}
          >
            Work delivered across the region.
          </p>
        </Reveal>
      </ThemeSection>

      {/* ── 2. Filter Bar ─────────────────────────────── */}
      <ThemeSection variant="default" className="!pt-8 !pb-0">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2.5">
            {FILTERS.map((f) => {
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.76rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    fontWeight: 600,
                    padding: '0.52rem 1.2rem',
                    borderRadius: 'var(--hm-r-sm)',
                    border: isActive ? '1px solid transparent' : '1px solid var(--hm-line)',
                    background: isActive ? 'var(--hm-green)' : 'var(--hm-paper-2)',
                    color: isActive ? '#fff' : 'var(--hm-ink)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-green)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--hm-green)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-line)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--hm-ink)';
                    }
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </Reveal>
      </ThemeSection>

      {/* ── 3. Projects Grid ──────────────────────────── */}
      <ThemeSection variant="default" className="!pt-6">
        {filtered.length === 0 ? (
          <Reveal>
            <div
              className="text-center py-20"
              style={{ color: 'var(--hm-muted)', fontFamily: 'var(--hm-body)', fontSize: '1.05rem' }}
            >
              No projects found for this category.
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project, i) => (
              <Reveal key={project.title} delay={i * 0.07}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>
        )}
      </ThemeSection>

      {/* ── 4. Project Stats ──────────────────────────── */}
      <ThemeSection variant="stone">
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center text-center gap-3 p-6"
                style={{
                  background: 'var(--hm-paper-2)',
                  border: '1px solid var(--hm-line)',
                  borderRadius: 'var(--hm-r)',
                }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 11,
                    background: 'var(--hm-stone)',
                    color: 'var(--hm-green)',
                  }}
                >
                  {s.icon}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 700,
                    fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                    lineHeight: 1.1,
                    color: 'var(--hm-forest)',
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--hm-body)',
                    fontSize: '0.88rem',
                    color: 'var(--hm-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </ThemeSection>

      {/* ── 5. CTA ────────────────────────────────────── */}
      <ThemeSection variant="forest">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="max-w-lg">
              <h2
                style={{
                  fontFamily: 'var(--hm-disp)',
                  fontWeight: 600,
                  lineHeight: 1.04,
                  letterSpacing: '-0.02em',
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  color: 'var(--hm-paper)',
                }}
              >
                Have a project in mind?
              </h2>
              <p
                className="mt-3"
                style={{
                  fontFamily: 'var(--hm-body)',
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  color: 'rgba(247,248,243,0.6)',
                }}
              >
                Let our team assess your requirements and deliver a tailored solution on time and on budget.
              </p>
            </div>
            <ThemeButton variant="green" onClick={() => navigate('contact')}>
              Get in touch
              <ArrowRight size={18} />
            </ThemeButton>
          </div>
        </Reveal>
      </ThemeSection>
    </PageWrapper>
  );
}

/* ───────────────────────────────────────────────────────────
   Project Card
   ─────────────────────────────────────────────────────────── */

function ProjectCard({ project }: { project: Project }) {
  const isCompleted = project.status === 'Completed';

  return (
    <article
      style={{
        background: 'var(--hm-paper-2)',
        border: '1px solid var(--hm-line)',
        borderRadius: 'var(--hm-r)',
        overflow: 'hidden',
        transition: 'transform 0.28s var(--hm-ease), border-color 0.28s var(--hm-ease)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-forest)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-line)';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}
    >
      {/* Image area with tags */}
      <div className="relative">
        <PlaceholderFig aspect="4/3" label={project.figLabel} src={project.img} />

        {/* Category tag — top-left */}
        <span
          className="absolute top-3 left-3 px-2.5 py-1"
          style={{
            fontFamily: 'var(--hm-mono)',
            fontSize: '0.66rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            fontWeight: 600,
            color: '#fff',
            background: 'rgba(18,59,43,0.82)',
            borderRadius: 6,
            lineHeight: 1.4,
          }}
        >
          {project.category}
        </span>

        {/* Status tag — top-right */}
        <span
          className="absolute top-3 right-3 px-2.5 py-1"
          style={{
            fontFamily: 'var(--hm-mono)',
            fontSize: '0.66rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            fontWeight: 600,
            color: isCompleted ? '#fff' : '#78350f',
            background: isCompleted ? 'var(--hm-green)' : '#fbbf24',
            borderRadius: 6,
            lineHeight: 1.4,
          }}
        >
          {project.status}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 pt-4">
        <h3
          style={{
            fontFamily: 'var(--hm-disp)',
            fontWeight: 600,
            fontSize: '1.12rem',
            lineHeight: 1.28,
            letterSpacing: '-0.01em',
            color: 'var(--hm-forest)',
          }}
        >
          {project.title}
        </h3>

        <p
          className="mt-2"
          style={{
            fontFamily: 'var(--hm-body)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
            color: 'var(--hm-muted)',
          }}
        >
          {project.description}
        </p>

        {/* Meta row */}
        <div
          className="mt-4 pt-3 flex items-center gap-4"
          style={{ borderTop: '1px solid var(--hm-line)' }}
        >
          <span
            style={{
              fontFamily: 'var(--hm-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              color: 'var(--hm-green)',
            }}
          >
            {project.category}
          </span>
          <span
            style={{
              fontFamily: 'var(--hm-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              color: 'var(--hm-muted)',
            }}
          >
            <Clock
              size={11}
              style={{ display: 'inline-block', verticalAlign: -1, marginRight: 4 }}
            />
            {project.duration}
          </span>
        </div>
      </div>
    </article>
  );
}