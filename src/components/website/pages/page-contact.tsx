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
  MapPin,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  Send,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';

interface PageProps {
  navigate: (id: PageId) => void;
}

/* ───────────────────────────────────────────────────────────
   Inline form input style helpers
   ─────────────────────────────────────────────────────────── */
const inputBase: React.CSSProperties = {
  fontFamily: 'var(--hm-body)',
  fontSize: '0.92rem',
  lineHeight: 1.5,
  width: '100%',
  padding: '0.72rem 0.9rem',
  borderRadius: 'var(--hm-r-sm)',
  border: '1px solid var(--hm-line)',
  background: 'var(--hm-paper-2)',
  color: 'var(--hm-ink)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
};

const inputFocus: React.CSSProperties = {
  borderColor: 'var(--hm-green)',
  boxShadow: '0 0 0 3px rgba(30,122,75,0.10)',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--hm-body)',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--hm-ink)',
  marginBottom: 6,
  display: 'block',
};

const selectStyle: React.CSSProperties = {
  ...inputBase,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23566359' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 0.8rem center',
  paddingRight: '2.2rem',
};

/* ───────────────────────────────────────────────────────────
   Focus handler for inputs
   ─────────────────────────────────────────────────────────── */
function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  const el = e.currentTarget;
  el.style.borderColor = 'var(--hm-green)';
  el.style.boxShadow = '0 0 0 3px rgba(30,122,75,0.10)';
}

function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  const el = e.currentTarget;
  el.style.borderColor = 'var(--hm-line)';
  el.style.boxShadow = 'none';
}

/* ───────────────────────────────────────────────────────────
   Service options
   ─────────────────────────────────────────────────────────── */
const SERVICE_OPTIONS = [
  { value: '', label: 'Select a service…' },
  { value: 'hvac', label: 'HVAC maintenance' },
  { value: 'electrical', label: 'Electrical maintenance' },
  { value: 'plumbing', label: 'Plumbing / mechanical' },
  { value: 'fire', label: 'Fire protection' },
  { value: 'amc', label: 'Annual maintenance contract' },
  { value: 'emergency', label: 'Emergency breakdown' },
  { value: 'other', label: 'Other' },
];

/* ═══════════════════════════════════════════════════════════
   PAGE CONTACT
   ═══════════════════════════════════════════════════════════ */
