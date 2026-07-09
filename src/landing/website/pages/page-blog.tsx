'use client';

import React, { useState } from 'react';
import type { PageId } from '../public-website';
import {
  SectionHeader,
  ThemeSection,
  ThemeCard,
  ThemeButton,
  MonoLabel,
  DisplayHeading,
  Reveal,
  PlaceholderFig,
  Divider,
  bodyStyle,
  PageWrapper,
} from '../theme';
import { ArrowRight, Mail, ChevronRight } from 'lucide-react';

/* ============================================================
   Static blog article data
   ============================================================ */
interface Article {
  title: string;
  category: string;
  readTime: string;
  date: string;
  description?: string;
  featured?: boolean;
  img?: string;
}

const FEATURED: Article = {
  title: '5 signs your chiller needs servicing',
  category: 'Maintenance tips',
  readTime: '6 min read',
  date: 'Mar 2026',
  img: '/images/ahu.jpg',
  description:
    'Chillers are the backbone of HVAC systems in commercial buildings. Ignoring early warning signs can lead to costly breakdowns, inflated energy bills, and uncomfortable indoor environments. Learn to spot the red flags before they become emergencies.',
  featured: true,
};

const ARTICLES: Article[] = [
  {
    title: 'Lower energy use with smarter PPM',
    category: 'Energy saving',
    readTime: '7 min read',
    date: 'Feb 2026',
    img: '/images/gauges.jpg',
  },
  {
    title: 'We expand our technical team',
    category: 'Company news',
    readTime: '4 min read',
    date: 'Feb 2026',
    img: '/images/clean.jpg',
  },
  {
    title: 'Fire safety compliance checklist',
    category: 'Safety',
    readTime: '5 min read',
    date: 'Jan 2026',
    img: '/images/blog-fire-compliance.jpg',
  },
  {
    title: 'Understanding BMS integration',
    category: 'Technology',
    readTime: '8 min read',
    date: 'Jan 2026',
    img: '/images/blog-bms.jpg',
  },
  {
    title: 'Preventive vs reactive maintenance',
    category: 'Insights',
    readTime: '6 min read',
    date: 'Dec 2025',
    img: '/images/blog-preventive.jpg',
  },
];

const CATEGORIES = [
  'All',
  'Maintenance tips',
  'Energy saving',
  'Company news',
  'Safety',
  'Technology',
  'Insights',
];

/* ============================================================
   PageBlog Component
   ============================================================ */
interface PageProps {
  navigate: (id: PageId) => void;
}

