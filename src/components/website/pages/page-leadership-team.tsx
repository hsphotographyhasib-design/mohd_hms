'use client';

import React from 'react';
import {
  ArrowRight, Mail, Linkedin,
  Zap, Shield, Droplets, Calculator, Flame, TrendingUp,
} from 'lucide-react';
import type { PageId } from '../public-website';
import {
  SectionHeader, ThemeSection, ThemeCard, ThemeLink,
  IconBox, MonoLabel, DisplayHeading, Reveal, PlaceholderFig, PageWrapper,
} from '../theme';

interface PageProps { navigate: (id: PageId) => void; }

const management = [
  {
    name: 'Eng. Hafiz Rahman',
    role: 'Managing Director',
    bio: 'Founder and principal engineer with 15+ years of building services experience across Southeast Asia. Holds a B.Eng (Mechanical) and oversees strategic direction, key client relationships and technical standards. Previously served as senior engineer at a regional M&E consultancy before establishing MOHD.HMS in 2008.',
    img: '/images/team-hafiz.jpg',
  },
  {
    name: 'Sarah Lim',
    role: 'Operations Manager',
    bio: 'Leads all field operations, workforce scheduling and SLA delivery. 10+ years in facilities management with expertise in multi-site maintenance coordination. Ensures every job is dispatched, tracked and closed to standard through the CMMS platform.',
    img: '/images/team-sarah.jpg',
  },
  {
    name: 'Daniel Wong',
    role: 'Senior HVAC Supervisor',
    bio: 'Chiller plant and BMS specialist with 12 years of hands-on experience. Manages the HVAC division and mentors junior technicians. Certified in Daikin, Carrier and Trane systems. Led the installation and commissioning of 40+ major HVAC projects.',
    img: '/images/team-daniel.jpg',
  },
  {
    name: 'Aina Yusof',
    role: 'Customer Support Lead',
    bio: 'Single point of contact for all 186+ active clients. Manages the helpdesk, WhatsApp AI fault reporting system and client satisfaction surveys. Known for rapid response times and building strong, lasting client relationships.',
    img: '/images/team-aina.jpg',
  },
];

const departmentHeads = [
  {
    name: 'Ahmad Faiz',
    role: 'Electrical Division Lead',
    bio: 'Licensed electrical supervisor with expertise in HV/LV systems, emergency power and building automation.',
    icon: Zap,
  },
  {
    name: 'Nurul Izzah',
    role: 'QHSE Manager',
    bio: 'Leads quality, health, safety and environment compliance. NEBOSH-certified with 8 years in construction HSE.',
    icon: Shield,
  },
  {
    name: 'James Tan',
    role: 'Plumbing & Mechanical Lead',
    bio: 'Specialist in water supply, drainage and sanitary systems. Manages preventive schedules for 500+ plumbing assets.',
    icon: Droplets,
  },
  {
    name: 'Siti Hajar',
    role: 'Finance & Administration',
    bio: 'Oversees invoicing, procurement, vendor management and financial reporting. CPA-qualified with audit experience.',
    icon: Calculator,
  },
  {
    name: 'Razali bin Haji Omar',
    role: 'Fire Protection Lead',
    bio: 'Certified fire protection engineer. Manages fire alarm, sprinkler and suppression system maintenance across all sites.',
    icon: Flame,
  },
  {
    name: 'Linda Chen',
    role: 'Business Development',
    bio: 'Drives new client acquisition, partnership development and market expansion. Background in B2B engineering services.',
    icon: TrendingUp,
  },
];

export function PageLeadershipTeam({ navigate }: PageProps) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <button onClick={() => navigate('about')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>About</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Leadership Team</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Leadership Team
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            Experienced professionals committed to excellence in facility maintenance.
          </p>
        </div>
      </div>

      {/* Section 1: Management */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="01 — Management"
            title="The people steering the ship."
            lede="Our leadership team brings together decades of engineering, operations and client management experience."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ marginTop: 20 }}>
          {management.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.08}>
              <ThemeCard className="text-center">
                <div className="mx-auto mb-4" style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--hm-line)' }}>
                  <PlaceholderFig aspect="1/1" src={m.img} />
                </div>
                <DisplayHeading className="text-base mb-1">{m.name}</DisplayHeading>
                <MonoLabel className="block mb-3">{m.role}</MonoLabel>
                <p style={{ fontSize: '0.84rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>{m.bio}</p>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Section 2: Department Heads */}
      <ThemeSection variant="stone">
        <Reveal>
          <SectionHeader
            label="02 — Department Heads"
            title="Specialists leading each division."
            lede="Each department head brings deep domain expertise and hands-on field experience."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" style={{ marginTop: 20 }}>
          {departmentHeads.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.07}>
              <ThemeCard>
                <div className="flex items-start gap-4">
                  <div className="shrink-0" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--hm-stone)', display: 'grid', placeItems: 'center' }}>
                    <m.icon size={20} style={{ color: 'var(--hm-green)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DisplayHeading className="text-base mb-1">{m.name}</DisplayHeading>
                    <MonoLabel className="block mb-2">{m.role}</MonoLabel>
                    <p style={{ fontSize: '0.84rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>{m.bio}</p>
                  </div>
                </div>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Section 3: Join Our Team */}
      <ThemeSection>
        <Reveal>
          <div className="max-w-[820px]">
            <div className="flex items-start gap-5">
              <div className="shrink-0 hidden sm:block" style={{ width: 4, height: '100%', minHeight: 80, borderRadius: 2, background: 'var(--hm-green)' }} />
              <div>
                <MonoLabel className="block mb-4">03 — Join Our Team</MonoLabel>
                <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', lineHeight: 1.08, letterSpacing: '-0.02em', color: 'var(--hm-forest)', marginBottom: 16 }}>
                  We&apos;re always looking for skilled people who care about their craft.
                </h2>
                <p style={{ fontSize: '0.94rem', color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
                  MOHD.HMS ENTERPRISE is growing, and we need talented technicians, engineers and support professionals to join our journey. We offer competitive salaries, clear career progression, ongoing training and a work culture built on respect and accountability.
                </p>
                <p style={{ fontSize: '0.94rem', color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 24 }}>
                  Whether you&apos;re a certified HVAC technician, a licensed electrician, a plumbing specialist or someone who thrives in operations and client management — we&apos;d love to hear from you.
                </p>
                <ThemeLink variant="fill" onClick={() => navigate('careers')}>
                  View open positions
                  <ArrowRight size={16} />
                </ThemeLink>
              </div>
            </div>
          </div>
        </Reveal>
      </ThemeSection>

      {/* CTA */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            Want to work with us?
          </h2>
          <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>
            Whether you need a maintenance partner or want to join our team, let&apos;s start a conversation.
          </p>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <ThemeLink variant="outline" onClick={() => navigate('careers')} style={{ color: 'var(--hm-paper)', borderColor: 'rgba(255,255,255,0.25)' }}>
              View careers
            </ThemeLink>
            <ThemeLink variant="green" onClick={() => navigate('contact')}>
              Contact us
            </ThemeLink>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}