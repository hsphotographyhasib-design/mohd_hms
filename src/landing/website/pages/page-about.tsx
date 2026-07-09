'use client';

import React from 'react';
import { Shield, Award, Users, Clock, Building2, Target, Eye, Heart } from 'lucide-react';
import type { PageId } from '../public-website';
import {
  SectionHeader, ThemeSection, ThemeCard, ThemeButton, ThemeLink,
  IconBox, MonoLabel, DisplayHeading, Reveal, PlaceholderFig, Divider,
} from '../theme';

interface PageProps { navigate: (id: PageId) => void; }

const team = [
  { name: 'Eng. Hafiz Rahman', role: 'Managing Director', bio: '15+ years in building services and facility engineering across Southeast Asia.', img: '/images/team-hafiz.jpg' },
  { name: 'Sarah Lim', role: 'Operations Manager', bio: 'Leads field teams & SLA delivery. Expert in multi-site maintenance coordination.', img: '/images/team-sarah.jpg' },
  { name: 'Daniel Wong', role: 'Senior HVAC Supervisor', bio: 'Chiller plant & BMS specialist with 12 years of hands-on experience.', img: '/images/team-daniel.jpg' },
  { name: 'Aina Yusof', role: 'Customer Support Lead', bio: 'Single point of contact for all clients. Ensures rapid response and satisfaction.', img: '/images/team-aina.jpg' },
];

const whyUs = [
  { title: 'Certified Teams', desc: 'All technicians hold valid trade certifications and undergo regular training.', icon: Award },
  { title: '24/7 Emergency', desc: 'Round-the-clock breakdown response with guaranteed arrival times.', icon: Clock },
  { title: 'Transparent Reporting', desc: 'Every job documented through our CMMS — full visibility for clients.', icon: Target },
  { title: '15+ Years', desc: 'Deep experience across commercial, industrial, healthcare and government sectors.', icon: Building2 },
  { title: 'HSE Compliant', desc: 'Safety-first culture with proper PPE, risk assessments and protocols.', icon: Shield },
  { title: 'Dedicated Management', desc: 'Assigned account managers for every contract — personal and responsive.', icon: Users },
];

export function PageAbout({ navigate }: PageProps) {
  return (
    <>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('home')}
              className="bg-transparent border-0 cursor-pointer p-0"
              style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}
            >Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>About</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            About MOHD.HMS ENTERPRISE
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            A multi-disciplinary engineering and maintenance company serving Brunei Darussalam and the region.
          </p>
        </div>
      </div>

      {/* Company Overview */}
      <ThemeSection>
        <SectionHeader label="01 — About Us" title="A maintenance partner built on accountability." />
        <div className="grid lg:grid-cols-2 gap-16 items-center" style={{ marginTop: 20 }}>
          <Reveal>
            <div style={{ position: 'relative' }}>
              <PlaceholderFig aspect="4/3" label="Our team" className="rounded-[var(--hm-r-lg)]" src="/images/about.jpg" />
              <div
                style={{
                  position: 'absolute', right: -18, bottom: -20,
                  background: 'var(--hm-forest)', color: 'var(--hm-paper)',
                  borderRadius: 'var(--hm-r)', padding: '18px 22px',
                  boxShadow: '0 24px 50px -26px rgba(11,40,29,0.6)',
                }}
              >
                <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '2rem', lineHeight: 1 }}>500+</div>
                <div style={{ fontSize: '0.76rem', color: 'rgba(247,248,243,0.7)', marginTop: 5 }}>Projects delivered</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 500, fontSize: '1.16rem', color: 'var(--hm-ink)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              We are a multi-disciplinary engineering and maintenance company serving commercial, industrial, healthcare and government facilities.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 16, lineHeight: 1.7 }}>
              From routine preventive maintenance to emergency breakdowns, our certified technicians respond fast and document every job through our maintenance management system — so clients always know exactly what was done, when, and by whom.
            </p>
            <p style={{ color: 'var(--hm-muted)', marginTop: 12, lineHeight: 1.7 }}>
              Founded in Bandar Seri Begawan, Brunei Darussalam, MOHD.HMS ENTERPRISE has grown from a small HVAC specialist into a full-service facility maintenance provider with capabilities spanning HVAC, electrical, plumbing, mechanical systems, and fire protection.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10 pt-8" style={{ borderTop: '1px solid var(--hm-line)' }}>
              {[
                ['500+', 'Projects'],
                ['186', 'Clients'],
                ['64', 'Technicians'],
                ['15+', 'Years'],
              ].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.6rem', color: 'var(--hm-forest)', lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--hm-faint)', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </ThemeSection>

      {/* Mission, Vision, Values */}
      <ThemeSection variant="stone">
        <SectionHeader label="02 — Our Foundation" title="Mission, Vision & Values" />
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { title: 'Mission', desc: 'To deliver reliable, safe and efficient maintenance that protects our clients\' assets and uptime.', icon: Target },
            { title: 'Vision', desc: 'To be the region\'s most trusted facility maintenance and engineering partner.', icon: Eye },
            { title: 'Values', desc: 'Safety first. Integrity, craftsmanship, responsiveness and continuous improvement in everything we do.', icon: Heart },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <ThemeCard large>
                <div className="flex items-start gap-4">
                  <IconBox size="lg" style={{ background: item.title === 'Values' ? 'var(--hm-forest)' : 'var(--hm-stone)' }}>
                    <item.icon size={20} style={{ color: item.title === 'Values' ? 'var(--hm-paper)' : 'var(--hm-green)' }} />
                  </IconBox>
                  <div>
                    <DisplayHeading className="text-lg mb-2">{item.title}</DisplayHeading>
                    <p style={{ fontSize: '0.92rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Why Choose Us */}
      <ThemeSection>
        <SectionHeader label="03 — Why Us" title="Why partner with us." lede="Our clients choose us for accountability, speed and expertise." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {whyUs.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06}>
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
      </ThemeSection>

      {/* Team */}
      <ThemeSection variant="stone">
        <SectionHeader label="04 — Team" title="Leadership team" lede="Management, supervisors, technicians and support — working as one accountable team." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {team.map((m, i) => (
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

      {/* CTA */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            Ready to work with us?
          </h2>
          <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>
            Let&apos;s discuss how our team can support your facility maintenance needs.
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
    </>
  );
}