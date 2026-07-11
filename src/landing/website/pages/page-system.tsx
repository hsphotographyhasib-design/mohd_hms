'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode, MapPin, MessageSquare, BarChart3, Smartphone, Monitor,
  ClipboardList, FileText, Wrench, Bell, Shield, ChevronRight,
  Zap, Users, Clock, AlertCircle, CheckCircle2, ArrowRight
} from 'lucide-react';
import type { PageId } from '../public-website';
import {
  SectionHeader, ThemeSection, ThemeCard, ThemeButton, ThemeLink,
  IconBox, MonoLabel, DisplayHeading, Reveal, PlaceholderFig, Divider,
} from '../theme';

interface PageProps {
  navigate: (id: PageId) => void;
  subPage?: 'cmms' | 'portal' | 'qr' | 'reports' | 'mobile' | 'whatsapp';
}

const opsStats = [
  ['1,248', 'Active equipment'], ['34', 'Open complaints'],
  ['14,860', 'Completed work orders'], ['186', 'Active customers'],
  ['64', 'Technicians'], ['14 min', 'Median response'],
];

const barData: Array<[string, number]> = [
  ['Sep', 62], ['Oct', 74], ['Nov', 58], ['Dec', 83], ['Jan', 71], ['Feb', 92], ['Mar', 88],
];

const feedItems = [
  { text: 'Work order WO-4821 completed · Chiller plant', color: 'var(--hm-green)', time: '2m' },
  { text: 'New complaint · Lighting fault, Tower B', color: '#D69E2E', time: '6m' },
  { text: 'Technician assigned · WO-4830', color: 'var(--hm-forest)', time: '11m' },
  { text: 'PPM schedule generated · 14 assets', color: 'var(--hm-green)', time: '25m' },
  { text: 'Invoice INV-1043 issued', color: 'var(--hm-forest)', time: '40m' },
];

const digitalFeatures = [
  { title: 'QR Asset Management', desc: 'Every asset carries its record.', icon: QrCode },
  { title: 'Google Maps', desc: 'Locate & route to any site.', icon: MapPin },
  { title: 'WhatsApp Updates', desc: 'Reach clients where they read.', icon: MessageSquare },
  { title: 'Realtime Dashboard', desc: 'One live view of operations.', icon: BarChart3 },
  { title: 'Mobile Technician App', desc: 'Field work, offline-ready.', icon: Smartphone },
  { title: 'Client Self-Service', desc: 'One app for every client request.', icon: Monitor },
  { title: 'PPM Scheduling', desc: 'Automated preventive plans.', icon: ClipboardList },
  { title: 'Analytics & Reports', desc: 'Insight on cost & uptime.', icon: FileText },
];

const systemFeatures = [
  { title: 'Work Order Management', desc: 'Create, assign, track and close work orders with full audit trails and SLA tracking.', icon: ClipboardList },
  { title: 'Complaint Tracking', desc: 'Log, prioritize and resolve client complaints with automated escalation rules.', icon: AlertCircle },
  { title: 'Equipment Lifecycle', desc: 'Track every asset from installation through maintenance to replacement.', icon: Wrench },
  { title: 'Preventive Maintenance', desc: 'Automated PPM schedules based on manufacturer guidelines and usage patterns.', icon: Clock },
  { title: 'Client Portal', desc: 'Self-service portal for clients to raise requests, view invoices and track progress.', icon: Monitor },
  { title: 'QR Code Integration', desc: 'Scan any equipment QR code to instantly view its full history and status.', icon: QrCode },
];

const portalFeatures = [
  'Complaint submission', 'Equipment QR scan', 'Service requests',
  'Invoice viewing', 'Service history', 'Equipment tracking',
  'Work order tracking', 'Notifications',
];

