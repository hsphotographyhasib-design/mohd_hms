'use client';

import React, { useState, useMemo } from 'react';
import type { PageId } from '../public-website';
import {
  ThemeSection,
  ThemeCard,
  ThemeLink,
  MonoLabel,
  DisplayHeading,
  Reveal,
  PageWrapper,
} from '../theme';
import {
  Search,
  ChevronRight,
  Clock,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

/* ============================================================
   Article data
   ============================================================ */
interface Article {
  title: string;
  category: string;
  readTime: string;
  description: string;
}

const ARTICLES: Article[] = [
  // Getting Started
  {
    title: 'How to Submit Your First Complaint',
    category: 'Getting Started',
    readTime: '5 min read',
    description: 'A step-by-step guide to using our complaint system',
  },
  {
    title: 'Understanding Your Maintenance Contract',
    category: 'Getting Started',
    readTime: '8 min read',
    description: 'Key terms and what to expect',
  },
  {
    title: 'Getting Started with the Client Portal',
    category: 'Getting Started',
    readTime: '4 min read',
    description: 'Navigate the portal like a pro',
  },
  // Equipment Care
  {
    title: 'HVAC System Maintenance Best Practices',
    category: 'Equipment Care',
    readTime: '6 min read',
    description: 'Keep your cooling systems running efficiently',
  },
  {
    title: 'Electrical Safety Checklist for Facility Managers',
    category: 'Equipment Care',
    readTime: '5 min read',
    description: 'Monthly electrical safety checks',
  },
  {
    title: 'Fire Protection System Inspection Guide',
    category: 'Equipment Care',
    readTime: '7 min read',
    description: 'What to check and when',
  },
  // Safety Guides
  {
    title: 'Workplace Safety During Maintenance Activities',
    category: 'Safety Guides',
    readTime: '6 min read',
    description: 'Your safety responsibilities',
  },
  {
    title: 'PPE Requirements for Different Maintenance Tasks',
    category: 'Safety Guides',
    readTime: '4 min read',
    description: 'What to wear and when',
  },
  {
    title: 'Emergency Response Procedures for Facility Managers',
    category: 'Safety Guides',
    readTime: '5 min read',
    description: 'What to do when things go wrong',
  },
  // Billing & Invoices
  {
    title: 'Understanding Your Maintenance Invoice',
    category: 'Billing & Invoices',
    readTime: '4 min read',
    description: 'Line-by-line invoice breakdown',
  },
  {
    title: 'Payment Methods and Terms',
    category: 'Billing & Invoices',
    readTime: '3 min read',
    description: 'How and when to pay',
  },
  {
    title: 'Disputing an Invoice',
    category: 'Billing & Invoices',
    readTime: '4 min read',
    description: 'The process for raising invoice concerns',
  },
  // System Guides
  {
    title: 'Using QR Codes for Equipment Management',
    category: 'System Guides',
    readTime: '5 min read',
    description: 'Scan, report, track',
  },
  {
    title: 'WhatsApp AI: Getting Help Instantly',
    category: 'System Guides',
    readTime: '4 min read',
    description: 'How to interact with our AI assistant',
  },
  {
    title: 'Mobile App: Complete User Guide',
    category: 'System Guides',
    readTime: '8 min read',
    description: 'Everything you need to know',
  },
  // Maintenance Tips
  {
    title: 'Seasonal Maintenance Calendar',
    category: 'Maintenance Tips',
    readTime: '5 min read',
    description: 'What to check and when throughout the year',
  },
  {
    title: 'Energy Efficiency Tips for Commercial Buildings',
    category: 'Maintenance Tips',
    readTime: '6 min read',
    description: 'Reduce costs and improve comfort',
  },
];

const CATEGORIES = [
  'All',
  'Getting Started',
  'Equipment Care',
  'Safety Guides',
  'Billing & Invoices',
  'System Guides',
  'Maintenance Tips',
];

/* ============================================================
   PageKnowledgeBase Component
   ============================================================ */
interface PageProps {
  navigate: (id: PageId) => void;
}

export function PageKnowledgeBase({ navigate }: PageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((article) => {
      const matchesCategory =
        activeCategory === 'All' || article.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

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
                Knowledge Base
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
              Knowledge Base
            </h1>
            <p
              style={{
                marginTop: 16,
                fontSize: '1.08rem',
                color: 'rgba(247,248,243,0.7)',
                maxWidth: '55ch',
              }}
            >
              Searchable guides, how-tos, and resources to help you get the most
              from our maintenance services.
            </p>
          </Reveal>
        </div>
      </div>

      {/* ── 2. Search Bar ── */}
      <ThemeSection className="!pt-12 !pb-6">
        <Reveal>
          <div className="relative max-w-xl mx-auto mb-12">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2"
              size={20}
              style={{ color: 'var(--hm-faint)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, guides, and resources..."
              className="w-full"
              style={{
                fontFamily: 'var(--hm-body)',
                fontSize: '1rem',
                padding: '14px 18px 14px 48px',
                borderRadius: 'var(--hm-r)',
                border: '1px solid var(--hm-line)',
                background: 'var(--hm-paper-2)',
                color: 'var(--hm-ink)',
                outline: 'none',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor =
                  'var(--hm-green)';
                (e.target as HTMLInputElement).style.boxShadow =
                  '0 0 0 3px rgba(30,122,75,0.10)';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor =
                  'var(--hm-line)';
                (e.target as HTMLInputElement).style.boxShadow = 'none';
              }}
            />
          </div>
        </Reveal>

        {/* ── 3. Category Filter Tabs ── */}
        <Reveal delay={0.06}>
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  className="cursor-pointer"
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
                    color: isActive ? 'var(--hm-paper)' : 'var(--hm-ink)',
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

        {/* ── 4. Article Grid ── */}
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, i) => (
              <Reveal key={article.title} delay={0.04 * (i + 1)}>
                <ThemeCard className="flex flex-col">
                  <div
                    style={{
                      fontFamily: 'var(--hm-mono)',
                      fontSize: '0.68rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--hm-green)',
                      marginBottom: 8,
                    }}
                  >
                    {article.category}
                  </div>
                  <DisplayHeading
                    className="text-base mb-2"
                    style={{ flex: 1 }}
                  >
                    {article.title}
                  </DisplayHeading>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--hm-muted)',
                      lineHeight: 1.55,
                      marginBottom: 12,
                    }}
                  >
                    {article.description}
                  </p>
                  <div
                    className="flex items-center justify-between mt-auto pt-4"
                    style={{
                      borderTop: '1px solid var(--hm-line-soft)',
                    }}
                  >
                    <span
                      className="flex items-center gap-1.5"
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--hm-faint)',
                      }}
                    >
                      <Clock size={13} />
                      {article.readTime}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--hm-green)',
                        cursor: 'pointer',
                      }}
                    >
                      Read more <ChevronRight size={14} />
                    </span>
                  </div>
                </ThemeCard>
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
              <BookOpen
                size={32}
                style={{
                  color: 'var(--hm-faint)',
                  margin: '0 auto 12px',
                  display: 'block',
                }}
              />
              <p
                style={{
                  fontFamily: 'var(--hm-body)',
                  fontSize: '1rem',
                  color: 'var(--hm-muted)',
                }}
              >
                No articles found
                {searchQuery
                  ? ` matching "${searchQuery}"`
                  : ` in "${activeCategory}"`}
                .
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
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
              >
                Clear filters &amp; view all →
              </button>
            </div>
          </Reveal>
        )}
      </ThemeSection>

      {/* ── 5. CTA — Can't find what you need? (forest) ── */}
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
              <HelpCircle size={22} style={{ color: 'var(--hm-paper)' }} />
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
              Can&apos;t find what you need?
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
              Our support team is here to help. Reach out and we&apos;ll get you
              the answers you need.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
              <ThemeLink
                variant="green"
                onClick={() => navigate('support')}
              >
                Support Centre <ChevronRight size={15} />
              </ThemeLink>
              <ThemeLink
                variant="outline"
                onClick={() => navigate('faq')}
                style={{
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: 'var(--hm-paper)',
                }}
              >
                Browse FAQ <HelpCircle size={15} />
              </ThemeLink>
            </div>
          </div>
        </Reveal>
      </ThemeSection>
    </PageWrapper>
  );
}