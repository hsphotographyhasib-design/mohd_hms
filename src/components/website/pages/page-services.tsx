'use client';

import React from 'react';
import { Wind, Zap, Droplets, Shield, Wrench, AlertTriangle, ClipboardCheck, Ruler, ArrowRight, ChevronRight } from 'lucide-react';
import type { PageId } from '../public-website';
import {
  SectionHeader, ThemeSection, ThemeCard, ThemeButton, ThemeLink,
  IconBox, MonoLabel, DisplayHeading, Reveal, PlaceholderFig, Divider,
} from '../theme';

interface PageProps {
  navigate: (id: PageId) => void;
  subPage?: 'hvac' | 'electrical' | 'plumbing' | 'fire' | 'preventive' | 'emergency';
}

const services = [
  {
    id: 'hvac' as const, title: 'HVAC Services', icon: Wind,
    desc: 'Comprehensive heating, ventilation and air conditioning maintenance to keep your systems running efficiently.',
    items: [
      { name: 'Chiller & AHU maintenance', desc: 'Routine servicing, component replacement and performance optimization.' },
      { name: 'Duct cleaning & hygiene', desc: 'IAQ-compliant duct cleaning and sanitization.' },
      { name: 'VRF/VRV systems', desc: 'Installation, commissioning and maintenance of variable refrigerant systems.' },
      { name: 'Cooling tower service', desc: 'Water treatment, fill replacement and structural inspection.' },
      { name: 'BMS integration', desc: 'Connect HVAC to building management for automated control.' },
    ],
  },
  {
    id: 'electrical' as const, title: 'Electrical Services', icon: Zap,
    desc: 'Safe, compliant electrical maintenance and testing for all facility types.',
    items: [
      { name: 'LV distribution', desc: 'Switchgear maintenance, cable testing and load balancing.' },
      { name: 'Panel testing & thermography', desc: 'Infrared scanning to detect hot spots before failures.' },
      { name: 'Emergency lighting', desc: 'Installation, testing and battery replacement.' },
      { name: 'Generator maintenance', desc: 'Load testing, fuel system service and ATS checks.' },
      { name: 'Power quality audits', desc: 'Harmonic analysis, power factor correction and energy audits.' },
    ],
  },
  {
    id: 'plumbing' as const, title: 'Plumbing & Mechanical', icon: Droplets,
    desc: 'Complete plumbing and mechanical systems maintenance and repair.',
    items: [
      { name: 'Pipe fitting & repair', desc: 'Leak detection, pipe replacement and pressure testing.' },
      { name: 'Pump systems', desc: 'Centrifugal, booster and submersible pump maintenance.' },
      { name: 'Water treatment', desc: 'Filtration, softening and chemical dosing systems.' },
      { name: 'Sanitary systems', desc: 'Fixture maintenance, drainage and grease trap service.' },
    ],
  },
  {
    id: 'fire' as const, title: 'Fire & Safety', icon: Shield,
    desc: 'Fire protection systems maintenance, testing and compliance.',
    items: [
      { name: 'Fire alarm systems', desc: 'Detector testing, panel servicing and evacuation system checks.' },
      { name: 'Suppression systems', desc: 'Sprinkler, gas suppression and foam system maintenance.' },
      { name: 'Emergency exit signage', desc: 'Illuminated exit sign installation and testing.' },
      { name: 'Fire extinguisher service', desc: 'Annual servicing, refilling and placement compliance.' },
      { name: 'Compliance inspection', desc: 'Full fire safety audits and certification support.' },
    ],
  },
  {
    id: 'preventive' as const, title: 'Preventive Maintenance', icon: ClipboardCheck,
    desc: 'Planned maintenance programs that prevent breakdowns and extend asset life.',
    items: [
      { name: 'PPM scheduling', desc: 'Automated schedules based on manufacturer guidelines and usage.' },
      { name: 'Condition monitoring', desc: 'Vibration analysis, thermal imaging and oil analysis.' },
      { name: 'Asset lifecycle management', desc: 'Track every asset from install to replacement.' },
      { name: 'Compliance tracking', desc: 'Never miss a statutory inspection or certification renewal.' },
    ],
  },
  {
    id: 'emergency' as const, title: 'Emergency Breakdown', icon: AlertTriangle,
    desc: '24/7 rapid response for critical equipment failures and safety hazards.',
    items: [
      { name: '24/7 hotline', desc: 'One call connects you to our on-duty technician.' },
      { name: 'Rapid deployment', desc: 'Technicians dispatched within minutes of your call.' },
      { name: 'Temporary solutions', desc: 'Rental equipment and temporary fixes to restore operations.' },
      { name: 'Root cause analysis', desc: 'Post-repair investigation to prevent recurrence.' },
    ],
  },
];