const subPageData: Record<string, {
  title: string; desc: string; icon: React.ElementType;
  capabilities: { name: string; desc: string }[];
  benefits: string[];
}> = {
  cmms: {
    title: 'CMMS Platform', icon: Monitor,
    desc: 'Our Computerized Maintenance Management System is the backbone of every service we deliver. It connects technicians, clients and management in one unified platform.',
    capabilities: [
      { name: 'Work Order Management', desc: 'Full lifecycle tracking from creation to completion with SLA monitoring.' },
      { name: 'Asset Registry', desc: 'Comprehensive equipment database with maintenance history and documents.' },
      { name: 'Preventive Maintenance', desc: 'Automated scheduling based on time, meter readings or condition triggers.' },
      { name: 'Inventory Management', desc: 'Track spare parts, stock levels and purchase orders.' },
      { name: 'Team Management', desc: 'Assign work by skill, location and availability. Track time and productivity.' },
      { name: 'Reporting & Analytics', desc: 'Real-time dashboards, cost analysis and compliance reports.' },
    ],
    benefits: ['Paperless operations', 'Real-time visibility', 'Data-driven decisions', 'Compliance automation', 'Cost reduction', 'Improved SLA performance'],
  },
  portal: {
    title: 'Client Portal', icon: Monitor,
    desc: 'A dedicated self-service portal that gives clients full visibility into their maintenance operations, anytime and from any device.',
    capabilities: [
      { name: 'Complaint Submission', desc: 'Raise and track maintenance requests with photos and descriptions.' },
      { name: 'Invoice Management', desc: 'View, download and track all invoices and payment history.' },
      { name: 'Service History', desc: 'Complete audit trail of every maintenance activity on every asset.' },
      { name: 'Real-time Tracking', desc: 'See technician assignments, ETA and live work order status.' },
    ],
    benefits: ['24/7 access', 'Full transparency', 'Faster communication', 'Reduced phone calls', 'Document storage', 'Multi-user access'],
  },
  qr: {
    title: 'QR Asset Management', icon: QrCode,
    desc: 'Every piece of equipment gets a unique QR code. One scan reveals its full identity, maintenance history, manuals and current status.',
    capabilities: [
      { name: 'Instant Identification', desc: 'Scan any QR code to pull up the complete asset profile.' },
      { name: 'Maintenance History', desc: 'Every work order, inspection and repair linked to the asset.' },
      { name: 'Service Requests', desc: 'Raise a service request directly from the QR scan screen.' },
      { name: 'Document Storage', desc: 'Manuals, certificates, warranties — all attached to the asset.' },
    ],
    benefits: ['Instant access to asset data', 'Reduced manual lookups', 'Better record keeping', 'Field-ready offline mode', 'Photo documentation', 'Audit trail'],
  },
  reports: {
    title: 'Reports & Analytics', icon: BarChart3,
    desc: 'Turn maintenance data into actionable insights. Our analytics engine provides real-time dashboards and detailed reports for informed decision-making.',
    capabilities: [
      { name: 'Operational Dashboards', desc: 'Live overview of work orders, complaints, equipment health and team performance.' },
      { name: 'Cost Analysis', desc: 'Track maintenance spend by asset, category, site and period.' },
      { name: 'SLA Reports', desc: 'Monitor response times, completion rates and compliance metrics.' },
      { name: 'Compliance Reports', desc: 'Automated generation of statutory inspection and certification reports.' },
    ],
    benefits: ['Data-driven decisions', 'Cost optimization', 'SLA monitoring', 'Compliance tracking', 'Trend identification', 'Executive summaries'],
  },
  whatsapp: {
    title: 'WhatsApp AI', icon: MessageSquare,
    desc: 'Our AI-powered WhatsApp integration lets clients report issues, track requests and receive updates — all through the messaging app they already use every day.',
    capabilities: [
      { name: 'Natural Language Complaints', desc: 'Describe your issue in plain language. Our AI understands context and routes it to the right team.' },
      { name: 'Status Tracking', desc: 'Send a quick message to get real-time updates on any open complaint or work order.' },
      { name: 'Automated Notifications', desc: 'Receive proactive alerts when technicians are dispatched, work is completed or invoices are ready.' },
      { name: 'Multi-language Support', desc: 'Communicate in English or Malay — our AI handles both seamlessly.' },
    ],
    benefits: ['No app installation needed', 'Instant communication', '24/7 availability', 'Reduced response time', 'Faster issue resolution', 'Familiar interface'],
  },
  mobile: {
    title: 'Mobile App', icon: Smartphone,
    desc: 'Our mobile application empowers field technicians and clients alike — with offline capability for areas with limited connectivity.',
    capabilities: [
      { name: 'Offline-capable', desc: 'Continue working without internet. Data syncs when connectivity returns.' },
      { name: 'Photo Capture', desc: 'Document work with timestamped photos directly from the job site.' },
      { name: 'Digital Sign-off', desc: 'Clients can sign off on completed work directly from their phone.' },
      { name: 'Push Notifications', desc: 'Real-time alerts for new assignments, escalations and updates.' },
    ],
    benefits: ['Works offline', 'Reduced paperwork', 'Faster turnaround', 'Better documentation', 'Real-time updates', 'User-friendly interface'],
  },
};

