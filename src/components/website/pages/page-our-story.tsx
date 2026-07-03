'use client';

import React from 'react';
import {
  Wrench, Zap, Droplets, Flame, MonitorSmartphone,
  QrCode, MessageSquare, Smartphone, Building2,
  Users, TrendingUp, ArrowRight,
} from 'lucide-react';
import type { PageId } from '../public-website';
import {
  SectionHeader, ThemeSection, ThemeCard, ThemeLink,
  IconBox, MonoLabel, DisplayHeading, Reveal, PageWrapper,
} from '../theme';

interface PageProps { navigate: (id: PageId) => void; }

const timelineItems = [
  {
    year: '2008',
    title: 'Founded in Bandar Seri Begawan',
    desc: 'Eng. Hafiz Rahman establishes MOHD.HMS ENTERPRISE as a specialist HVAC contractor, serving commercial and government buildings across Brunei.',
  },
  {
    year: '2011',
    title: 'Electrical Services Launched',
    desc: 'Expanded service portfolio to include electrical installation, testing and maintenance — responding to growing client demand for multi-trade support.',
  },
  {
    year: '2013',
    title: 'Plumbing & Mechanical Division',
    desc: 'Added plumbing, sanitary and general mechanical services. Grew from 5 to 22 technicians within 18 months.',
  },
  {
    year: '2015',
    title: 'Fire Protection Certified',
    desc: 'Achieved fire protection system certification. Began serving high-rise buildings, hospitals and industrial facilities requiring full compliance.',
  },
  {
    year: '2017',
    title: '100th Client Milestone',
    desc: 'Reached 100 active maintenance contracts across 8 sectors. Opened a second operations hub in the Gadong area.',
  },
  {
    year: '2019',
    title: 'CMMS Platform Deployed',
    desc: 'Launched our in-house Computerised Maintenance Management System — digitising work orders, asset registers and compliance tracking.',
  },
  {
    year: '2021',
    title: 'QR Code & WhatsApp Integration',
    desc: 'Rolled out QR-code asset tagging and WhatsApp AI-powered fault reporting, reducing response times by 40%.',
  },
  {
    year: '2023',
    title: 'Mobile App & Portal Launch',
    desc: 'Released the client mobile app and self-service portal, giving clients real-time visibility into maintenance schedules and reports.',
  },
  {
    year: '2024',
    title: '1,200+ Managed Assets',
    desc: 'Surpassed 1,200 actively managed assets across 186 clients and 14 industry sectors with a team of 64+ certified technicians.',
  },
  {
    year: '2026',
    title: 'Regional Expansion Planning',
    desc: 'Preparing for expansion into East Malaysia and Sabah, building partnerships with regional facility management firms.',
  },
];

