'use client';

import React, { useState } from 'react';
import type { PageId } from '../public-website';
import {
  SectionHeader,
  ThemeSection,
  ThemeButton,
  ThemeLink,
  Reveal,
  Divider,
  PageWrapper,
} from '../theme';
import {
  ChevronDown,
  Search,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

interface PageProps {
  navigate: (id: PageId) => void;
}

/* ───────────────────────────────────────────────────────────
   FAQ Data
   ─────────────────────────────────────────────────────────── */

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const CATEGORIES = [
  'All',
  'Complaints',
  'Service Requests',
  'Quotations',
  'Invoices & Payments',
  'Equipment',
  'Maintenance',
  'General',
] as const;

const FAQ_ITEMS: FaqItem[] = [
  // ── Complaints ──
  {
    category: 'Complaints',
    question: 'How do I submit a complaint?',
    answer:
      'You can submit a complaint through multiple channels: WhatsApp, the Client Portal, QR code scan on any equipment, or by calling our hotline. Each method is designed for your convenience — simply describe the issue and our system will route it automatically to the right team.',
  },
  {
    category: 'Complaints',
    question: 'What happens after I submit a complaint?',
    answer:
      'Our team reviews your complaint within 15 minutes during business hours. A technician is assigned based on the issue type and urgency. You will receive real-time status updates via the Client Portal and WhatsApp, including the assigned technician\'s name and estimated arrival time.',
  },
  {
    category: 'Complaints',
    question: 'Can I track my complaint status?',
    answer:
      'Yes, absolutely. You can track your complaint status in real-time through the Client Portal dashboard or by messaging our WhatsApp AI assistant. Each ticket has a unique reference number that you can use to get instant updates on progress, assigned technician, and resolution timeline.',
  },
  {
    category: 'Complaints',
    question: 'What if I\'m not satisfied with the resolution?',
    answer:
      'You can request a rework or escalation directly through the Client Portal. Alternatively, contact your dedicated account manager who will personally oversee the follow-up. We operate on a first-time-fix philosophy and will not close a ticket until you confirm satisfaction with the work completed.',
  },
  {
    category: 'Complaints',
    question: 'Is there a time limit for filing a complaint?',
    answer:
      'We recommend reporting issues as soon as they are noticed to prevent further damage. However, you can file a complaint at any time. For warranty-related concerns, please refer to your service agreement for specific timeframes. Emergency issues can be reported 24/7 through our emergency hotline.',
  },

  // ── Service Requests ──
  {
    category: 'Service Requests',
    question: 'How do I request a new service?',
    answer:
      'Submit a service request through the Client Portal, WhatsApp, or by contacting your account manager directly. For new clients, visit our Contact page or call our office. Our team will gather the necessary details and schedule an assessment at your earliest convenience.',
  },
  {
    category: 'Service Requests',
    question: 'What information do I need to provide?',
    answer:
      'To process your request efficiently, please provide: equipment details (type, model, or location), a description of the issue or service needed, your site location and access instructions, and your preferred timing. The more detail you provide upfront, the faster we can respond.',
  },
  {
    category: 'Service Requests',
    question: 'Can I schedule maintenance in advance?',
    answer:
      'Yes, our preventive maintenance scheduling system allows you to plan services weeks or months ahead. Through the Client Portal, you can view available time slots, select your preferred dates, and receive automated reminders before each scheduled visit. Recurring services can be set to auto-schedule.',
  },
  {
    category: 'Service Requests',
    question: 'How quickly can you respond to urgent requests?',
    answer:
      'For emergency breakdowns, our 24/7 hotline guarantees a response within 30 minutes and on-site arrival based on proximity and severity. Standard urgent requests during business hours are typically addressed within 2 hours. Our SLA commitments outline specific response times for each priority level.',
  },
  {
    category: 'Service Requests',
    question: 'Can I modify or cancel a service request?',
    answer:
      'Yes, you can modify or cancel any pending service request through the Client Portal before a technician is dispatched. Once a technician is en route, please call our office or use the WhatsApp channel to make changes. Cancellations within 2 hours of a scheduled visit may incur a call-out fee as per your service agreement.',
  },

  // ── Quotations ──
  {
    category: 'Quotations',
    question: 'How do I get a quotation?',
    answer:
      'Contact us with your requirements via the Client Portal, email, or phone. Our team will conduct an on-site assessment if needed and provide a detailed quotation within 3 business days. The quotation will include a full breakdown of labour, materials, and any applicable charges with no hidden fees.',
  },
  {
    category: 'Quotations',
    question: 'Are quotations free?',
    answer:
      'Yes, initial assessments and quotations are provided at no charge. We believe in transparency — you\'ll receive a comprehensive quote with detailed cost breakdowns before any work begins. There is no obligation to proceed, and our quotations are designed to give you full visibility into the scope and costs.',
  },
  {
    category: 'Quotations',
    question: 'How long is a quotation valid?',
    answer:
      'Standard quotations are valid for 30 days from the date of issue. If material costs fluctuate significantly during this period, we will notify you before proceeding. For large-scale projects, quotations may have extended validity — the specific terms will be stated clearly on your quotation document.',
  },
  {
    category: 'Quotations',
    question: 'Can I negotiate a quotation?',
    answer:
      'We strive to provide competitive and fair pricing from the outset. However, if you have specific budget constraints or have received competing quotes, please discuss this with your account manager. For bulk or long-term contracts, we offer volume discounts and custom pricing packages tailored to your needs.',
  },
  {
    category: 'Quotations',
    question: 'What does a typical quotation include?',
    answer:
      'A standard MOHD.HMS quotation includes: a detailed scope of work, itemised costs for labour and materials, estimated timeline for completion, applicable warranty terms, and any terms and conditions specific to the service. For complex projects, we may also include a project timeline and milestone breakdown.',
  },

  // ── Invoices & Payments ──
  {
    category: 'Invoices & Payments',
    question: 'How do I receive invoices?',
    answer:
      'Invoices are automatically sent via email to your registered billing address and are also available for download in the Client Portal under the "Billing" section. You can set up multiple billing contacts to ensure the right people in your organisation receive copies promptly.',
  },
  {
    category: 'Invoices & Payments',
    question: 'What payment methods do you accept?',
    answer:
      'We accept bank transfers (local and international), company cheques, and online payment through the Client Portal. Payment terms are typically Net 30 days unless otherwise specified in your contract. For your convenience, we can also set up recurring auto-payments for AMC contracts.',
  },
  {
    category: 'Invoices & Payments',
    question: 'Can I view my payment history?',
    answer:
      'Yes, a complete payment history is available in the Client Portal. You can view, filter, and download all past invoices and payment receipts. The portal also provides outstanding balance summaries and upcoming payment reminders to help you manage your account efficiently.',
  },
  {
    category: 'Invoices & Payments',
    question: 'What if I have a billing dispute?',
    answer:
      'If you notice any discrepancy on your invoice, please contact our accounts department within 14 days of the invoice date. You can raise a billing query through the Client Portal or email us directly. We will investigate and resolve the matter promptly — no work will be disrupted while a genuine dispute is being resolved.',
  },

  // ── Equipment ──
  {
    category: 'Equipment',
    question: 'How does QR asset management work?',
    answer:
      'Each piece of equipment registered in our system is assigned a unique QR code. Simply scan the code with your smartphone camera to instantly access the equipment\'s full service history, warranty status, technical manuals, and parts list. You can also raise a service request directly from the scan — no app download required.',
  },
  {
    category: 'Equipment',
    question: 'Can I see all my equipment in one place?',
    answer:
      'Yes, the Client Portal provides a comprehensive equipment dashboard showing all registered assets across all your sites. You can filter by location, type, status, or service due date. Each equipment card shows key metrics including last service date, upcoming maintenance, and current health status.',
  },
  {
    category: 'Equipment',
    question: 'How do I register new equipment?',
    answer:
      'New equipment can be registered through the Client Portal by your site administrator, or our team can handle registration during an on-site visit. Simply provide the equipment make, model, serial number, installation date, and location. We\'ll generate and install the QR code label on-site at your convenience.',
  },
  {
    category: 'Equipment',
    question: 'What equipment data is tracked?',
    answer:
      'Our system tracks comprehensive data for each asset: installation date, warranty information, complete service history with technician notes, parts replaced, performance metrics, compliance certificates, and upcoming maintenance schedules. This creates a full lifecycle record for every piece of equipment.',
  },

  // ── Maintenance ──
  {
    category: 'Maintenance',
    question: 'What is preventive maintenance?',
    answer:
      'Preventive maintenance is a proactive approach to equipment care — scheduled inspections, servicing, and parts replacement performed before failures occur. This strategy extends asset lifespan, reduces unexpected breakdowns by up to 70%, lowers overall maintenance costs, and ensures equipment operates at peak efficiency.',
  },
  {
    category: 'Maintenance',
    question: 'How often should equipment be serviced?',
    answer:
      'Service frequency depends on equipment type, age, usage intensity, and manufacturer guidelines. We create custom maintenance schedules for each asset based on these factors. Typical intervals range from monthly for high-use HVAC systems to annually for fire safety equipment. Your personalised schedule is visible in the Client Portal.',
  },
  {
    category: 'Maintenance',
    question: 'What does a typical maintenance visit include?',
    answer:
      'A standard maintenance visit includes: thorough inspection of all components, cleaning of filters and coils where applicable, lubrication of moving parts, safety checks and calibration, replacement of worn parts, performance testing, and a detailed service report with findings and recommendations — all documented in the Client Portal.',
  },
  {
    category: 'Maintenance',
    question: 'Do you offer annual maintenance contracts?',
    answer:
      'Yes, we offer comprehensive Annual Maintenance Contracts (AMCs) tailored to your facility\'s needs. AMCs include scheduled preventive maintenance, priority emergency response, discounted parts and labour, dedicated account management, and detailed reporting. Contracts are customisable based on the number and type of assets covered.',
  },

  // ── General ──
  {
    category: 'General',
    question: 'What areas do you serve?',
    answer:
      'We serve all four districts of Brunei Darussalam: Brunei-Muara, Tutong, Belait, and Temburong. Our team is strategically positioned to provide prompt service across the country. For remote locations, we coordinate scheduling to ensure minimal disruption while maintaining our response time commitments.',
  },
  {
    category: 'General',
    question: 'What are your operating hours?',
    answer:
      'Our office hours are Monday to Friday 8:00 AM to 5:00 PM, and Saturday 8:00 AM to 12:00 PM. Emergency breakdown services are available 24 hours a day, 7 days a week, 365 days a year — simply call our emergency hotline for immediate assistance outside regular hours.',
  },
  {
    category: 'General',
    question: 'How do I become a client?',
    answer:
      'Getting started is easy. Contact us through the website, call our office, or send a WhatsApp message. We\'ll arrange a free initial consultation and facility assessment, during which we evaluate your maintenance needs and recommend a tailored service plan. Onboarding is typically completed within 3-5 business days.',
  },
  {
    category: 'General',
    question: 'Do you work with residential clients?',
    answer:
      'While our primary focus is on commercial and industrial clients — including government buildings, office complexes, retail spaces, and industrial facilities — we do offer select residential services for larger properties. Please contact us to discuss your specific requirements and we\'ll advise on the best solution.',
  },
  {
    category: 'General',
    question: 'What industries do you specialise in?',
    answer:
      'We provide maintenance services across a wide range of industries including government and public sector, commercial real estate, hospitality and hotels, healthcare facilities, educational institutions, retail, and industrial manufacturing. Our technicians are trained and certified to work in sensitive environments with strict compliance requirements.',
  },
];

/* ═══════════════════════════════════════════════════════════
   PAGE FAQ
   ═══════════════════════════════════════════════════════════ */
export function PageFaq({ navigate }: PageProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCategory =
      activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              FAQ
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
            Frequently Asked Questions
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
            Find quick answers to the most common questions about our
            maintenance services, billing, equipment management, and more.
          </p>
        </Reveal>
      </div>
    </div>
  );

  /* ───── FAQ Content ───── */
  const faqContent = (
    <ThemeSection variant="default">
      {/* Search Bar */}
      <Reveal delay={0}>
        <div
          className="mb-10"
          style={{
            position: 'relative',
            maxWidth: 560,
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--hm-faint)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpenIndex(null);
            }}
            style={{
              fontFamily: 'var(--hm-body)',
              fontSize: '0.94rem',
              width: '100%',
              padding: '0.82rem 0.9rem 0.82rem 2.6rem',
              borderRadius: 'var(--hm-r)',
              border: '1px solid var(--hm-line)',
              background: 'var(--hm-paper-2)',
              color: 'var(--hm-ink)',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--hm-green)';
              e.currentTarget.style.boxShadow =
                '0 0 0 3px rgba(30,122,75,0.10)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--hm-line)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </Reveal>

      {/* Category Filter Tabs */}
      <Reveal delay={0.05}>
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setOpenIndex(null);
              }}
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.76rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '8px 16px',
                borderRadius: 'var(--hm-r-sm)',
                border: '1px solid',
                borderColor:
                  activeCategory === cat
                    ? 'var(--hm-forest)'
                    : 'var(--hm-line)',
                background:
                  activeCategory === cat
                    ? 'var(--hm-forest)'
                    : 'transparent',
                color:
                  activeCategory === cat
                    ? 'var(--hm-paper)'
                    : 'var(--hm-muted)',
                cursor: 'pointer',
                transition: '0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Results count */}
      <Reveal delay={0.08}>
        <p
          className="mb-6"
          style={{
            fontFamily: 'var(--hm-mono)',
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--hm-faint)',
          }}
        >
          {filteredItems.length}{' '}
          {filteredItems.length === 1 ? 'question' : 'questions'}
          {searchQuery && (
            <span>
              {' '}
              for &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </p>
      </Reveal>

      {/* FAQ List */}
      <div
        className="grid gap-3"
        style={{ maxWidth: 800 }}
      >
        {filteredItems.map((q, i) => (
          <Reveal key={`${q.category}-${i}`} delay={Math.min(i * 0.04, 0.3)}>
            <div
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              style={{
                cursor: 'pointer',
                background: 'var(--hm-paper-2)',
                border: '1px solid',
                borderColor:
                  openIndex === i ? 'var(--hm-green)' : 'var(--hm-line)',
                borderRadius: 'var(--hm-r)',
                padding: '20px 22px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow:
                  openIndex === i
                    ? '0 0 0 3px rgba(30,122,75,0.08)'
                    : 'none',
              }}
            >
              <div
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {activeCategory === 'All' && (
                    <span
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.62rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--hm-green)',
                        background: 'var(--hm-stone)',
                        padding: '3px 8px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {q.category}
                    </span>
                  )}
                  <h4
                    style={{
                      fontFamily: 'var(--hm-disp)',
                      fontWeight: 500,
                      fontSize: '1rem',
                      color: 'var(--hm-ink)',
                      lineHeight: 1.35,
                    }}
                  >
                    {q.question}
                  </h4>
                </div>
                <ChevronDown
                  size={18}
                  style={{
                    color: 'var(--hm-green)',
                    flexShrink: 0,
                    transform:
                      openIndex === i
                        ? 'rotate(180deg)'
                        : 'none',
                    transition: 'transform 0.25s ease',
                  }}
                />
              </div>
              {openIndex === i && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: '1px solid var(--hm-line-soft)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.7,
                    }}
                  >
                    {q.answer}
                  </p>
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      {/* No results */}
      {filteredItems.length === 0 && (
        <Reveal delay={0}>
          <div
            className="text-center py-16"
            style={{ maxWidth: 400, margin: '0 auto' }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--hm-stone)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Search size={22} style={{ color: 'var(--hm-faint)' }} />
            </div>
            <p
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                fontSize: '1.1rem',
                color: 'var(--hm-ink)',
                marginBottom: 6,
              }}
            >
              No questions found
            </p>
            <p
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '0.9rem',
                color: 'var(--hm-muted)',
                lineHeight: 1.5,
              }}
            >
              Try adjusting your search or browse a different category. Can&apos;t
              find what you&apos;re looking for? We&apos;re happy to help.
            </p>
            <div className="mt-6">
              <ThemeLink variant="fill" onClick={() => navigate('contact')}>
                <MessageSquare size={16} />
                Contact us
              </ThemeLink>
            </div>
          </div>
        </Reveal>
      )}
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
            Still have questions?
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
            Can&apos;t find the answer? Let&apos;s talk.
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
            Our support team is ready to help with any questions about our
            services, billing, or your account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <ThemeButton variant="green" onClick={() => navigate('contact')}>
              Contact support
              <ArrowRight size={16} />
            </ThemeButton>
            <ThemeButton
              variant="outline"
              onClick={() => navigate('support')}
            >
              Visit Support Center
            </ThemeButton>
          </div>
        </div>
      </Reveal>
    </ThemeSection>
  );

  return (
    <PageWrapper>
      {heroSection}
      {faqContent}
      {ctaSection}
    </PageWrapper>
  );
}