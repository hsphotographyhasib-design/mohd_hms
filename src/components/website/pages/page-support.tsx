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
  Reveal,
  Divider,
  PageWrapper,
} from '../theme';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Search,
  TicketCheck,
  BookOpen,
  HelpCircle,
  Download,
  Send,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface PageProps {
  navigate: (id: PageId) => void;
}

/* ───────────────────────────────────────────────────────────
   Inline form style helpers
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

const selectStyle: React.CSSProperties = {
  ...inputBase,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23566359' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 0.8rem center',
  paddingRight: '2.2rem',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--hm-body)',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--hm-ink)',
  marginBottom: 6,
  display: 'block',
};

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
   Subject options for the contact form
   ─────────────────────────────────────────────────────────── */
const SUBJECT_OPTIONS = [
  { value: '', label: 'Select a subject…' },
  { value: 'service-request', label: 'Service request' },
  { value: 'complaint', label: 'File a complaint' },
  { value: 'billing', label: 'Billing enquiry' },
  { value: 'quotation', label: 'Request a quotation' },
  { value: 'equipment', label: 'Equipment support' },
  { value: 'other', label: 'Other' },
];

/* ═══════════════════════════════════════════════════════════
   PAGE SUPPORT
   ═══════════════════════════════════════════════════════════ */