export function PageOurStory({ navigate }: PageProps) {
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
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Our Story</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Our Story
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            From a small HVAC specialist to Brunei&apos;s trusted full-service facility maintenance provider.
          </p>
        </div>
      </div>

      {/* Section 1: The Beginning */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="01 — The Beginning"
            title="Started with a single trade and a clear purpose."
            lede="Every great company begins with a person who sees a gap and decides to fill it."
          />
        </Reveal>
        <div className="grid lg:grid-cols-2 gap-16 items-center" style={{ marginTop: 20 }}>
          <Reveal>
            <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 500, fontSize: '1.16rem', color: 'var(--hm-ink)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              In 2008, Eng. Hafiz Rahman founded MOHD.HMS ENTERPRISE in Bandar Seri Begawan with a focused mission: deliver reliable HVAC maintenance that commercial buildings and government facilities could genuinely depend on.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 16, lineHeight: 1.7 }}>
              Armed with a degree in mechanical engineering and over a decade of hands-on experience across Southeast Asia, Hafiz saw that many Bruneian organisations were struggling with inconsistent maintenance — missed service calls, undocumented repairs, and no accountability when things went wrong.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 12, lineHeight: 1.7 }}>
              He started with a team of five technicians, a single van, and a commitment that every job would be documented, every technician would be certified, and every client would know exactly what they were paying for. That founding ethos of transparency and accountability still drives every decision we make today.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ position: 'relative' }}>
              <div
                className="rounded-[var(--hm-r-lg)] overflow-hidden"
                style={{
                  background: 'var(--hm-stone-2)',
                  border: '1px solid var(--hm-line)',
                  padding: '32px',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <IconBox size="lg">
                    <Wrench size={20} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <DisplayHeading className="text-lg">How It Started</DisplayHeading>
                </div>
                <div className="space-y-5">
                  {[
                    { num: '5', label: 'Founding technicians' },
                    { num: '1', label: 'Service van' },
                    { num: '1', label: 'Trade — HVAC' },
                    { num: '1', label: 'Office in BSB' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between" style={{ paddingBottom: 14, borderBottom: '1px solid var(--hm-line-soft)' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--hm-muted)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)' }}>{item.num}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </ThemeSection>

      {/* Section 2: Growth & Evolution */}
      <ThemeSection variant="stone">
        <Reveal>
          <SectionHeader
            label="02 — Growth & Evolution"
            title="Expanding capabilities to serve every building system."
            lede="Clients kept asking: 'Can you handle our electrical too?' We listened."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ marginTop: 20 }}>
          {[
            { title: 'Electrical', desc: 'Added full electrical installation, testing and maintenance services in 2011 — from power distribution to emergency lighting systems.', icon: Zap },
            { title: 'Plumbing', desc: 'Launched plumbing and sanitary division in 2013, covering everything from water supply systems to grease trap maintenance.', icon: Droplets },
            { title: 'Fire Protection', desc: 'Achieved fire protection certification in 2015, enabling us to serve hospitals, high-rises and industrial facilities.', icon: Flame },
            { title: 'Multi-Site Operations', desc: 'Grew from 5 to 64+ technicians. Now manage maintenance across dozens of sites simultaneously with dedicated site leads.', icon: Building2 },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <ThemeCard>
                <IconBox className="mb-4">
                  <item.icon size={20} style={{ color: 'var(--hm-green)' }} />
                </IconBox>
                <DisplayHeading className="text-base mb-2">{item.title}</DisplayHeading>
                <p style={{ fontSize: '0.88rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{item.desc}</p>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8" style={{ borderTop: '1px solid var(--hm-line)' }}>
            {[
              ['5 → 64+', 'Technicians'],
              ['500+', 'Projects Delivered'],
              ['4', 'Service Trades'],
              ['8+', 'Years to Full Service'],
            ].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.6rem', color: 'var(--hm-forest)', lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--hm-faint)', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </ThemeSection>

      {/* Section 3: Digital Transformation */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="03 — Digital Transformation"
            title="Technology as a force multiplier."
            lede="We invested early in digital tools because accountability demands data."
          />
        </Reveal>
        <div className="grid lg:grid-cols-2 gap-16 items-start" style={{ marginTop: 20 }}>
          <Reveal>
            <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 500, fontSize: '1.16rem', color: 'var(--hm-ink)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              In 2019, we made a bold decision: build our own CMMS platform from the ground up, tailored specifically to the needs of Bruneian facility operations.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 16, lineHeight: 1.7 }}>
              Off-the-shelf maintenance software didn&apos;t understand local compliance requirements, couldn&apos;t handle multilingual work orders, and lacked the flexibility our field teams needed. So we built one that did.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 12, lineHeight: 1.7 }}>
              What followed was a rapid digital transformation: QR-code asset tagging on every piece of equipment we maintain, a WhatsApp AI chatbot that lets building managers report faults in seconds, and a client portal and mobile app that provide real-time visibility into every work order, every compliance certificate, and every spare part usage record.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 12, lineHeight: 1.7 }}>
              The result? A 40% reduction in average response time, near-zero lost paperwork, and clients who can finally see exactly what they&apos;re paying for — anytime, anywhere.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-4">
              {[
                { title: 'CMMS Platform', desc: 'Custom-built work order management, asset registers, preventive scheduling and compliance tracking.', icon: MonitorSmartphone, stat: '2019' },
                { title: 'QR Code Asset Tagging', desc: 'Every managed asset gets a QR tag. Technicians scan to access service history, manuals and checklists.', icon: QrCode, stat: '2021' },
                { title: 'WhatsApp AI Reporting', desc: 'Clients report faults via WhatsApp. Our AI classifies, prioritises and dispatches — no forms, no delays.', icon: MessageSquare, stat: '2021' },
                { title: 'Client Portal & Mobile App', desc: 'Real-time dashboards, PDF reports, SLA tracking and direct communication with assigned technicians.', icon: Smartphone, stat: '2023' },
              ].map((item, i) => (
                <ThemeCard key={item.title} hover={false}>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0" style={{ width: 100 }}>
                      <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)' }}>{item.stat}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon size={16} style={{ color: 'var(--hm-green)' }} />
                        <DisplayHeading className="text-sm">{item.title}</DisplayHeading>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{item.desc}</p>
                    </div>
                  </div>
                </ThemeCard>
              ))}
            </div>
          </Reveal>
        </div>
      </ThemeSection>

      {/* Section 4: Today */}
      <ThemeSection variant="forest">
        <Reveal>
          <SectionHeader
            label="04 — Today"
            title="A trusted partner at scale."
            light
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ marginTop: 20 }}>
          {[
            { num: '186+', label: 'Active Clients', desc: 'From small offices to large government complexes, we serve organisations of every size.' },
            { num: '14', label: 'Industry Sectors', desc: 'Healthcare, education, hospitality, retail, industrial, government and more.' },
            { num: '1,200+', label: 'Managed Assets', desc: 'Every asset tagged, tracked and maintained through our CMMS platform.' },
            { num: '64+', label: 'Certified Technicians', desc: 'HVAC, electrical, plumbing, mechanical and fire protection specialists.' },
          ].map((item, i) => (
            <Reveal key={item.label} delay={i * 0.08}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--hm-r)',
                  padding: '24px',
                }}
              >
                <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '2.2rem', color: 'var(--hm-paper)', lineHeight: 1 }}>{item.num}</div>
                <div style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--hm-mono)', color: 'var(--hm-green-bright)', marginTop: 6, marginBottom: 12 }}>{item.label}</div>
                <p style={{ fontSize: '0.84rem', color: 'rgba(247,248,243,0.6)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Section 5: Timeline */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="05 — Timeline"
            title="Key milestones from 2008 to today."
            lede="A journey of steady growth, bold investments and unwavering commitment to our clients."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative mx-auto" style={{ maxWidth: 720 }}>
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px hidden md:block" style={{ background: 'var(--hm-line)', transform: 'translateX(-50%)' }} />
            {/* Left line for mobile */}
            <div className="absolute left-6 top-0 bottom-0 w-px md:hidden" style={{ background: 'var(--hm-line)' }} />

            {timelineItems.map((item, i) => (
              <div key={item.year} className={`relative flex items-center gap-8 mb-10 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} flex-row`}>
                {/* Content - desktop */}
                <div className={`hidden md:block flex-1 ${i % 2 === 0 ? 'text-right' : 'text-left'}`}>
                  <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--hm-forest)' }}>{item.title}</div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--hm-muted)', lineHeight: 1.6, marginTop: 4 }}>{item.desc}</p>
                </div>
                {/* Circle */}
                <div className="shrink-0" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--hm-forest)', color: 'var(--hm-paper)', display: 'grid', placeItems: 'center', fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', fontWeight: 600, zIndex: 1 }}>
                  {item.year}
                </div>
                {/* Content - desktop (empty spacer) / mobile (actual content) */}
                <div className="hidden md:block flex-1" />
                {/* Content - mobile */}
                <div className="md:hidden flex-1">
                  <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--hm-forest)' }}>{item.title}</div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--hm-muted)', lineHeight: 1.6, marginTop: 4 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </ThemeSection>

      {/* CTA */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            Ready to write the next chapter together?
          </h2>
          <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>
            Whether you need a maintenance partner for a single building or an entire portfolio, we&apos;re ready to help.
          </p>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <ThemeLink variant="outline" onClick={() => navigate('contact')} style={{ color: 'var(--hm-paper)', borderColor: 'rgba(255,255,255,0.25)' }}>
              Contact us
            </ThemeLink>
            <ThemeLink variant="green" onClick={() => navigate('services')}>
              View our services
            </ThemeLink>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}