export function PageSystem({ navigate, subPage }: PageProps) {
  // Sub-page view
  if (subPage && subPageData[subPage]) {
    const data = subPageData[subPage];
    const relatedKeys = Object.keys(subPageData).filter(k => k !== subPage).slice(0, 3);

    return (
      <>
        <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
          <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
              <span style={{ color: 'rgba(247,248,243,0.4)' }}>/</span>
              <button onClick={() => navigate('system')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>System</button>
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

        <ThemeSection>
          <SectionHeader label="Capabilities" title={`What ${data.title.toLowerCase()} includes`} />
          <div className="grid md:grid-cols-2 gap-5">
            {data.capabilities.map((cap, i) => (
              <Reveal key={cap.name} delay={i * 0.06}>
                <ThemeCard className="flex items-start gap-4">
                  <IconBox size="sm" style={{ marginTop: 2 }}><Wrench size={15} style={{ color: 'var(--hm-green)' }} /></IconBox>
                  <div>
                    <DisplayHeading as="h4" className="text-base mb-1">{cap.name}</DisplayHeading>
                    <p style={{ fontSize: '0.88rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{cap.desc}</p>
                  </div>
                </ThemeCard>
              </Reveal>
            ))}
          </div>
        </ThemeSection>

        <ThemeSection variant="stone">
          <SectionHeader label="Benefits" title="Key benefits" />
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

        <ThemeSection>
          <SectionHeader label="Related" title="Explore other system features" />
          <div className="grid sm:grid-cols-3 gap-5">
            {relatedKeys.map((key, i) => {
              const r = subPageData[key];
              return (
                <Reveal key={key} delay={i * 0.08}>
                  <ThemeCard className="cursor-pointer" onClick={() => navigate(`system-${key}` as PageId)}>
                    <IconBox className="mb-4"><r.icon size={20} style={{ color: 'var(--hm-green)' }} /></IconBox>
                    <DisplayHeading className="text-base mb-2">{r.title}</DisplayHeading>
                    <div className="flex items-center gap-1 mt-3" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'var(--hm-green)' }}>
                      Learn more <ChevronRight size={14} />
                    </div>
                  </ThemeCard>
                </Reveal>
              );
            })}
          </div>
        </ThemeSection>

        <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
          <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
            <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08 }}>Want to see it in action?</h2>
            <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>Request a demo of our maintenance management system.</p>
            <div className="flex gap-3 justify-center mt-8 flex-wrap">
              <ThemeLink variant="outline" onClick={() => navigate('contact')} style={{ color: 'var(--hm-paper)', borderColor: 'rgba(255,255,255,0.25)' }}>Contact us</ThemeLink>
              <ThemeLink variant="green" onClick={() => navigate('system')}>All features</ThemeLink>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Main System page
  return (
    <>
      {/* Hero */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>System</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Maintenance Management System
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            Real-time visibility on every facility. Our CMMS connects teams, assets and clients.
          </p>
        </div>
      </div>

      {/* Operations Overview — Forest bg */}
      <ThemeSection variant="forest">
        <SectionHeader label="04 — System overview" title="Real-time visibility on every facility." light lede="Our maintenance management system gives clients and teams one live view of equipment, complaints and work orders." />
        <Reveal>
          <div
            style={{
              background: 'var(--hm-forest-3)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--hm-r-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontFamily: 'var(--hm-disp)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--hm-paper)' }}>Operations overview</span>
              <span className="flex items-center gap-2" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--hm-green-bright)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--hm-green)', animation: 'pulse 2.2s infinite' }} />
                Live
              </span>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {opsStats.map(([n, l]) => (
                <div key={l} className="py-5 px-5" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.7rem', color: 'var(--hm-paper)', lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(247,248,243,0.6)', marginTop: 7 }}>{l}</div>
                </div>
              ))}
            </div>
            {/* Lower half: Chart + Feed */}
            <div className="grid lg:grid-cols-2">
              <div className="p-6" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,248,243,0.4)', marginBottom: 18 }}>Work orders completed · last 7 months</div>
                <div className="flex items-end gap-3" style={{ height: 140 }}>
                  {barData.map(([m, v]) => (
                    <div key={m} className="flex-1 flex flex-col items-center gap-2">
                      <div style={{ width: '100%', borderRadius: '5px 5px 0 0', background: 'var(--hm-green)', height: `${Math.round((v / 100) * 120)}px`, opacity: 0.9 }} />
                      <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.62rem', color: 'rgba(247,248,243,0.4)' }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <div style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,248,243,0.4)', marginBottom: 8 }}>Recent activity</div>
                {feedItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-3" style={{ borderBottom: i < feedItems.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', fontSize: '0.87rem', color: 'var(--hm-paper)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span className="flex-1">{item.text}</span>
                    <small style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.66rem', color: 'rgba(247,248,243,0.4)' }}>{item.time}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <p style={{ marginTop: 16, fontSize: '0.78rem', color: 'rgba(247,248,243,0.4)' }}>
          Figures are representative. Connect to the maintenance system API for live data.
        </p>
        {/* Pulse animation */}
        <style>{`@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(30,122,75,.4)}70%{box-shadow:0 0 0 7px rgba(30,122,75,0)}100%{box-shadow:0 0 0 0 rgba(30,122,75,0)}}`}</style>
      </ThemeSection>

      {/* Digital Capabilities */}
      <ThemeSection variant="stone">
        <SectionHeader label="08 — Technology" title="Engineering, backed by smart software." lede="A digital layer over every service keeps work transparent, scheduled and measurable." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {digitalFeatures.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <ThemeCard
                className="cursor-pointer"
                onClick={() => {
                  const keyMap: Record<string, string> = {
                    'QR Asset Management': 'qr', 'Client Self-Service': 'portal',
                    'Analytics & Reports': 'reports', 'Mobile Technician App': 'mobile',
                  };
                  if (keyMap[f.title]) navigate(`system-${keyMap[f.title]}` as PageId);
                }}
              >
                <IconBox className="mb-4"><f.icon size={20} style={{ color: 'var(--hm-green)' }} /></IconBox>
                <DisplayHeading className="text-base mb-2">{f.title}</DisplayHeading>
                <p style={{ fontSize: '0.86rem', color: 'var(--hm-muted)', lineHeight: 1.5 }}>{f.desc}</p>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* System Features */}
      <ThemeSection>
        <SectionHeader label="Features" title="System features." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {systemFeatures.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <ThemeCard>
                <IconBox size="lg" className="mb-4"><f.icon size={22} style={{ color: 'var(--hm-green)' }} /></IconBox>
                <DisplayHeading className="text-base mb-2">{f.title}</DisplayHeading>
                <p style={{ fontSize: '0.88rem', color: 'var(--hm-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </ThemeCard>
            </Reveal>
          ))}
        </div>
      </ThemeSection>

      {/* Client Portal */}
      <ThemeSection variant="stone">
        <SectionHeader label="07 — Self-service" title="Client self-service portal." />
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <p style={{ color: 'var(--hm-muted)', maxWidth: '48ch', marginBottom: 28, fontSize: '1.02rem' }}>
              Clients log in to raise complaints, scan equipment, track work and view their full service history — anytime, from any device.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {portalFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <IconBox size="sm"><CheckCircle2 size={15} style={{ color: 'var(--hm-green)' }} /></IconBox>
                  <span style={{ fontSize: '0.9rem', color: 'var(--hm-ink)', fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            {/* Mock device frame */}
            <div style={{ background: 'var(--hm-forest)', borderRadius: 32, padding: '14px 14px 50px 14px', maxWidth: 320, margin: '0 auto' }}>
              <div style={{ background: 'var(--hm-paper-2)', borderRadius: 22, overflow: 'hidden' }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--hm-line)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--hm-stone)' }} />
                  <span style={{ fontFamily: 'var(--hm-body)', fontSize: '0.86rem', fontWeight: 600, color: 'var(--hm-forest)' }}>Client app</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="p-3" style={{ background: 'var(--hm-stone)', borderRadius: 'var(--hm-r-sm)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--hm-faint)' }}>Open requests</div>
                    <div style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.2rem', color: 'var(--hm-forest)' }}>3 active</div>
                  </div>
                  <div className="p-3" style={{ border: '1px solid var(--hm-line)', borderRadius: 'var(--hm-r-sm)' }}>
                    <div style={{ fontFamily: 'var(--hm-body)', fontWeight: 500, fontSize: '0.82rem', color: 'var(--hm-forest)' }}>Complaint #2294 · Chiller</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--hm-faint)', marginTop: 2 }}>Technician en route · ETA 12 min</div>
                  </div>
                  <div className="p-3" style={{ border: '1px solid var(--hm-line)', borderRadius: 'var(--hm-r-sm)' }}>
                    <div style={{ fontFamily: 'var(--hm-body)', fontWeight: 500, fontSize: '0.82rem', color: 'var(--hm-forest)' }}>Scan equipment QR</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--hm-faint)', marginTop: 2 }}>Pull asset history instantly</div>
                  </div>
                  <div className="p-3" style={{ border: '1px solid var(--hm-line)', borderRadius: 'var(--hm-r-sm)' }}>
                    <div style={{ fontFamily: 'var(--hm-body)', fontWeight: 500, fontSize: '0.82rem', color: 'var(--hm-forest)' }}>Latest invoice · INV-1043</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--hm-faint)', marginTop: 2 }}>Ready to view</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </ThemeSection>

      {/* CTA */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08 }}>Want to see the system in action?</h2>
          <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>Request a demo and we&apos;ll walk you through every feature.</p>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <ThemeLink variant="outline" onClick={() => navigate('contact')} style={{ color: 'var(--hm-paper)', borderColor: 'rgba(255,255,255,0.25)' }}>Request a demo</ThemeLink>
            <ThemeLink variant="green" onClick={() => navigate('services')}>Our services</ThemeLink>
          </div>
        </div>
      </div>
    </>
  );
}