export function PageContact({ navigate }: PageProps) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  /* ───── Hero Banner ───── */
  const heroSection = (
    <ThemeSection variant="forest" className="!py-14 md:!py-20">
      {/* Breadcrumb */}
      <Reveal delay={0}>
        <button
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-1.5 mb-6 cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <span
            style={{
              fontFamily: 'var(--hm-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(247,248,243,0.5)',
            }}
          >
            Home
          </span>
          <ChevronRight size={12} color="rgba(247,248,243,0.35)" />
          <span
            style={{
              fontFamily: 'var(--hm-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(247,248,243,0.85)',
            }}
          >
            Contact
          </span>
        </button>
      </Reveal>

      <Reveal delay={0.1}>
        <h1
          style={{
            fontFamily: 'var(--hm-disp)',
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            fontSize: 'clamp(2rem, 4.8vw, 3.6rem)',
            color: 'var(--hm-paper)',
            maxWidth: '18ch',
          }}
        >
          Talk To Our Maintenance Team
        </h1>
      </Reveal>

      <Reveal delay={0.2}>
        <p
          className="mt-4 max-w-[52ch]"
          style={{
            fontFamily: 'var(--hm-body)',
            fontSize: '1.08rem',
            lineHeight: 1.62,
            color: 'rgba(247,248,243,0.68)',
          }}
        >
          Reach out for service enquiries, contracts or emergency support — we
          respond fast.
        </p>
      </Reveal>
    </ThemeSection>
  );

  /* ───── Contact Info + Form ───── */
  const contactFormSection = (
    <ThemeSection variant="default">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* ── Left Column: Contact Information ── */}
        <Reveal delay={0}>
          <div>
            <ThemeCard hover={false} className="mb-6">
              <MonoLabel className="mb-5 block">Contact information</MonoLabel>

              {/* Office */}
              <div className="flex items-start gap-3.5 mb-5">
                <IconBox size="sm">
                  <MapPin size={15} color="var(--hm-green)" />
                </IconBox>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    Office
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontSize: '0.85rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    Unit 5, Industrial Avenue, Bandar Seri Begawan, Brunei
                    Darussalam
                  </div>
                </div>
              </div>

              <Divider />

              {/* Phone & WhatsApp */}
              <div className="flex items-start gap-3.5 mb-5 mt-5">
                <IconBox size="sm">
                  <Phone size={15} color="var(--hm-green)" />
                </IconBox>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    Phone &amp; WhatsApp
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontSize: '0.85rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    +673 000 0000 · WhatsApp chat
                  </div>
                </div>
              </div>

              <Divider />

              {/* Email */}
              <div className="flex items-start gap-3.5 mb-5 mt-5">
                <IconBox size="sm">
                  <Mail size={15} color="var(--hm-green)" />
                </IconBox>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    Email
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.85rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    info@mohdhms.com
                  </div>
                </div>
              </div>

              <Divider />

              {/* Working Hours */}
              <div className="flex items-start gap-3.5 mb-5 mt-5">
                <IconBox size="sm">
                  <Clock size={15} color="var(--hm-green)" />
                </IconBox>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--hm-ink)',
                    }}
                  >
                    Working hours
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontSize: '0.85rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    Monday – Saturday · 8:00am – 6:00pm
                  </div>
                </div>
              </div>

              <Divider />

              {/* 24/7 Emergency Line */}
              <div
                className="flex items-start gap-3.5 mt-5"
                style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 'var(--hm-r-sm)',
                  padding: '14px 14px',
                  marginLeft: '-22px',
                  marginRight: '-22px',
                  marginBottom: '-24px',
                  borderBottomLeftRadius: 'var(--hm-r)',
                  borderBottomRightRadius: 'var(--hm-r)',
                  width: 'calc(100% + 44px)',
                }}
              >
                <IconBox
                  size="sm"
                  style={{ background: 'rgba(245,158,11,0.15)' }}
                >
                  <AlertTriangle size={15} color="#D97706" />
                </IconBox>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: '#92400E',
                    }}
                  >
                    24/7 Emergency line
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.85rem',
                      color: '#B45309',
                      lineHeight: 1.5,
                    }}
                  >
                    +673 999 9999 — breakdowns &amp; critical faults
                  </div>
                </div>
              </div>
            </ThemeCard>

            {/* Map Placeholder */}
            <div
              style={{
                aspectRatio: '4/2',
                borderRadius: 'var(--hm-r)',
                border: '1px solid var(--hm-line)',
                background: 'var(--hm-stone)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--hm-muted)',
                }}
              >
                <MapPin size={28} strokeWidth={1.5} />
                <span
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.78rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Map
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Right Column: Contact Form ── */}
        <Reveal delay={0.15}>
          <div>
            <h3
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                fontSize: '1.5rem',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: 'var(--hm-forest)',
                marginBottom: 6,
              }}
            >
              Send us a message
            </h3>
            <p
              className="mb-8"
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.95rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.6,
                maxWidth: '42ch',
              }}
            >
              Tell us what you need and our team will respond within one business
              day.
            </p>

            {submitted ? (
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  minHeight: 280,
                  borderRadius: 'var(--hm-r)',
                  border: '1px solid var(--hm-line)',
                  background: 'var(--hm-stone)',
                }}
              >
                <div className="text-center px-6">
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'var(--hm-green)',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 600,
                      fontSize: '1.15rem',
                      color: 'var(--hm-forest)',
                      marginBottom: 6,
                    }}
                  >
                    Thanks — your message has been sent.
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontSize: '0.9rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    We&apos;ll get back to you within one business day.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Name + Phone row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label style={labelStyle}>
                      Full name <span style={{ color: 'var(--hm-green)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your full name"
                      style={inputBase}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="+673 000 0000"
                      style={inputBase}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label style={labelStyle}>
                    Email <span style={{ color: 'var(--hm-green)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@company.com"
                    style={inputBase}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                {/* Service dropdown */}
                <div className="mb-4">
                  <label style={labelStyle}>Service needed</label>
                  <select
                    value={form.service}
                    onChange={(e) => update('service', e.target.value)}
                    style={selectStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  >
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label style={labelStyle}>Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder="Tell us about your requirements…"
                    rows={5}
                    style={{
                      ...inputBase,
                      resize: 'vertical' as const,
                      minHeight: 120,
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                {/* Submit */}
                <ThemeButton variant="fill" className="w-full sm:w-auto">
                  <Send size={16} />
                  Send message
                </ThemeButton>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </ThemeSection>
  );

  /* ───── Emergency Section ───── */
  const emergencySection = (
    <ThemeSection variant="stone">
      <div className="max-w-2xl mx-auto text-center">
        <SectionHeader
          label="Emergency support"
          title="Emergency breakdown?"
          light={false}
        />
        <Reveal delay={0.1}>
          <p
            className="mb-3"
            style={{
              fontFamily: 'var(--hm-body)',
              fontSize: '1.12rem',
              color: 'var(--hm-muted)',
              lineHeight: 1.6,
            }}
          >
            Call our 24/7 emergency line
          </p>
          <div
            className="mb-8"
            style={{
              fontFamily: 'var(--hm-disp)',
              fontWeight: 700,
              fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
              letterSpacing: '-0.01em',
              color: 'var(--hm-forest)',
              lineHeight: 1.15,
            }}
          >
            +673 999 9999
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <ThemeButton variant="green">
              <Phone size={16} />
              Call now
            </ThemeButton>
            <ThemeButton variant="outline">
              <MessageCircle size={16} />
              WhatsApp
            </ThemeButton>
          </div>
        </Reveal>
      </div>
    </ThemeSection>
  );

  return (
    <PageWrapper>
      {heroSection}
      {contactFormSection}
      {emergencySection}
    </PageWrapper>
  );
}