const additionalServices = [
  { title: 'Annual Maintenance Contracts', desc: 'Bundled services with guaranteed response times and priority support.', icon: ClipboardCheck },
  { title: 'Compliance & Audits', desc: 'Statutory inspections, certifications and regulatory compliance support.', icon: Shield },
  { title: 'Consultancy & Design', desc: 'Engineering design, feasibility studies and project planning.', icon: Ruler },
];

const subPageData: Record<string, { title: string; desc: string; icon: React.ElementType; capabilities: { name: string; desc: string }[]; benefits: string[] }> = {};
services.forEach(s => {
  subPageData[s.id] = {
    title: s.title,
    desc: s.desc,
    icon: s.icon,
    capabilities: s.items,
    benefits: [
      'Certified and experienced technicians',
      'Comprehensive documentation of all work',
      'Compliance with industry standards',
      'Competitive and transparent pricing',
      'Fast response and turnaround times',
      'Integration with our CMMS for full traceability',
    ],
  };
});

export function PageServices({ navigate, subPage }: PageProps) {
  // Sub-page view
  if (subPage && subPageData[subPage]) {
    const data = subPageData[subPage];
    const related = services.filter(s => s.id !== subPage).slice(0, 3);

    return (
      <>
        {/* Sub-page Hero */}
        <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
          <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
              <span style={{ color: 'rgba(247,248,243,0.4)' }}>/</span>
              <button onClick={() => navigate('services')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Services</button>
              <span style={{ color: 'rgba(247,248,243,0.4)' }}>/</span>
              <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>{data.title}</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <IconBox size="lg" style={{ background: 'var(--hm-green)' }}>
                <data.icon size={22} style={{ color: '#fff' }} />
              </IconBox>
              <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(1.8rem,4.5vw,3.2rem)', lineHeight: 1.02, letterSpacing: '-0.025em' }}>{data.title}</h1>
            </div>
            <p style={{ fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>{data.desc}</p>
          </div>
        </div>

        {/* Capabilities */}
        <ThemeSection>
          <SectionHeader label="Capabilities" title={`What's included in ${data.title.toLowerCase()}`} />
          <div className="grid md:grid-cols-2 gap-5">
            {data.capabilities.map((cap, i) => (
              <Reveal key={cap.name} delay={i * 0.06}>
                <ThemeCard className="flex items-start gap-4">
                  <IconBox size="sm" style={{ marginTop: 2 }}>
                    <Wrench size={15} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <div>
                    <DisplayHeading as="h4" className="text-base mb-1">{cap.name}</DisplayHeading>
                    <p style={{ fontSize: '0.88rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{cap.desc}</p>
                  </div>
                </ThemeCard>
              </Reveal>
            ))}
          </div>
        </ThemeSection>

        {/* Benefits */}
        <ThemeSection variant="stone">
          <SectionHeader label="Benefits" title="Why choose this service" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.benefits.map((b, i) => (
              <Reveal key={b} delay={i * 0.06}>
                <ThemeCard className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--hm-green)', flexShrink: 0 }} />
                  <p style={{ fontSize: '0.92rem', color: 'var(--hm-ink)' }}>{b}</p>
                </ThemeCard>
              </Reveal>
            ))}
          </div>
        </ThemeSection>

        {/* Related Services */}
        <ThemeSection>
          <SectionHeader label="Related" title="Explore other services" />
          <div className="grid sm:grid-cols-3 gap-5">
            {related.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.08}>
                <ThemeCard
                  className="cursor-pointer"
                  onClick={() => navigate(`services-${s.id}` as PageId)}
                >
                  <IconBox className="mb-4">
                    <s.icon size={20} style={{ color: 'var(--hm-green)' }} />
                  </IconBox>
                  <DisplayHeading className="text-base mb-2">{s.title}</DisplayHeading>
                  <p style={{ fontSize: '0.86rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>{s.desc}</p>
                  <div className="flex items-center gap-1 mt-4" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'var(--hm-green)' }}>
                    Learn more <ChevronRight size={14} />
                  </div>
                </ThemeCard>
              </Reveal>
            ))}
          </div>
        </ThemeSection>

        {/* CTA */}
        <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
          <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
            <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08 }}>Need {data.title.toLowerCase()}?</h2>
            <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>Get in touch for a tailored proposal.</p>
            <div className="flex gap-3 justify-center mt-8 flex-wrap">
              <ThemeLink variant="outline" onClick={() => navigate('contact')} style={{ color: 'var(--hm-paper)', borderColor: 'rgba(255,255,255,0.25)' }}>Contact us</ThemeLink>
              <ThemeLink variant="green" onClick={() => navigate('services')}>All services</ThemeLink>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Main Services page
  return (
    <>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Services</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '16ch' }}>
            Complete maintenance, under one contract.
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            A full range of engineering and facility services — available individually or bundled into an annual maintenance contract with guaranteed response times.
          </p>
        </div>
      </div>

      {/* Main Service Categories — 3-column capability grid */}
      <ThemeSection>
        <SectionHeader label="02 — Services" title="Our core capabilities." lede="HVAC, electrical, plumbing, mechanical and fire protection — certified teams for every discipline." />
        <div className="grid md:grid-cols-3 gap-8">
          {services.slice(0, 3).map((svc, i) => (
            <Reveal key={svc.id} delay={i * 0.08}>
              <div>
                <MonoLabel className="block mb-4">{svc.title}</MonoLabel>
                {svc.items.map((item, j) => (
                  <div
                    key={item.name}
                    className="flex gap-3 items-start py-4 cursor-pointer"
                    style={{ borderTop: j === 0 ? 'none' : '1px solid var(--hm-line-soft)', transition: '0.2s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.paddingLeft = '6px'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.paddingLeft = '0'; }}
                    onClick={() => navigate(`services-${svc.id}` as PageId)}
                  >
                    <IconBox size="sm">
                      <svc.icon size={15} style={{ color: 'var(--hm-green)' }} />
                    </IconBox>
                    <div>
                      <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 500, fontSize: '1rem', color: 'var(--hm-forest)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--hm-muted)', marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* More Services Grid */}
      <ThemeSection variant="stone">
        <SectionHeader label="03 — More Capabilities" title="Additional services." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.slice(3).map((svc, i) => (
            <Reveal key={svc.id} delay={i * 0.08}>
              <ThemeCard onClick={() => navigate(`services-${svc.id}` as PageId)}>
                <IconBox className="mb-4">
                  <svc.icon size={20} style={{ color: 'var(--hm-green)' }} />
                </IconBox>
                <DisplayHeading className="text-base mb-2">{svc.title}</DisplayHeading>
                <p style={{ fontSize: '0.86rem', color: 'var(--hm-muted)', lineHeight: 1.55, marginBottom: 12 }}>{svc.desc}</p>
                <div className="flex items-center gap-1" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'var(--hm-green)' }}>
                  View details <ChevronRight size={14} />
                </div>
              </ThemeCard>
            </Reveal>
          ))}
          {/* Extra cards */}
          {additionalServices.map((svc, i) => (
            <Reveal key={svc.title} delay={(i + 3) * 0.08}>
              <ThemeCard>
                <IconBox className="mb-4">
                  <svc.icon size={20} style={{ color: 'var(--hm-green)' }} />
                </IconBox>
                <DisplayHeading className="text-base mb-2">{svc.title}</DisplayHeading>
                <p style={{ fontSize: '0.86rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>{svc.desc}</p>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Process */}
      <ThemeSection>
        <SectionHeader label="04 — Process" title="How we work." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { step: '01', title: 'Consultation', desc: 'We assess your facility, equipment and maintenance needs.' },
            { step: '02', title: 'Proposal', desc: 'A tailored plan with scope, schedule and transparent pricing.' },
            { step: '03', title: 'Execution', desc: 'Certified teams carry out work with full documentation.' },
            { step: '04', title: 'Reporting', desc: 'Regular reports, insights and recommendations delivered.' },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 0.08}>
              <ThemeCard className="text-center">
                <div style={{ fontFamily: 'var(--hm-mono)', fontSize: '2.4rem', fontWeight: 500, color: 'var(--hm-line)', lineHeight: 1, marginBottom: 12 }}>{item.step}</div>
                <DisplayHeading className="text-base mb-2">{item.title}</DisplayHeading>
                <p style={{ fontSize: '0.86rem', color: 'var(--hm-muted)', lineHeight: 1.55 }}>{item.desc}</p>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* CTA */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08 }}>Need a tailored maintenance plan?</h2>
          <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>Get a free consultation and custom proposal for your facility.</p>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <ThemeLink variant="outline" onClick={() => navigate('contact')} style={{ color: 'var(--hm-paper)', borderColor: 'rgba(255,255,255,0.25)' }}>Contact us</ThemeLink>
            <ThemeLink variant="green" onClick={() => navigate('system')}>View our system</ThemeLink>
          </div>
        </div>
      </div>
    </>
  );
}