export function PageSupport({ navigate }: PageProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
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
        <Reveal delay={0}>
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
              Support Center
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
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
            Support Center
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p
            style={{
              marginTop: 16,
              fontSize: '1.08rem',
              color: 'rgba(247,248,243,0.7)',
              maxWidth: '55ch',
            }}
          >
            We&apos;re here to help. Choose the best way to reach us and
            we&apos;ll get you the support you need quickly.
          </p>
        </Reveal>
      </div>
    </div>
  );

  /* ───── Quick Actions ───── */
  const quickActions = (
    <ThemeSection variant="default">
      <Reveal delay={0}>
        <SectionHeader
          label="Quick Actions"
          title="How can we help?"
          lede="Choose the option that best matches your needs to get started right away."
        />
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Submit a Ticket */}
        <Reveal delay={0.05}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const el = document.getElementById('contact-form-section');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const el = document.getElementById('contact-form-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
          <ThemeCard>
            <div className="flex items-start gap-4 mb-4">
              <IconBox size="md">
                <TicketCheck size={20} color="var(--hm-green)" />
              </IconBox>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    color: 'var(--hm-ink)',
                    lineHeight: 1.25,
                  }}
                >
                  Submit a Ticket
                </h3>
              </div>
            </div>
            <p
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.88rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              Report an issue or request a service. Our team will review and
              respond within 15 minutes during business hours.
            </p>
            <div
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--hm-green)',
              }}
            >
              Open form
              <ArrowRight size={12} />
            </div>
          </ThemeCard>
          </div>
        </Reveal>

        {/* Track Ticket */}
        <Reveal delay={0.1}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('login')}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('login'); }}
          >
          <ThemeCard>
            <div className="flex items-start gap-4 mb-4">
              <IconBox size="md">
                <Search size={20} color="var(--hm-green)" />
              </IconBox>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    color: 'var(--hm-ink)',
                    lineHeight: 1.25,
                  }}
                >
                  Track Ticket
                </h3>
              </div>
            </div>
            <p
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.88rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              Check the status of your existing request. View real-time updates,
              assigned technician, and resolution timeline.
            </p>
            <div
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--hm-green)',
              }}
            >
              Login to portal
              <ArrowRight size={12} />
            </div>
          </ThemeCard>
          </div>
        </Reveal>

        {/* Emergency Call */}
        <Reveal delay={0.15}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              window.open('tel:+6739999999', '_self');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') window.open('tel:+6739999999', '_self');
            }}
            style={{
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--hm-r)',
              overflow: 'hidden',
            }}
          >
          <ThemeCard hover={true}>
            <div className="flex items-start gap-4 mb-4">
              <IconBox
                size="md"
              >
                <Phone size={20} color="#D97706" />
              </IconBox>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    color: 'var(--hm-ink)',
                    lineHeight: 1.25,
                  }}
                >
                  Emergency? Call Now
                </h3>
              </div>
            </div>
            <p
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.88rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              24/7 emergency breakdown service. For critical faults, system
              failures, and safety hazards — we respond within 30 minutes.
            </p>
            <div
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 700,
                fontSize: '1.3rem',
                color: '#92400E',
                letterSpacing: '-0.01em',
              }}
            >
              +673 999 9999
            </div>
          </ThemeCard>
          </div>
        </Reveal>
      </div>
    </ThemeSection>
  );

  /* ───── Contact Methods + Form ───── */
  const contactSection = (
    <div id="contact-form-section">
    <ThemeSection variant="stone">
      <Reveal delay={0}>
        <SectionHeader
          label="Get in Touch"
          title="Contact us directly"
          lede="Prefer to speak with someone? Reach out through any of the channels below, or fill in the quick contact form."
        />
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* ── Left: Contact Details ── */}
        <Reveal delay={0}>
          <ThemeCard hover={false}>
            <MonoLabel className="mb-6 block">Contact details</MonoLabel>

            {/* Phone */}
            <div className="flex items-start gap-3.5 mb-5">
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
                  Phone
                </div>
                <div
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.85rem',
                    color: 'var(--hm-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  +673 000 0000
                </div>
              </div>
            </div>

            <Divider />

            {/* Emergency */}
            <div className="flex items-start gap-3.5 mb-5 mt-5">
              <IconBox size="sm">
                <Phone size={15} color="#D97706" />
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
                  Emergency (24/7)
                </div>
                <div
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.85rem',
                    color: '#B45309',
                    lineHeight: 1.5,
                  }}
                >
                  +673 999 9999
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

            {/* WhatsApp */}
            <div className="flex items-start gap-3.5 mb-5 mt-5">
              <IconBox size="sm">
                <MessageSquare size={15} color="var(--hm-green)" />
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
                  WhatsApp
                </div>
                <div
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.85rem',
                    color: 'var(--hm-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  +673 000 0000
                </div>
              </div>
            </div>

            <Divider />

            {/* Office Hours */}
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
                  Office Hours
                </div>
                <div
                  style={{
                    fontFamily: 'var(--hm-body)',
                    fontSize: '0.85rem',
                    color: 'var(--hm-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Mon – Fri: 8:00 AM – 5:00 PM
                  <br />
                  Sat: 8:00 AM – 12:00 PM
                </div>
              </div>
            </div>

            <Divider />

            {/* Address */}
            <div className="flex items-start gap-3.5 mt-5">
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
                  Address
                </div>
                <div
                  style={{
                    fontFamily: 'var(--hm-body)',
                    fontSize: '0.85rem',
                    color: 'var(--hm-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Bandar Seri Begawan, Brunei Darussalam
                </div>
              </div>
            </div>
          </ThemeCard>
        </Reveal>

        {/* ── Right: Quick Contact Form ── */}
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
              Quick contact form
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
              Fill in the form below and our support team will get back to you
              within one business day.
            </p>

            {submitted ? (
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  minHeight: 280,
                  borderRadius: 'var(--hm-r)',
                  border: '1px solid var(--hm-line)',
                  background: 'var(--hm-paper)',
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
                    <CheckCircle2 size={26} color="#fff" />
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
                    Message sent successfully
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--hm-body)',
                      fontSize: '0.9rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    Our support team will respond within one business day.
                    Check your email for a confirmation.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Name + Email row */}
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
                </div>

                {/* Phone */}
                <div className="mb-4">
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

                {/* Subject dropdown */}
                <div className="mb-4">
                  <label style={labelStyle}>
                    Subject <span style={{ color: 'var(--hm-green)' }}>*</span>
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => update('subject', e.target.value)}
                    required
                    style={selectStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  >
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label style={labelStyle}>
                    Message <span style={{ color: 'var(--hm-green)' }}>*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                    required
                    placeholder="Describe your issue or question…"
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
    </div>
  );

  /* ───── Self-Service Resources ───── */
  const selfService = (
    <ThemeSection variant="default">
      <Reveal delay={0}>
        <SectionHeader
          label="Self-Service"
          title="Help yourself first"
          lede="Browse our resources to find answers, guides, and downloadable materials — available anytime."
        />
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Knowledge Base */}
        <Reveal delay={0.05}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('knowledge-base')}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('knowledge-base'); }}
          >
          <ThemeCard>
            <IconBox size="md">
              <BookOpen size={20} color="var(--hm-green)" />
            </IconBox>
            <h3
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                fontSize: '1.08rem',
                color: 'var(--hm-ink)',
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              Knowledge Base
            </h3>
            <p
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.88rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              Browse articles and guides covering equipment maintenance,
              troubleshooting tips, and best practices for facility management.
            </p>
            <div
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--hm-green)',
              }}
            >
              Browse articles
              <ArrowRight size={12} />
            </div>
          </ThemeCard>
          </div>
        </Reveal>

        {/* FAQ */}
        <Reveal delay={0.1}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('faq')}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('faq'); }}
          >
          <ThemeCard>
            <IconBox size="md">
              <HelpCircle size={20} color="var(--hm-green)" />
            </IconBox>
            <h3
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                fontSize: '1.08rem',
                color: 'var(--hm-ink)',
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              FAQ
            </h3>
            <p
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.88rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              Answers to common questions about complaints, service requests,
              quotations, invoicing, equipment, and maintenance.
            </p>
            <div
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--hm-green)',
              }}
            >
              View all FAQs
              <ArrowRight size={12} />
            </div>
          </ThemeCard>
          </div>
        </Reveal>

        {/* Downloads */}
        <Reveal delay={0.15}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('downloads')}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('downloads'); }}
          >
          <ThemeCard>
            <IconBox size="md">
              <Download size={20} color="var(--hm-green)" />
            </IconBox>
            <h3
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                fontSize: '1.08rem',
                color: 'var(--hm-ink)',
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              Downloads
            </h3>
            <p
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.88rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              Forms, service guides, maintenance checklists, compliance
              documents, and other helpful resources ready to download.
            </p>
            <div
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--hm-green)',
              }}
            >
              Download resources
              <ArrowRight size={12} />
            </div>
          </ThemeCard>
          </div>
        </Reveal>
      </div>
    </ThemeSection>
  );

  /* ───── Support Process ───── */
  const STEPS = [
    {
      number: '01',
      title: 'Submit Request',
      description:
        'Send your request via portal, WhatsApp, phone, or the contact form. Include details about the issue and preferred timing.',
    },
    {
      number: '02',
      title: 'Assigned & Scheduled',
      description:
        'Our team reviews within 15 minutes, assigns the best technician for the job, and schedules a visit at your convenience.',
    },
    {
      number: '03',
      title: 'Work Completed',
      description:
        'The technician completes the work on-site, documents everything in the system, and updates the equipment history in real-time.',
    },
    {
      number: '04',
      title: 'Feedback',
      description:
        'You receive a completion report and can rate the service. Your feedback helps us continuously improve our standards.',
    },
  ];

  const processSection = (
    <ThemeSection variant="stone">
      <Reveal delay={0}>
        <SectionHeader
          label="Our Process"
          title="How support works"
          lede="A transparent, four-step process from request to resolution — keeping you informed at every stage."
        />
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((step, idx) => (
          <Reveal key={step.number} delay={0.05 * idx}>
            <div className="relative">
              {/* Connector line (not on last item) */}
              {idx < STEPS.length - 1 && (
                <div
                  className="hidden lg:block absolute top-5 left-full w-full h-px"
                  style={{
                    background: 'var(--hm-line-soft)',
                    transform: 'translateX(12px)',
                    zIndex: 0,
                  }}
                />
              )}

              <div className="relative" style={{ zIndex: 1 }}>
                {/* Step number */}
                <div
                  className="mb-4 grid place-items-center"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'var(--hm-green)',
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    color: '#fff',
                    letterSpacing: '0.02em',
                  }}
                >
                  {step.number}
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 600,
                    fontSize: '1.05rem',
                    color: 'var(--hm-ink)',
                    lineHeight: 1.25,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--hm-body)',
                    fontSize: '0.85rem',
                    color: 'var(--hm-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </ThemeSection>
  );

  /* ───── CTA Section ───── */
  const ctaSection = (
    <ThemeSection variant="forest">
      <Reveal>
        <div className="max-w-2xl mx-auto text-center">
          <p
            className="mb-4"
            style={{
              fontFamily: 'var(--hm-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--hm-green-bright)',
            }}
          >
            Still need help?
          </p>
          <h2
            style={{
              fontFamily: 'var(--hm-disp)',
              fontWeight: 600,
              fontSize: 'clamp(1.6rem, 3.6vw, 2.4rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--hm-paper)',
              marginBottom: 12,
            }}
          >
            We&apos;d love to hear from you
          </h2>
          <p
            className="mb-8"
            style={{
              fontFamily: 'var(--hm-body)',
              fontSize: '1.02rem',
              color: 'rgba(247,248,243,0.68)',
              lineHeight: 1.6,
              maxWidth: '48ch',
              margin: '0 auto 2rem',
            }}
          >
            If you couldn&apos;t find what you were looking for, our team is
            just a message or call away. Let&apos;s solve it together.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <ThemeButton variant="green" onClick={() => navigate('contact')}>
              Contact us
              <ArrowRight size={16} />
            </ThemeButton>
            <ThemeButton variant="outline" onClick={() => navigate('faq')}>
              <HelpCircle size={16} />
              Browse FAQ
            </ThemeButton>
          </div>
        </div>
      </Reveal>
    </ThemeSection>
  );

  return (
    <PageWrapper>
      {heroSection}
      {quickActions}
      {contactSection}
      {selfService}
      {processSection}
      {ctaSection}
    </PageWrapper>
  );
}