'use client';

import React, { useState } from 'react';
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
  Wind,
  Zap,
  Droplets,
  Shield,
  Wrench,
  Building2,
  Factory,
  HardHat,
  GraduationCap,
  School,
  Hospital,
  Hotel,
  ShoppingBag,
  Briefcase,
  Warehouse,
  Landmark,
  Home,
  Server,
  Gauge,
  ArrowRight,
  ArrowUpRight,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  Award,
  BarChart3,
  Users,
  FileCheck,
  ClipboardCheck,
  Search,
  UserCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  Package,
  MapPin,
  Mail,
  Send,
  ArrowUp,
  Quote,
  Calendar,
  Heart,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface PageProps {
  navigate: (id: PageId) => void;
}

/* ───────────────────────────────────────────────────────────
   Floating Action Buttons
   ─────────────────────────────────────────────────────────── */
function FloatingActions() {
  const [showTop, setShowTop] = useState(false);
  React.useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fab = (icon: React.ReactNode, label: string, bg: string, onClick: () => void, href?: string) => (
    <button
      aria-label={label}
      onClick={onClick}
      className="grid place-items-center shadow-lg transition-transform duration-300 hover:scale-110"
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {icon}
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-center">
      {showTop &&
        fab(<ArrowUp size={20} />, 'Back to top', 'var(--hm-forest)', () =>
          window.scrollTo({ top: 0, behavior: 'smooth' })
        )}
      {fab(<Phone size={18} />, 'Emergency call', '#dc2626', () => {})}
      {fab(<MessageCircle size={18} />, 'WhatsApp', 'var(--hm-green)', () => {})}
      {fab(<Phone size={18} />, 'Call us', 'var(--hm-forest)', () => {})}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   PageHome
   ─────────────────────────────────────────────────────────── */
export function PageHome({ navigate }: PageProps) {
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [projectFilter, setProjectFilter] = useState('all');

  const testimonials = [
    {
      quote:
        'Their preventive maintenance programme has reduced our HVAC breakdowns by 78% in the first year. The team is responsive, professional, and genuinely invested in our operational uptime.',
      name: 'Ahmad Ridzuan',
      title: 'Facilities Director, KLCC Properties',
    },
    {
      quote:
        'Switching to MoHD HMS for our fire safety compliance was the best decision. Their certified technicians handle everything — from monthly inspections to annual certifications — without disrupting operations.',
      name: 'Siti Nurhaliza binti Osman',
      title: 'Operations Manager, Sunway Healthcare',
    },
    {
      quote:
        'The QR-based asset management system they implemented has transformed how we track equipment maintenance. Scan, report, resolve — it is that simple.',
      name: 'James Tan',
      title: 'Chief Engineer, Meritus Hotels Group',
    },
  ];

  const projectFilters = ['all', 'commercial', 'industrial', 'healthcare', 'government'];

  const projects = [
    {
      title: 'KLCC Tower A — HVAC Overhaul',
      category: 'commercial',
      tag: 'HVAC',
      img: '/images/ahu.jpg',
      desc: 'Complete chiller plant replacement and BMS integration for 50-storey commercial tower.',
    },
    {
      title: 'Petronas Refinery — Fire Systems',
      category: 'industrial',
      tag: 'Fire & Safety',
      img: '/images/project-fire.jpg',
      desc: 'Design, supply, and commission of fire suppression systems across 12 production zones.',
    },
    {
      title: 'Sunway Medical Centre — Electrical',
      category: 'healthcare',
      tag: 'Electrical',
      img: '/images/multimeter.jpg',
      desc: 'Critical power distribution upgrade with redundant UPS and generator systems.',
    },
    {
      title: 'Putrajaya Government Complex',
      category: 'government',
      tag: 'Multi-discipline',
      img: '/images/project-multidiscipline.jpg',
      desc: 'Comprehensive facilities management for 8 government buildings including landscaping and MEP.',
    },
    {
      title: 'Genting Highlands Resort — Plumbing',
      category: 'commercial',
      tag: 'Plumbing',
      img: '/images/project-plumbing.jpg',
      desc: 'Hot water recirculation system retrofit across 3 hotel towers with 2,400 rooms.',
    },
    {
      title: 'Samsung Semiconductor — Clean Room',
      category: 'industrial',
      tag: 'HVAC',
      img: '/images/ahu.jpg',
      desc: 'ISO Class 5 cleanroom HVAC system with HEPA filtration and precision humidity control.',
    },
  ];

  const filteredProjects =
    projectFilter === 'all'
      ? projects
      : projects.filter((p) => p.category === projectFilter);

  return (
    <PageWrapper>
      <div style={bodyStyle}>
        {/* ─── 1. HERO ─── */}
        <ThemeSection variant="default" className="!pt-0 !pb-0">
          <div
            className="grid items-center gap-12 lg:gap-16"
            style={{ gridTemplateColumns: '1fr', padding: 'clamp(48px,8vw,88px) 0' }}
          >
            <div
              className="grid items-center gap-12 lg:gap-16"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)',
              }}
            >
              {/* Left: copy */}
              <div>
                <span
                  className="inline-block mb-6 px-3 py-1.5"
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--hm-green)',
                    background: 'var(--hm-stone)',
                    borderRadius: 'var(--hm-r-sm)',
                  }}
                >
                  Facility maintenance &amp; engineering
                </span>
                <h1
                  className="mb-6"
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 600,
                    fontSize: 'clamp(2.2rem, 5.2vw, 3.8rem)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.025em',
                    color: 'var(--hm-ink)',
                  }}
                >
                  Engineered upkeep for{' '}
                  <span
                    style={{
                      color: 'var(--hm-green)',
                      fontStyle: 'italic',
                    }}
                  >
                    serious facilities.
                  </span>
                </h1>
                <p
                  className="mb-8 max-w-[52ch]"
                  style={{ fontSize: '1.1rem', lineHeight: 1.65, color: 'var(--hm-muted)' }}
                >
                  From HVAC systems to fire-safety compliance, we keep mission-critical
                  buildings running at peak performance — 24 hours a day, 365 days a year.
                </p>
                <div className="flex flex-wrap gap-3 mb-12">
                  <ThemeLink variant="fill" onClick={() => navigate('contact')}>
                    Get a free assessment
                    <ArrowRight size={16} />
                  </ThemeLink>
                  <ThemeLink variant="outline" onClick={() => navigate('services')}>
                    Explore services
                    <ArrowUpRight size={16} />
                  </ThemeLink>
                </div>
                {/* Stats row */}
                <div
                  className="flex flex-wrap gap-8 pt-8"
                  style={{ borderTop: '1px solid var(--hm-line)' }}
                >
                  {[
                    { val: '15+', label: 'Years experience' },
                    { val: '24/7', label: 'Emergency cover' },
                    { val: '1,200+', label: 'Assets maintained' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div
                        style={{
                          fontFamily: 'var(--hm-disp)',
                          fontWeight: 600,
                          fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
                          color: 'var(--hm-forest)',
                          lineHeight: 1.1,
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--hm-mono)',
                          fontSize: '0.7rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--hm-faint)',
                          marginTop: 4,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: hero image + overlays */}
              <div className="relative">
                <PlaceholderFig aspect="4/4.6" label="Hero — Facility" className="w-full" src="/images/hero.jpg" />
                {/* Mini overlay image */}
                <div
                  className="absolute -bottom-4 -left-4 shadow-lg"
                  style={{ width: '42%', borderRadius: 'var(--hm-r)', overflow: 'hidden', border: '3px solid var(--hm-paper-2)' }}
                >
                  <PlaceholderFig aspect="4/3" label="Team at work" src="/images/ahu.jpg" />
                </div>
                {/* Floating SLA chip */}
                <div
                  className="absolute -top-3 -right-3 shadow-md flex items-center gap-2 px-3.5 py-2"
                  style={{
                    background: 'var(--hm-paper-2)',
                    border: '1px solid var(--hm-line)',
                    borderRadius: 'var(--hm-r)',
                  }}
                >
                  <div
                    className="grid place-items-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--hm-green)',
                      color: '#fff',
                    }}
                  >
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--hm-disp)',
                        fontWeight: 600,
                        fontSize: '1.05rem',
                        color: 'var(--hm-forest)',
                        lineHeight: 1.1,
                      }}
                    >
                      98%
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.6rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--hm-faint)',
                      }}
                    >
                      SLA met
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ThemeSection>

        {/* ─── 2. SECTOR STRIP ─── */}
        <section
          className="relative"
          style={{
            borderTop: '1px solid var(--hm-line)',
            borderBottom: '1px solid var(--hm-line)',
            padding: 'clamp(32px, 4vw, 52px) 0',
            background: 'var(--hm-paper)',
          }}
        >
          <div className="mx-auto px-7 text-center" style={{ maxWidth: 'var(--hm-container)' }}>
            <p
              className="mb-6"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--hm-faint)',
              }}
            >
              Maintaining mission-critical facilities across
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              {[
                { name: 'Commercial buildings', Icon: Building2 },
                { name: 'Factories', Icon: Factory },
                { name: 'Industrial plants', Icon: HardHat },
                { name: 'Universities', Icon: GraduationCap },
                { name: 'Schools', Icon: School },
                { name: 'Hospitals', Icon: Hospital },
                { name: 'Hotels', Icon: Hotel },
                { name: 'Shopping malls', Icon: ShoppingBag },
                { name: 'Office buildings', Icon: Briefcase },
                { name: 'Warehouses', Icon: Warehouse },
                { name: 'Government', Icon: Landmark },
                { name: 'Residential', Icon: Home },
                { name: 'Data centres', Icon: Server },
                { name: 'Power stations', Icon: Gauge },
              ].map(({ name, Icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5"
                  style={{ color: 'var(--hm-ink)', fontSize: '0.88rem' }}
                >
                  <Icon size={15} style={{ color: 'var(--hm-green)', flexShrink: 0 }} />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 3. ABOUT ─── */}
        <ThemeSection variant="default">
          <Reveal>
            <SectionHeader
              label="01 — About"
              title="A maintenance partner built on accountability."
              lede="We don't just fix problems — we engineer systems that prevent them."
            />
            <div
              className="grid gap-10 lg:gap-14 items-start"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)',
              }}
            >
              {/* Left: image + floating stat */}
              <div className="relative">
                <PlaceholderFig aspect="4/3" label="About — Our team" className="w-full" src="/images/about.jpg" />
                <div
                  className="absolute -bottom-5 -right-5 shadow-lg px-5 py-4"
                  style={{
                    background: 'var(--hm-paper-2)',
                    border: '1px solid var(--hm-line)',
                    borderRadius: 'var(--hm-r)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.6rem',
                      color: 'var(--hm-green)',
                      lineHeight: 1.1,
                    }}
                  >
                    500+
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.66rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--hm-faint)',
                      marginTop: 2,
                    }}
                  >
                    Projects delivered
                  </div>
                </div>
              </div>
              {/* Right: copy */}
              <div>
                <p
                  className="mb-5"
                  style={{
                    fontSize: '1.18rem',
                    fontWeight: 500,
                    color: 'var(--hm-ink)',
                    lineHeight: 1.5,
                  }}
                >
                  For over 15 years, MoHD HMS has been the facilities maintenance partner
                  that organisations trust when downtime is not an option.
                </p>
                <p className="mb-8" style={{ color: 'var(--hm-muted)' }}>
                  Founded on the principle that every building deserves engineering-grade
                  care, our team of certified technicians delivers proactive maintenance,
                  emergency response, and compliance assurance across Malaysia's most
                  demanding facilities. We combine deep domain expertise with modern
                  CMMS technology to deliver measurable outcomes — not just work orders.
                </p>
                {/* MVV list */}
                <div className="flex flex-col gap-5">
                  {[
                    {
                      mono: 'Mission',
                      text: 'To provide engineered maintenance solutions that maximise asset lifespan and minimise operational downtime for every client we serve.',
                    },
                    {
                      mono: 'Vision',
                      text: "To be Malaysia\u2019s most trusted facilities engineering firm \u2014 where accountability, precision, and innovation define every service call.",
                    },
                    {
                      mono: 'Values',
                      text: 'Accountability, safety-first mindset, continuous improvement, and transparent communication at every level of our operations.',
                    },
                  ].map((item) => (
                    <div key={item.mono}>
                      <MonoLabel className="mb-1 block">{item.mono}</MonoLabel>
                      <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 4. WHY CHOOSE US ─── */}
        <ThemeSection variant="stone">
          <Reveal>
            <div
              className="grid gap-6"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              }}
            >
              {[
                {
                  Icon: Award,
                  title: 'Certified teams',
                  desc: 'Every technician is licensed, insured, and continuously trained on the latest safety and compliance standards.',
                },
                {
                  Icon: Clock,
                  title: '24/7 response',
                  desc: 'Round-the-clock emergency service with guaranteed 2-hour response time across the Klang Valley and beyond.',
                },
                {
                  Icon: BarChart3,
                  title: 'Transparent reporting',
                  desc: 'Real-time dashboards, monthly performance reports, and predictive analytics — you always know exactly where you stand.',
                },
                {
                  Icon: TrendingUp,
                  title: '15+ years experience',
                  desc: 'Over 500 completed projects spanning commercial, industrial, healthcare, and government facilities across Malaysia.',
                },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="flex flex-col gap-3.5">
                  <IconBox size="lg">
                    <Icon size={21} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <h3
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.08rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ color: 'var(--hm-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 5. SERVICES ─── */}
        <ThemeSection variant="default">
          <Reveal>
            <SectionHeader
              label="02 — Services"
              title="Full-spectrum building services."
              lede="From chillers to circuit breakers, every system covered under one contract."
            />
            <div
              className="grid gap-8"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              }}
            >
              {/* HVAC Column */}
              <ThemeCard hover={false} large>
                <div className="flex items-center gap-2.5 mb-5">
                  <IconBox size="md">
                    <Wind size={20} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <h3
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.12rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    HVAC Services
                  </h3>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { Ic: Wind, n: 'Chiller & AHU Maintenance', d: 'Planned preventive maintenance and breakdown repair for all chiller and air handling unit systems.' },
                    { Ic: Droplets, n: 'Duct Cleaning & IAQ', d: 'Professional ductwork cleaning and indoor air quality assessments to meet ASHRAE standards.' },
                    { Ic: Gauge, n: 'BMS Integration', d: 'Building Management System integration for automated HVAC control and energy optimisation.' },
                    { Ic: Droplets, n: 'Refrigerant Management', d: 'Refrigerant tracking, leak detection, and top-up services in compliance with environmental regulations.' },
                  ].map(({ Ic, n, d }, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <IconBox size="sm">
                          <Ic size={14} style={{ color: 'var(--hm-green)' }} />
                        </IconBox>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.88rem',
                              color: 'var(--hm-ink)',
                              marginBottom: 2,
                            }}
                          >
                            {n}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>
                            {d}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ThemeCard>

              {/* Electrical Column */}
              <ThemeCard hover={false} large>
                <div className="flex items-center gap-2.5 mb-5">
                  <IconBox size="md">
                    <Zap size={20} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <h3
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.12rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    Electrical Services
                  </h3>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { I: Zap, n: 'HV/LV Systems', d: 'High and low voltage installation, testing, and commissioning for commercial and industrial buildings.' },
                    { I: Gauge, n: 'Power Distribution', d: 'Switchgear maintenance, transformer servicing, and load balancing to ensure reliable power delivery.' },
                    { I: Shield, n: 'Lighting & Emergency', d: 'Energy-efficient lighting retrofits and emergency lighting systems compliant with UBBL requirements.' },
                    { I: Activity, n: 'Power Quality Analysis', d: 'Harmonic analysis, power factor correction, and energy audits to reduce consumption and costs.' },
                  ].map(({ I: Ic, n, d }, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <IconBox size="sm">
                        <Ic size={14} style={{ color: 'var(--hm-green)' }} />
                      </IconBox>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: 'var(--hm-ink)',
                            marginBottom: 2,
                          }}
                        >
                          {n}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>
                          {d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ThemeCard>

              {/* Fire & Safety Column */}
              <ThemeCard hover={false} large>
                <div className="flex items-center gap-2.5 mb-5">
                  <IconBox size="md">
                    <Shield size={20} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <h3
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.12rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    Fire &amp; Safety
                  </h3>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { I: Shield, n: 'Fire Suppression', d: 'Design, installation, and maintenance of sprinkler, gas, and foam suppression systems.' },
                    { I: AlertTriangle, n: 'Fire Alarm Systems', d: 'Conventional and addressable fire alarm systems with 24/7 monitoring and rapid response.' },
                    { I: Users, n: 'Compliance & Certification', d: 'JBPM fire certificate applications, annual inspections, and regulatory compliance management.' },
                    { I: Eye, n: 'Safety Audits', d: 'Comprehensive fire safety audits, risk assessments, and emergency evacuation planning.' },
                  ].map(({ I: Ic, n, d }, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <IconBox size="sm">
                        <Ic size={14} style={{ color: 'var(--hm-green)' }} />
                      </IconBox>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: 'var(--hm-ink)',
                            marginBottom: 2,
                          }}
                        >
                          {n}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>
                          {d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ThemeCard>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 6. INDUSTRIES ─── */}
        <ThemeSection variant="stone">
          <Reveal>
            <SectionHeader
              label="03 — Industries"
              title="Trusted across every sector."
              lede="From hospitals to hotels, our engineering teams adapt to the unique demands of each industry."
            />
            <div
              className="grid gap-5"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              }}
            >
              {[
                { Icon: Building2, name: 'Commercial', desc: 'Office towers, retail complexes, and mixed-use developments' },
                { Icon: Factory, name: 'Industrial', desc: 'Manufacturing plants, refineries, and processing facilities' },
                { Icon: Hospital, name: 'Healthcare', desc: 'Hospitals, clinics, and medical research laboratories' },
                { Icon: Landmark, name: 'Government', desc: 'Ministries, agencies, and public infrastructure' },
                { Icon: Hotel, name: 'Hospitality', desc: 'Hotels, resorts, and convention centres' },
                { Icon: GraduationCap, name: 'Education', desc: 'Universities, schools, and training institutions' },
                { Icon: Server, name: 'Data Centres', desc: 'Mission-critical IT infrastructure and server farms' },
                { Icon: Home, name: 'Residential', desc: 'Condominiums, apartments, and gated communities' },
              ].map(({ Icon, name, desc }) => (
                <ThemeCard key={name}>
                  <div className="flex flex-col gap-3 items-start">
                    <IconBox size="lg">
                      <Icon size={21} style={{ color: 'var(--hm-green)' }} />
                    </IconBox>
                    <h3
                      style={{
                        fontFamily: 'var(--hm-disp)',
                        fontWeight: 600,
                        fontSize: '1.05rem',
                        color: 'var(--hm-ink)',
                      }}
                    >
                      {name}
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>
                      {desc}
                    </p>
                  </div>
                </ThemeCard>
              ))}
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 7. SYSTEM OVERVIEW (forest) ─── */}
        <ThemeSection variant="forest">
          <Reveal>
            <SectionHeader
              label="Our Platform"
              title="Operations at a glance."
              lede="Real-time visibility into every asset, work order, and compliance milestone — powered by our proprietary CMMS."
              light
            />
            {/* Operations Panel */}
            <div
              className="rounded-2xl p-6 lg:p-8"
              style={{
                background: 'var(--hm-forest-2)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Stats grid */}
              <div
                className="grid gap-4 mb-8"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}
              >
                {[
                  { val: '1,247', label: 'Total Assets' },
                  { val: '43', label: 'Active WOs' },
                  { val: '98.2%', label: 'SLA Met' },
                  { val: '12', label: 'Open Alerts' },
                  { val: '96%', label: 'Uptime' },
                  { val: '23', label: 'Technicians' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center p-3"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 'var(--hm-r-sm)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--hm-disp)',
                        fontWeight: 600,
                        fontSize: '1.35rem',
                        color: 'var(--hm-paper)',
                        lineHeight: 1.1,
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.6rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'rgba(247,248,243,0.5)',
                        marginTop: 4,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="grid gap-8"
                style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr' }}
              >
                {/* Bar chart placeholder */}
                <div
                  className="p-5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 'var(--hm-r)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.66rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(247,248,243,0.5)',
                      marginBottom: 16,
                    }}
                  >
                    Monthly Completed Work Orders
                  </div>
                  {/* Simple bar chart */}
                  <div className="flex items-end gap-2" style={{ height: 140 }}>
                    {[65, 82, 74, 91, 68, 95, 88, 76, 93, 85, 70, 97].map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${(v / 100) * 120}px`,
                            background: i === 11 ? 'var(--hm-green-bright)' : 'rgba(255,255,255,0.15)',
                            borderRadius: '4px 4px 2px 2px',
                            transition: 'background 0.3s',
                            minHeight: 8,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: 'var(--hm-mono)',
                            fontSize: '0.55rem',
                            color: 'rgba(247,248,243,0.35)',
                          }}
                        >
                          {['J','F','M','A','M','J','J','A','S','O','N','D'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity feed */}
                <div
                  className="p-5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 'var(--hm-r)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    maxHeight: 260,
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.66rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(247,248,243,0.5)',
                      marginBottom: 16,
                    }}
                  >
                    Recent Activity
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { icon: CheckCircle2, text: 'WO-2041 completed — AHU-3 filter replacement', time: '12 min ago', color: 'var(--hm-green-bright)' },
                      { icon: AlertTriangle, text: 'Chiller-2 high discharge pressure alert', time: '28 min ago', color: '#f59e0b' },
                      { icon: Users, text: 'Technician Azman assigned to WO-2042', time: '45 min ago', color: 'rgba(247,248,243,0.5)' },
                      { icon: FileCheck, text: 'PM schedule generated — 38 assets for Dec', time: '1 hr ago', color: 'rgba(247,248,243,0.5)' },
                      { icon: Shield, text: 'Fire alarm inspection passed — Tower B', time: '2 hrs ago', color: 'var(--hm-green-bright)' },
                      { icon: Package, text: 'Spare parts received — 12 x BELIMO actuators', time: '3 hrs ago', color: 'rgba(247,248,243,0.5)' },
                    ].map(({ icon: Ic, text, time, color }, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <Ic size={14} style={{ color, marginTop: 3, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div style={{ fontSize: '0.82rem', color: 'var(--hm-paper)', lineHeight: 1.4 }}>
                            {text}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--hm-mono)',
                              fontSize: '0.58rem',
                              color: 'rgba(247,248,243,0.35)',
                              marginTop: 1,
                            }}
                          >
                            {time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 8. WORKFLOW ─── */}
        <ThemeSection variant="default">
          <Reveal>
            <SectionHeader
              label="How It Works"
              title="From request to resolution."
              lede="A structured, transparent process that keeps you informed at every stage."
            />
            <div
              className="grid gap-4"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
              }}
            >
              {[
                { n: 'Customer\nrequest', I: MessageCircle },
                { n: 'Complaint\ncreation', I: FileCheck },
                { n: 'Technician\nassignment', I: Users },
                { n: 'Work\norder', I: ClipboardCheck },
                { n: 'Execution', I: Wrench },
                { n: 'Inspection', I: Search },
                { n: 'Completion', I: CheckCircle2 },
                { n: 'Customer\nfeedback', I: Star },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center text-center gap-2.5">
                    <div
                      className="grid place-items-center relative"
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: 'var(--hm-stone)',
                        border: '1px solid var(--hm-line)',
                      }}
                    >
                      <step.I size={20} style={{ color: 'var(--hm-green)' }} />
                      <span
                        className="absolute -top-1.5 -right-1.5 grid place-items-center"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'var(--hm-forest)',
                          color: 'var(--hm-paper)',
                          fontFamily: 'var(--hm-mono)',
                          fontSize: '0.58rem',
                          fontWeight: 500,
                        }}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--hm-ink)',
                        lineHeight: 1.35,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {step.n}
                    </p>
                  </div>
                  {i < 7 && (
                    <div
                      className="flex items-center justify-center"
                      style={{ color: 'var(--hm-faint)' }}
                    >
                      <ArrowRight size={16} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 9. PROJECTS ─── */}
        <ThemeSection variant="stone">
          <Reveal>
            <SectionHeader
              label="04 — Projects"
              title="Proven track record."
              lede="A selection of completed and ongoing projects across Malaysia."
            />
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-8">
              {projectFilters.map((f) => (
                <button
                  key={f}
                  onClick={() => setProjectFilter(f)}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--hm-r-sm)',
                    border: '1px solid',
                    borderColor:
                      projectFilter === f ? 'var(--hm-forest)' : 'var(--hm-line)',
                    background: projectFilter === f ? 'var(--hm-forest)' : 'transparent',
                    color: projectFilter === f ? 'var(--hm-paper)' : 'var(--hm-muted)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Cards */}
            <div
              className="grid gap-6"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              }}
            >
              {filteredProjects.map((p) => (
                <ThemeCard key={p.title}>
                  <PlaceholderFig aspect="16/10" label={p.tag} className="mb-4" src={p.img} />
                  <div className="flex items-center gap-2 mb-2">
                    <MonoLabel>{p.tag}</MonoLabel>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.05rem',
                      color: 'var(--hm-ink)',
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {p.title}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>
                    {p.desc}
                  </p>
                </ThemeCard>
              ))}
            </div>
            <div className="mt-8 text-center">
              <ThemeLink variant="outline" onClick={() => navigate('projects')}>
                View all projects <ArrowRight size={16} />
              </ThemeLink>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 10. TESTIMONIALS ─── */}
        <ThemeSection variant="stone" className="!border-t" style={{ borderTop: '1px solid var(--hm-line)' }}>
          <Reveal>
            <SectionHeader
              label="05 — Testimonials"
              title="What our clients say."
            />
            <div className="relative max-w-[820px] mx-auto">
              <div
                className="p-8 lg:p-10 text-center"
                style={{
                  background: 'var(--hm-paper-2)',
                  border: '1px solid var(--hm-line)',
                  borderRadius: 'var(--hm-r-lg)',
                }}
              >
                <Quote
                  size={36}
                  style={{ color: 'var(--hm-green)', opacity: 0.3, marginBottom: 16 }}
                />
                <p
                  className="mb-6 mx-auto"
                  style={{
                    fontSize: '1.1rem',
                    lineHeight: 1.7,
                    color: 'var(--hm-ink)',
                    maxWidth: '60ch',
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{testimonials[testimonialIdx].quote}&rdquo;
                </p>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1rem',
                      color: 'var(--hm-forest)',
                    }}
                  >
                    {testimonials[testimonialIdx].name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.04em',
                      color: 'var(--hm-faint)',
                      marginTop: 2,
                    }}
                  >
                    {testimonials[testimonialIdx].title}
                  </div>
                </div>
              </div>
              {/* Nav arrows */}
              <div className="flex justify-center gap-3 mt-5">
                <button
                  onClick={() =>
                    setTestimonialIdx(
                      (testimonialIdx - 1 + testimonials.length) % testimonials.length
                    )
                  }
                  className="grid place-items-center cursor-pointer"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid var(--hm-line)',
                    background: 'var(--hm-paper-2)',
                    color: 'var(--hm-ink)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1.5">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTestimonialIdx(i)}
                      className="cursor-pointer"
                      style={{
                        width: i === testimonialIdx ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        border: 'none',
                        background: i === testimonialIdx ? 'var(--hm-forest)' : 'var(--hm-line)',
                        transition: 'all 0.3s var(--hm-ease)',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() =>
                    setTestimonialIdx((testimonialIdx + 1) % testimonials.length)
                  }
                  className="grid place-items-center cursor-pointer"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid var(--hm-line)',
                    background: 'var(--hm-paper-2)',
                    color: 'var(--hm-ink)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 11. BLOG ─── */}
        <ThemeSection variant="default">
          <Reveal>
            <SectionHeader
              label="06 — Insights"
              title="Latest from our team."
              lede="Expert perspectives on facilities management, compliance, and building technology."
            />
            <div
              className="grid gap-8 items-start"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
              }}
            >
              {/* Featured */}
              <ThemeCard hover={false} large className="!p-0 overflow-hidden">
                <PlaceholderFig aspect="16/9" label="Featured article" className="!rounded-t-[var(--hm-r-lg)] !rounded-b-none !border-0" src="/images/ahu.jpg" />
                <div className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <MonoLabel>Featured</MonoLabel>
                    <span
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.68rem',
                        color: 'var(--hm-faint)',
                      }}
                    >
                      Dec 15, 2024
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.3rem',
                      color: 'var(--hm-ink)',
                      lineHeight: 1.25,
                      marginBottom: 8,
                    }}
                  >
                    Why Preventive Maintenance Beats Reactive Repair — A Data-Driven Analysis
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--hm-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                    Our analysis of 500+ maintenance records reveals that organisations with
                    proactive PM programmes experience 73% fewer unplanned outages and save
                    an average of 40% on annual repair costs...
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 cursor-pointer"
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      color: 'var(--hm-green)',
                    }}
                  >
                    Read article <ArrowRight size={15} />
                  </span>
                </div>
              </ThemeCard>

              {/* Side articles */}
              <div className="flex flex-col gap-5">
                {[
                  {
                    date: 'Dec 8, 2024',
                    title: 'JBPM Fire Compliance Checklist for 2025',
                    excerpt: 'Updated requirements every building owner must know before the new year.',
                    img: '/images/blog-fire-compliance.jpg',
                  },
                  {
                    date: 'Nov 29, 2024',
                    title: 'The ROI of CMMS Implementation',
                    excerpt: 'How digital work order management transforms maintenance operations.',
                    img: '/images/gauges.jpg',
                  },
                  {
                    date: 'Nov 15, 2024',
                    title: 'Chiller Efficiency: 5 Low-Cost Optimisations',
                    excerpt: 'Practical steps to reduce chiller energy consumption by up to 25%.',
                    img: '/images/clean.jpg',
                  },
                ].map((a, i) => (
                  <div
                    key={i}
                    className="flex gap-4 items-start cursor-pointer group"
                  >
                    <PlaceholderFig
                      aspect="1/1"
                      label="Blog"
                      className="shrink-0"
                      src={a.img}
                    />
                    <div className="min-w-0">
                      <span
                        style={{
                          fontFamily: 'var(--hm-mono)',
                          fontSize: '0.64rem',
                          letterSpacing: '0.04em',
                          color: 'var(--hm-faint)',
                        }}
                      >
                        {a.date}
                      </span>
                      <h4
                        className="group-hover:underline"
                        style={{
                          fontFamily: 'var(--hm-disp)',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: 'var(--hm-ink)',
                          lineHeight: 1.3,
                          marginTop: 2,
                          marginBottom: 4,
                        }}
                      >
                        {a.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--hm-muted)', lineHeight: 1.5 }}>
                        {a.excerpt}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <ThemeLink variant="outline" onClick={() => navigate('blog')}>
                    View all articles <ArrowRight size={15} />
                  </ThemeLink>
                </div>
              </div>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 12. CAREERS ─── */}
        <ThemeSection variant="stone">
          <Reveal>
            <SectionHeader
              label="07 — Careers"
              title="Join the team that keeps Malaysia running."
              lede="We're always looking for skilled technicians, engineers, and operations professionals."
            />
            <div
              className="grid gap-8 items-start"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              }}
            >
              {/* Vacancies */}
              <div className="flex flex-col gap-4">
                {[
                  {
                    title: 'Senior HVAC Technician',
                    type: 'Full-time',
                    loc: 'Kuala Lumpur',
                  },
                  {
                    title: 'Electrical Engineer',
                    type: 'Full-time',
                    loc: 'Petaling Jaya',
                  },
                  {
                    title: 'Fire Safety Inspector',
                    type: 'Full-time',
                    loc: 'Shah Alam',
                  },
                  {
                    title: 'CMMS / Software Developer',
                    type: 'Full-time',
                    loc: 'Remote / KL',
                  },
                  {
                    title: 'Operations Coordinator',
                    type: 'Full-time',
                    loc: 'Kuala Lumpur',
                  },
                ].map((v) => (
                  <div
                    key={v.title}
                    className="flex items-center justify-between gap-4 p-4"
                    style={{
                      background: 'var(--hm-paper-2)',
                      border: '1px solid var(--hm-line)',
                      borderRadius: 'var(--hm-r)',
                      cursor: 'pointer',
                      transition: 'border-color 0.25s var(--hm-ease), transform 0.25s var(--hm-ease)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-forest)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-line)';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          fontFamily: 'var(--hm-disp)',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: 'var(--hm-ink)',
                        }}
                      >
                        {v.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          style={{
                            fontFamily: 'var(--hm-mono)',
                            fontSize: '0.65rem',
                            color: 'var(--hm-faint)',
                          }}
                        >
                          {v.type}
                        </span>
                        <span style={{ color: 'var(--hm-faint)', fontSize: '0.65rem' }}>·</span>
                        <span
                          className="flex items-center gap-1"
                          style={{
                            fontFamily: 'var(--hm-mono)',
                            fontSize: '0.65rem',
                            color: 'var(--hm-faint)',
                          }}
                        >
                          <MapPin size={11} /> {v.loc}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight size={18} style={{ color: 'var(--hm-faint)', flexShrink: 0 }} />
                  </div>
                ))}
                <ThemeLink variant="outline" onClick={() => navigate('careers')} className="mt-2">
                  View all openings <ArrowRight size={15} />
                </ThemeLink>
              </div>

              {/* Benefits */}
              <ThemeCard hover={false} large>
                <h3
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: 'var(--hm-ink)',
                    marginBottom: 16,
                  }}
                >
                  Why work with us
                </h3>
                <div className="flex flex-col gap-4">
                  {[
                    { I: TrendingUp, t: 'Career growth', d: 'Clear progression paths from technician to senior engineer to management.' },
                    { I: ShieldCheck, t: 'Certification support', d: 'Fully funded professional certifications and continuous training programmes.' },
                    { I: Heart, t: 'Health & wellbeing', d: 'Comprehensive medical coverage, dental, and mental health support.' },
                    { I: Calendar, t: 'Work-life balance', d: 'Flexible scheduling, generous leave, and family-friendly policies.' },
                  ].map(({ I, t, d }) => (
                    <div key={t} className="flex gap-3 items-start">
                      <IconBox size="sm">
                        <I size={14} style={{ color: 'var(--hm-green)' }} />
                      </IconBox>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: 'var(--hm-ink)',
                            marginBottom: 1,
                          }}
                        >
                          {t}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--hm-muted)', lineHeight: 1.5 }}>
                          {d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ThemeCard>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 13. CONTACT ─── */}
        <ThemeSection variant="default">
          <Reveal>
            <SectionHeader
              label="08 — Contact"
              title="Let's start a conversation."
              lede="Whether you need a maintenance audit, emergency support, or a custom proposal — we're here to help."
            />
            <div
              className="grid gap-12 items-start"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
              }}
            >
              {/* Contact info */}
              <div>
                <div className="flex flex-col gap-7 mb-8">
                  {[
                    {
                      I: MapPin,
                      label: 'Office',
                      value: 'Lot 45, Jalan Ampang Hilir,\n55000 Kuala Lumpur, Malaysia',
                    },
                    {
                      I: Phone,
                      label: 'Phone',
                      value: '+60 3-2788 8888',
                    },
                    {
                      I: Mail,
                      label: 'Email',
                      value: 'info@mohdhms.com.my',
                    },
                    {
                      I: Clock,
                      label: 'Hours',
                      value: 'Mon–Fri: 8:00 AM – 6:00 PM\nEmergency: 24/7',
                    },
                  ].map(({ I, label, value }) => (
                    <div key={label} className="flex gap-4 items-start">
                      <IconBox size="md">
                        <I size={18} style={{ color: 'var(--hm-green)' }} />
                      </IconBox>
                      <div>
                        <MonoLabel className="mb-1 block">{label}</MonoLabel>
                        <p
                          style={{
                            color: 'var(--hm-ink)',
                            fontSize: '0.92rem',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact form */}
              <div
                className="p-6 lg:p-8"
                style={{
                  background: 'var(--hm-paper-2)',
                  border: '1px solid var(--hm-line)',
                  borderRadius: 'var(--hm-r-lg)',
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                  className="flex flex-col gap-5"
                >
                  <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label
                        style={{
                          fontFamily: 'var(--hm-mono)',
                          fontSize: '0.68rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--hm-faint)',
                          display: 'block',
                          marginBottom: 6,
                        }}
                      >
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        className="w-full outline-none"
                        style={{
                          fontFamily: 'var(--hm-body)',
                          fontSize: '0.92rem',
                          padding: '0.65rem 0.9rem',
                          borderRadius: 'var(--hm-r-sm)',
                          border: '1px solid var(--hm-line)',
                          background: 'var(--hm-paper)',
                          color: 'var(--hm-ink)',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontFamily: 'var(--hm-mono)',
                          fontSize: '0.68rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--hm-faint)',
                          display: 'block',
                          marginBottom: 6,
                        }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="john@company.com"
                        className="w-full outline-none"
                        style={{
                          fontFamily: 'var(--hm-body)',
                          fontSize: '0.92rem',
                          padding: '0.65rem 0.9rem',
                          borderRadius: 'var(--hm-r-sm)',
                          border: '1px solid var(--hm-line)',
                          background: 'var(--hm-paper)',
                          color: 'var(--hm-ink)',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.68rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--hm-faint)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Company
                    </label>
                    <input
                      type="text"
                      placeholder="Your company name"
                      className="w-full outline-none"
                      style={{
                        fontFamily: 'var(--hm-body)',
                        fontSize: '0.92rem',
                        padding: '0.65rem 0.9rem',
                        borderRadius: 'var(--hm-r-sm)',
                        border: '1px solid var(--hm-line)',
                        background: 'var(--hm-paper)',
                        color: 'var(--hm-ink)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.68rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--hm-faint)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Service Needed
                    </label>
                    <select
                      className="w-full outline-none cursor-pointer"
                      style={{
                        fontFamily: 'var(--hm-body)',
                        fontSize: '0.92rem',
                        padding: '0.65rem 0.9rem',
                        borderRadius: 'var(--hm-r-sm)',
                        border: '1px solid var(--hm-line)',
                        background: 'var(--hm-paper)',
                        color: 'var(--hm-ink)',
                        appearance: 'auto',
                      }}
                    >
                      <option value="">Select a service</option>
                      <option>HVAC Maintenance</option>
                      <option>Electrical Services</option>
                      <option>Fire &amp; Safety</option>
                      <option>Plumbing</option>
                      <option>Preventive Maintenance</option>
                      <option>Emergency Repair</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.68rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--hm-faint)',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Message
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Tell us about your facility and what you need..."
                      className="w-full outline-none resize-vertical"
                      style={{
                        fontFamily: 'var(--hm-body)',
                        fontSize: '0.92rem',
                        padding: '0.65rem 0.9rem',
                        borderRadius: 'var(--hm-r-sm)',
                        border: '1px solid var(--hm-line)',
                        background: 'var(--hm-paper)',
                        color: 'var(--hm-ink)',
                        lineHeight: 1.6,
                      }}
                    />
                  </div>
                  <ThemeButton variant="fill" className="self-start">
                    Send message <Send size={16} />
                  </ThemeButton>
                </form>
              </div>
            </div>
          </Reveal>
        </ThemeSection>

        {/* ─── 14. FLOATING ACTION BUTTONS ─── */}
        <FloatingActions />
      </div>
    </PageWrapper>
  );
}