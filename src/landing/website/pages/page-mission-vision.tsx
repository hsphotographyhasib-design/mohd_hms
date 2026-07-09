'use client';

import React from 'react';
import {
  Shield, Scale, Wrench, Zap, Lightbulb, TrendingUp,
  HeartHandshake, UserCheck, MonitorSmartphone, Sprout,
  Award, CheckCircle2,
} from 'lucide-react';
import type { PageId } from '../public-website';
import {
  SectionHeader, ThemeSection, ThemeCard, ThemeLink,
  IconBox, MonoLabel, DisplayHeading, Reveal, PageWrapper,
} from '../theme';

interface PageProps { navigate: (id: PageId) => void; }

const coreValues = [
  {
    title: 'Safety First',
    desc: 'Every task begins with a risk assessment. We maintain a zero-incident culture through mandatory PPE, regular safety drills and HSE protocols that exceed regulatory requirements.',
    icon: Shield,
  },
  {
    title: 'Integrity',
    desc: 'We document everything, charge fairly and communicate honestly. Our clients trust us because we never cut corners and always own our mistakes.',
    icon: Scale,
  },
  {
    title: 'Craftsmanship',
    desc: 'Our technicians are tradespeople, not just workers. We take pride in doing the job right the first time, with attention to detail that reflects years of training.',
    icon: Wrench,
  },
  {
    title: 'Responsiveness',
    desc: 'When a client calls, we answer. When equipment fails, we respond fast. Our SLA-driven approach means guaranteed response times and escalation paths.',
    icon: Zap,
  },
  {
    title: 'Innovation',
    desc: 'From our custom CMMS to WhatsApp AI fault reporting, we invest in technology that makes maintenance smarter, faster and more transparent.',
    icon: Lightbulb,
  },
  {
    title: 'Continuous Improvement',
    desc: 'We track KPIs, review performance monthly and invest in ongoing training. Every project teaches us something that makes the next one better.',
    icon: TrendingUp,
  },
];

const strategicPriorities = [
  {
    title: 'Client Satisfaction',
    desc: 'Achieve and maintain a 95%+ client satisfaction score through proactive communication, transparent reporting and consistent service delivery across all contracts.',
    icon: HeartHandshake,
    metrics: ['95%+ satisfaction target', 'Net Promoter Score tracking', 'Quarterly business reviews'],
  },
  {
    title: 'Team Excellence',
    desc: 'Attract, train and retain the best technicians in Brunei. Invest in certifications, career pathways and a workplace culture that people are proud to be part of.',
    icon: UserCheck,
    metrics: ['Annual training hours per tech', 'Trade certification targets', 'Employee retention rate'],
  },
  {
    title: 'Digital Leadership',
    desc: 'Continue investing in our CMMS platform, mobile tools and AI capabilities to maintain our position as the most technologically advanced maintenance provider in the region.',
    icon: MonitorSmartphone,
    metrics: ['CMMS feature roadmap', 'AI fault classification', 'Real-time client dashboards'],
  },
  {
    title: 'Sustainable Growth',
    desc: 'Expand thoughtfully into new sectors and geographies while maintaining the service quality and client relationships that built our reputation.',
    icon: Sprout,
    metrics: ['Regional expansion plan', 'Sector diversification', 'Revenue growth targets'],
  },
];