export function PageBlog({ navigate }: PageProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [email, setEmail] = useState('');

  const filteredArticles =
    activeCategory === 'All'
      ? ARTICLES
      : ARTICLES.filter((a) => a.category === activeCategory);

  return (
    <PageWrapper>
      {/* ── 1. Hero Banner (forest) ── */}
      <ThemeSection variant="forest">
        <Reveal>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6" style={bodyStyle}>
            <span
              className="cursor-pointer transition-colors duration-200"
              style={{ color: 'rgba(247,248,243,0.55)' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color =
                  'var(--hm-paper)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color =
                  'rgba(247,248,243,0.55)')
              }
              onClick={() => navigate('home')}
            >
              Home
            </span>
            <ChevronRight
              size={14}
              style={{ color: 'rgba(247,248,243,0.35)' }}
            />
            <span style={{ color: 'var(--hm-paper)' }}>Blog</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--hm-disp)',
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              fontSize: 'clamp(2.4rem, 5.2vw, 4rem)',
              color: 'var(--hm-paper)',
              maxWidth: '18ch',
            }}
          >
            Articles &amp; Company News
          </h1>
          <p
            className="mt-4"
            style={{
              ...bodyStyle,
              fontSize: '1.1rem',
              color: 'rgba(247,248,243,0.68)',
              maxWidth: '48ch',
            }}
          >
            Insights, tips and updates from our team.
          </p>
        </Reveal>
      </ThemeSection>

      {/* ── 2. Featured Article (default) ── */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="Latest"
            title="Featured Article"
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="cursor-pointer"
            style={{
              background: 'var(--hm-paper-2)',
              border: '1px solid var(--hm-line)',
              borderRadius: 'var(--hm-r-lg)',
              overflow: 'hidden',
              transition:
                'transform 0.28s var(--hm-ease), border-color 0.28s var(--hm-ease)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                'var(--hm-forest)';
              (e.currentTarget as HTMLElement).style.transform =
                'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                'var(--hm-line)';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}
          >
            <div style={{ padding: '28px 28px 0 28px' }}>
              <PlaceholderFig
                aspect="16/9"
                label="Featured"
                className="!rounded-lg"
                src={FEATURED.img}
              />
            </div>
            <div className="px-7 pt-5 pb-7">
              <MonoLabel>{FEATURED.category}</MonoLabel>
              <DisplayHeading
                as="h2"
                size="clamp(1.5rem, 2.8vw, 2.2rem)"
                className="mt-2.5"
                style={{ maxWidth: '22ch' }}
              >
                {FEATURED.title}
              </DisplayHeading>
              <p
                className="mt-3"
                style={{
                  ...bodyStyle,
                  color: 'var(--hm-muted)',
                  maxWidth: '62ch',
                  fontSize: '1.02rem',
                }}
              >
                {FEATURED.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-5">
                <span
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.78rem',
                    color: 'var(--hm-muted)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {FEATURED.readTime} · {FEATURED.date}
                </span>
                <Divider />
                <span
                  className="inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-200"
                  style={{
                    fontFamily: 'var(--hm-body)',
                    fontWeight: 600,
                    fontSize: '0.94rem',
                    color: 'var(--hm-green)',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color =
                      'var(--hm-forest)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color =
                      'var(--hm-green)')
                  }
                >
                  Read more
                  <ArrowRight size={15} />
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </ThemeSection>

      {/* ── 4. Categories Strip (stone) — placed before grid for UX flow ── */}
      <ThemeSection variant="stone" className="!py-10">
        <Reveal>
          <SectionHeader
            label="Browse"
            title="Categories"
            lede="Filter articles by topic."
          />
        </Reveal>
        <Reveal delay={0.08}>
          <div className="flex flex-wrap gap-3 mt-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  className="cursor-pointer transition-all duration-250"
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.74rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    padding: '0.55rem 1.1rem',
                    borderRadius: 'var(--hm-r-sm)',
                    border: '1px solid',
                    borderColor: isActive
                      ? 'var(--hm-forest)'
                      : 'var(--hm-line)',
                    background: isActive
                      ? 'var(--hm-forest)'
                      : 'var(--hm-paper-2)',
                    color: isActive
                      ? 'var(--hm-paper)'
                      : 'var(--hm-ink)',
                    transition:
                      'background 0.2s var(--hm-ease), color 0.2s var(--hm-ease), border-color 0.2s var(--hm-ease), transform 0.2s var(--hm-ease)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'var(--hm-forest)';
                      el.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'var(--hm-line)';
                      el.style.transform = 'none';
                    }
                  }}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </Reveal>
      </ThemeSection>

      {/* ── 3. Article Grid (default) ── */}
      <ThemeSection>
        <Reveal>
          <SectionHeader
            label="Archive"
            title="All Articles"
            lede="Browse our full archive."
          />
        </Reveal>

        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, i) => (
              <Reveal key={article.title} delay={0.06 * (i + 1)}>
                <div
                  style={{
                    background: 'var(--hm-paper-2)',
                    border: '1px solid var(--hm-line)',
                    borderRadius: 'var(--hm-r)',
                    overflow: 'hidden',
                    transition:
                      'transform 0.28s var(--hm-ease), border-color 0.28s var(--hm-ease)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      'var(--hm-forest)';
                    (e.currentTarget as HTMLElement).style.transform =
                      'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      'var(--hm-line)';
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                  }}
                >
                  <div style={{ padding: '18px 18px 0 18px' }}>
                    <PlaceholderFig
                      aspect="4/3"
                      label={article.category}
                      className="!rounded-lg"
                      src={article.img}
                    />
                  </div>
                  <div style={{ padding: '16px 18px 20px 18px' }}>
                    <MonoLabel>{article.category}</MonoLabel>
                    <DisplayHeading
                      as="h4"
                      size="clamp(1.05rem, 1.6vw, 1.25rem)"
                      className="mt-1.5"
                      style={{ lineHeight: 1.22, maxWidth: '18ch' }}
                    >
                      {article.title}
                    </DisplayHeading>
                    <span
                      className="block mt-3"
                      style={{
                        fontFamily: 'var(--hm-mono)',
                        fontSize: '0.72rem',
                        color: 'var(--hm-muted)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {article.readTime} · {article.date}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div
              className="text-center py-16"
              style={{
                background: 'var(--hm-paper-2)',
                border: '1px solid var(--hm-line)',
                borderRadius: 'var(--hm-r)',
              }}
            >
              <p style={{ ...bodyStyle, color: 'var(--hm-muted)' }}>
                No articles found in &ldquo;{activeCategory}&rdquo;.
              </p>
              <button
                className="mt-4 cursor-pointer"
                style={{
                  fontFamily: 'var(--hm-body)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: 'var(--hm-green)',
                  background: 'none',
                  border: 'none',
                }}
                onClick={() => setActiveCategory('All')}
              >
                View all articles →
              </button>
            </div>
          </Reveal>
        )}
      </ThemeSection>

      {/* ── 5. Newsletter CTA (forest) ── */}
      <ThemeSection variant="forest">
        <Reveal>
          <div className="max-w-[580px] mx-auto text-center">
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
              Stay updated
            </h2>
            <p
              className="mt-3"
              style={{
                ...bodyStyle,
                color: 'rgba(247,248,243,0.64)',
                fontSize: '1.05rem',
              }}
            >
              Get maintenance insights delivered to your inbox.
            </p>

            {/* Email form */}
            <div
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-7 mx-auto"
              style={{ maxWidth: 460 }}
            >
              <div
                className="relative flex-1"
                style={{ borderRadius: 'var(--hm-r-sm)' }}
              >
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(247,248,243,0.4)' }}
                />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full outline-none"
                  style={{
                    fontFamily: 'var(--hm-body)',
                    fontSize: '0.94rem',
                    padding: '0.82rem 1rem 0.82rem 2.5rem',
                    borderRadius: 'var(--hm-r-sm)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--hm-paper)',
                    transition:
                      'border-color 0.25s var(--hm-ease), background 0.25s var(--hm-ease)',
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor =
                      'rgba(255,255,255,0.4)';
                    (e.target as HTMLInputElement).style.background =
                      'rgba(255,255,255,0.12)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor =
                      'rgba(255,255,255,0.18)';
                    (e.target as HTMLInputElement).style.background =
                      'rgba(255,255,255,0.08)';
                  }}
                />
              </div>
              <ThemeButton variant="green" className="!bg-white !text-[var(--hm-forest)]" style={{ fontWeight: 700 }} onClick={() => {
                if (email) {
                  setEmail('');
                  /* In production this would call a subscribe API */
                }
              }}>
                Subscribe
                <ArrowRight size={15} />
              </ThemeButton>
            </div>
            <p
              className="mt-4"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.68rem',
                color: 'rgba(247,248,243,0.36)',
                letterSpacing: '0.03em',
              }}
            >
              No spam. Unsubscribe at any time.
            </p>
          </div>
        </Reveal>
      </ThemeSection>
    </PageWrapper>
  );
}