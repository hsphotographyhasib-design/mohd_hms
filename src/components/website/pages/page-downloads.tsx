'use client';

import React from 'react';
import type { PageId } from '../public-website';
import {
  SectionHeader,
  ThemeSection,
  ThemeCard,
  ThemeLink,
  IconBox,
  MonoLabel,
  DisplayHeading,
  Reveal,
  PageWrapper,
  Divider,
} from '../theme';
import {
  Download,
  FileText,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';

/* ============================================================
   Download data
   ============================================================ */
interface DownloadItem {
  title: string;
  format: string;
  size: string;
}

interface DownloadCategory {
  name: string;
  icon: string;
  items: DownloadItem[];
}

const DOWNLOAD_CATEGORIES: DownloadCategory[] = [
  {
    name: 'Forms & Templates',
    icon: 'forms',
    items: [
      { title: 'Maintenance Request Form', format: 'PDF', size: '245 KB' },
      { title: 'New Client Registration Form', format: 'PDF', size: '180 KB' },
      { title: 'Equipment Registration Form', format: 'PDF', size: '320 KB' },
      { title: 'Feedback & Complaint Form', format: 'PDF', size: '150 KB' },
      { title: 'Service Agreement Template', format: 'PDF', size: '410 KB' },
    ],
  },
  {
    name: 'Technical Guides',
    icon: 'technical',
    items: [
      { title: 'HVAC Maintenance Handbook', format: 'PDF', size: '2.4 MB' },
      { title: 'Electrical Systems Inspection Guide', format: 'PDF', size: '1.8 MB' },
      { title: 'Fire Protection Systems Manual', format: 'PDF', size: '3.1 MB' },
      { title: 'Plumbing Maintenance Standards', format: 'PDF', size: '1.5 MB' },
    ],
  },
  {
    name: 'Safety Documents',
    icon: 'safety',
    items: [
      { title: 'Workplace Safety Policy', format: 'PDF', size: '580 KB' },
      { title: 'PPE Requirements Guide', format: 'PDF', size: '420 KB' },
      { title: 'Emergency Response Procedures', format: 'PDF', size: '690 KB' },
      { title: 'Risk Assessment Template', format: 'PDF', size: '340 KB' },
    ],
  },
  {
    name: 'System Documentation',
    icon: 'system',
    items: [
      { title: 'Client Portal User Guide', format: 'PDF', size: '1.2 MB' },
      { title: 'Mobile App Quick Start Guide', format: 'PDF', size: '890 KB' },
      { title: 'WhatsApp AI Setup Guide', format: 'PDF', size: '560 KB' },
      { title: 'QR Code Implementation Guide', format: 'PDF', size: '780 KB' },
    ],
  },
  {
    name: 'Company Documents',
    icon: 'company',
    items: [
      { title: 'Company Profile 2026', format: 'PDF', size: '4.2 MB' },
      { title: 'Service Brochure', format: 'PDF', size: '2.8 MB' },
      { title: 'Certifications & Licences', format: 'PDF', size: '1.1 MB' },
    ],
  },
];

/* ============================================================
   PageDownloads Component
   ============================================================ */
interface PageProps {
  navigate: (id: PageId) => void;
}

export function PageDownloads({ navigate }: PageProps) {
  const totalItems = DOWNLOAD_CATEGORIES.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  );

  return (
    <PageWrapper>
      {/* ── 1. Hero Banner (forest) ── */}
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
          <Reveal>
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
                Downloads
              </span>
            </div>
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
              Downloads &amp; Resources
            </h1>
            <p
              style={{
                marginTop: 16,
                fontSize: '1.08rem',
                color: 'rgba(247,248,243,0.7)',
                maxWidth: '55ch',
              }}
            >
              Forms, guides, and documentation to support your maintenance
              operations. {totalItems} resources available across{' '}
              {DOWNLOAD_CATEGORIES.length} categories.
            </p>
          </Reveal>
        </div>
      </div>

      {/* ── 2. Category Sections ── */}
      <ThemeSection>
        {DOWNLOAD_CATEGORIES.map((category, catIdx) => (
          <Reveal key={category.name} delay={0.04 * catIdx}>
            <div
              className={catIdx > 0 ? 'mt-16 pt-16' : ''}
              style={
                catIdx > 0
                  ? { borderTop: '1px solid var(--hm-line)' }
                  : undefined
              }
            >
              {/* Category header */}
              <div className="flex items-center gap-4 mb-8">
                <IconBox size="md">
                  <FolderOpen
                    size={18}
                    style={{ color: 'var(--hm-green)' }}
                  />
                </IconBox>
                <div>
                  <MonoLabel className="mb-1 block">
                    {category.items.length} documents
                  </MonoLabel>
                  <DisplayHeading as="h2" className="text-xl">
                    {category.name}
                  </DisplayHeading>
                </div>
              </div>

              {/* Download items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item, itemIdx) => (
                  <Reveal key={item.title} delay={0.03 * (itemIdx + 1)}>
                    <ThemeCard
                      className="flex items-center gap-4"
                      hover={false}
                    >
                      <IconBox size="md">
                        <FileText
                          size={18}
                          style={{ color: 'var(--hm-green)' }}
                        />
                      </IconBox>
                      <div className="flex-1 min-w-0">
                        <DisplayHeading as="h4" className="text-sm">
                          {item.title}
                        </DisplayHeading>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--hm-faint)',
                          }}
                        >
                          {item.format} · {item.size}
                        </span>
                      </div>
                      <button
                        className="shrink-0 flex items-center gap-1 cursor-pointer"
                        style={{
                          fontFamily: 'var(--hm-mono)',
                          fontSize: '0.76rem',
                          color: 'var(--hm-green)',
                          background: 'none',
                          border: '1px solid var(--hm-line)',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          borderRadius: 'var(--hm-r-sm)',
                          transition:
                            'background 0.2s var(--hm-ease), border-color 0.2s var(--hm-ease), transform 0.2s var(--hm-ease)',
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'var(--hm-forest)';
                          el.style.color = 'var(--hm-paper)';
                          el.style.borderColor = 'var(--hm-forest)';
                          el.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'none';
                          el.style.color = 'var(--hm-green)';
                          el.style.borderColor = 'var(--hm-line)';
                          el.style.transform = 'none';
                        }}
                      >
                        <Download size={14} /> Download
                      </button>
                    </ThemeCard>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </ThemeSection>

      {/* ── 3. CTA — Need a document? (forest) ── */}
      <ThemeSection variant="forest">
        <Reveal>
          <div className="max-w-[580px] mx-auto text-center">
            <div
              className="mx-auto mb-5"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <FileText size={22} style={{ color: 'var(--hm-paper)' }} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--hm-disp)',
                fontWeight: 600,
                lineHeight: 1.04,
                letterSpacing: '-0.02em',
                fontSize: 'clamp(1.8rem, 3.8vw, 2.8rem)',
                color: 'var(--hm-paper)',
              }}
            >
              Need a document you can&apos;t find?
            </h2>
            <p
              className="mt-3"
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '1.05rem',
                color: 'rgba(247,248,243,0.64)',
                lineHeight: 1.6,
              }}
            >
              Get in touch with our team and we&apos;ll send you the right
              document for your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
              <ThemeLink
                variant="green"
                onClick={() => navigate('contact')}
              >
                Contact Us <ChevronRight size={15} />
              </ThemeLink>
              <ThemeLink
                variant="outline"
                onClick={() => navigate('support')}
                style={{
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: 'var(--hm-paper)',
                }}
              >
                Support Centre <Download size={15} />
              </ThemeLink>
            </div>
          </div>
        </Reveal>
      </ThemeSection>
    </PageWrapper>
  );
}