export function PageMissionVision({ navigate }: PageProps) {
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
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Mission &amp; Vision</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Mission &amp; Vision
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            The guiding principles that drive every service we deliver and every decision we make.
          </p>
        </div>
      </div>

      {/* Section 1: Our Mission */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="01 — Our Mission"
            title="What we exist to do."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <ThemeCard large hover={false} className="max-w-[820px]">
            <div className="flex items-start gap-5">
              <div className="shrink-0 hidden sm:block" style={{ width: 4, height: '100%', minHeight: 80, borderRadius: 2, background: 'var(--hm-green)' }} />
              <div>
                <MonoLabel className="block mb-4">Mission Statement</MonoLabel>
                <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 500, fontSize: 'clamp(1.2rem, 2.5vw, 1.55rem)', color: 'var(--hm-ink)', lineHeight: 1.45, letterSpacing: '-0.01em' }}>
                  &ldquo;To deliver reliable, safe and efficient facility maintenance that protects our clients&apos; assets, ensures compliance and maximises operational uptime.&rdquo;
                </p>
                <p style={{ fontSize: '0.94rem', color: 'var(--hm-muted)', lineHeight: 1.7, marginTop: 20 }}>
                  Every work order we complete, every preventive schedule we follow, and every emergency call we answer is driven by this single purpose. We don&apos;t just fix things — we protect the investments our clients have made in their buildings and equipment, and we ensure those assets operate at peak performance for as long as possible.
                </p>
                <p style={{ fontSize: '0.94rem', color: 'var(--hm-muted)', lineHeight: 1.7, marginTop: 12 }}>
                  Our mission is practical, not aspirational. It means arriving on time, documenting every action, using the right parts and following proper procedures. It means treating our clients&apos; facilities as if they were our own.
                </p>
              </div>
            </div>
          </ThemeCard>
        </Reveal>
      </ThemeSection>

      {/* Section 2: Our Vision */}
      <ThemeSection variant="stone">
        <Reveal>
          <SectionHeader
            label="02 — Our Vision"
            title="Where we are headed."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <ThemeCard large hover={false} className="max-w-[820px]">
            <div className="flex items-start gap-5">
              <div className="shrink-0 hidden sm:block" style={{ width: 4, height: '100%', minHeight: 80, borderRadius: 2, background: 'var(--hm-forest)' }} />
              <div>
                <MonoLabel className="block mb-4">Vision Statement</MonoLabel>
                <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 500, fontSize: 'clamp(1.2rem, 2.5vw, 1.55rem)', color: 'var(--hm-ink)', lineHeight: 1.45, letterSpacing: '-0.01em' }}>
                  &ldquo;To be the region&apos;s most trusted and technologically advanced facility maintenance and engineering partner, setting the standard for accountability and service excellence.&rdquo;
                </p>
                <p style={{ fontSize: '0.94rem', color: 'var(--hm-muted)', lineHeight: 1.7, marginTop: 20 }}>
                  Our vision recognises that the future of facility maintenance lies at the intersection of skilled trades and smart technology. We are building a company where experienced technicians are amplified by digital tools — not replaced by them.
                </p>
                <p style={{ fontSize: '0.94rem', color: 'var(--hm-muted)', lineHeight: 1.7, marginTop: 12 }}>
                  We aspire to be the partner that organisations across Borneo and beyond turn to first — not because we&apos;re the cheapest, but because we&apos;re the most reliable, the most transparent, and the most invested in their long-term success.
                </p>
              </div>
            </div>
          </ThemeCard>
        </Reveal>
      </ThemeSection>

      {/* Section 3: Core Values */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="03 — Core Values"
            title="Six principles that guide us."
            lede="These aren't just words on a wall. They're the standards we hold ourselves to every day."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" style={{ marginTop: 20 }}>
          {coreValues.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.07}>
              <ThemeCard>
                <IconBox size="lg" className="mb-4">
                  <item.icon size={20} style={{ color: 'var(--hm-green)' }} />
                </IconBox>
                <DisplayHeading className="text-base mb-2">{item.title}</DisplayHeading>
                <p style={{ fontSize: '0.88rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{item.desc}</p>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Section 4: Strategic Priorities */}
      <ThemeSection variant="stone">
        <Reveal>
          <SectionHeader
            label="04 — Strategic Priorities"
            title="Where we focus our energy."
            lede="Four pillars that guide our investments, hiring and operational decisions."
          />
        </Reveal>
        <div className="grid md:grid-cols-2 gap-5" style={{ marginTop: 20 }}>
          {strategicPriorities.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <ThemeCard large hover={false}>
                <div className="flex items-start gap-4 mb-4">
                  <IconBox size="lg">
                    <item.icon size={20} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <DisplayHeading className="text-lg">{item.title}</DisplayHeading>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--hm-muted)', lineHeight: 1.65, marginBottom: 16 }}>{item.desc}</p>
                <div className="space-y-2">
                  {item.metrics.map((metric) => (
                    <div key={metric} className="flex items-center gap-2.5">
                      <CheckCircle2 size={14} style={{ color: 'var(--hm-green)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--hm-ink)' }}>{metric}</span>
                    </div>
                  ))}
                </div>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Section 5: Quality Commitment */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="05 — Quality Commitment"
            title="Certified processes, proven results."
          />
        </Reveal>
        <div className="grid lg:grid-cols-2 gap-16 items-center" style={{ marginTop: 20 }}>
          <Reveal>
            <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 500, fontSize: '1.16rem', color: 'var(--hm-ink)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              Quality isn&apos;t an afterthought at MOHD.HMS — it&apos;s embedded in every process, from the way we onboard a new client to the way we close out a work order.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 16, lineHeight: 1.7 }}>
              We operate in strict alignment with international ISO standards for quality management and occupational health and safety. Every technician on our team holds valid trade certifications issued by recognised bodies, and we maintain a continuous training programme that ensures skills stay current with evolving regulations and technologies.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 12, lineHeight: 1.7 }}>
              Our HSE (Health, Safety and Environment) compliance programme includes mandatory risk assessments before every job, regular site safety audits, incident investigation protocols, and a near-miss reporting system that helps us identify hazards before they become incidents.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-4">
              {[
                { title: 'ISO-Aligned Quality Management', desc: 'Our processes follow ISO 9001 principles for quality assurance, document control and continuous improvement.', icon: Award },
                { title: 'HSE Compliance Programme', desc: 'Mandatory risk assessments, PPE protocols, safety audits and incident reporting across all work sites.', icon: Shield },
                { title: 'Certified Technician Teams', desc: 'Every technician holds current trade certifications. Annual re-certification and skills assessment ensure competency.', icon: UserCheck },
                { title: 'Audit-Ready Documentation', desc: 'Every job, inspection and compliance check is digitally recorded and audit-ready through our CMMS platform.', icon: CheckCircle2 },
              ].map((item) => (
                <ThemeCard key={item.title} hover={false}>
                  <div className="flex items-start gap-4">
                    <IconBox>
                      <item.icon size={18} style={{ color: 'var(--hm-green)' }} />
                    </IconBox>
                    <div>
                      <DisplayHeading className="text-sm mb-1">{item.title}</DisplayHeading>
                      <p style={{ fontSize: '0.84rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{item.desc}</p>
                    </div>
                  </div>
                </ThemeCard>
              ))}
            </div>
          </Reveal>
        </div>
      </ThemeSection>

      {/* CTA */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            Join us on our mission
          </h2>
          <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>
            Whether as a client or a team member, there&apos;s a place for you in what we&apos;re building.
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