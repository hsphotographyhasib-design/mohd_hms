'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { PageHome } from './pages/page-home';
import { PageAbout } from './pages/page-about';
import { PageServices } from './pages/page-services';
import { PageIndustries } from './pages/page-industries';
import { PageProjects } from './pages/page-projects';
import { PageSystem } from './pages/page-system';
import { PageCareers } from './pages/page-careers';
import { PageBlog } from './pages/page-blog';
import { PageContact } from './pages/page-contact';
import { PageLogin } from './pages/page-login';
import { PageOurStory } from './pages/page-our-story';
import { PageMissionVision } from './pages/page-mission-vision';
import { PageLeadershipTeam } from './pages/page-leadership-team';
import { PageSupport } from './pages/page-support';
import { PageFaq } from './pages/page-faq';
import { PageKnowledgeBase } from './pages/page-knowledge-base';
import { PageDownloads } from './pages/page-downloads';
import { PageCaseStudies } from './pages/page-case-studies';
import { PageTermsConditions } from './pages/page-terms-conditions';
import { PagePrivacyPolicy } from './pages/page-privacy-policy';
import { PageCookiePolicy } from './pages/page-cookie-policy';
import { PageDisclaimer } from './pages/page-disclaimer';
import { PageAcceptableUsePolicy } from './pages/page-acceptable-use-policy';
import { PageSla } from './pages/page-sla';
import { PageCustomerCharter } from './pages/page-customer-charter';

export type PageId =
  | 'home'
  | 'about'
  | 'services'
  | 'industries'
  | 'projects'
  | 'system'
  | 'careers'
  | 'blog'
  | 'contact'
  | 'services-hvac'
  | 'services-electrical'
  | 'services-plumbing'
  | 'services-fire'
  | 'services-preventive'
  | 'services-emergency'
  | 'system-cmms'
  | 'system-portal'
  | 'system-qr'
  | 'system-reports'
  | 'system-mobile'
  | 'system-whatsapp'
  | 'login'
  // Company sub-pages
  | 'our-story'
  | 'mission-vision'
  | 'leadership-team'
  // Resources
  | 'support'
  | 'faq'
  | 'knowledge-base'
  | 'downloads'
  | 'case-studies'
  // Legal
  | 'terms-conditions'
  | 'privacy-policy'
  | 'cookie-policy'
  | 'disclaimer'
  | 'acceptable-use-policy'
  | 'sla'
  | 'customer-charter';

interface PublicWebsiteProps {
  onSignIn?: () => void;
}

const bodyFontStyle: React.CSSProperties = {
  fontFamily: 'var(--hm-body)',
  lineHeight: 1.62,
  WebkitFontSmoothing: 'antialiased',
  color: 'var(--hm-ink)',
};

export function PublicWebsite({ onSignIn: _onSignIn }: PublicWebsiteProps) {
  const [page, setPage] = useState<PageId>('home');

  const navigate = useCallback((id: PageId) => {
    setPage(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Close mobile menu on route change
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = useCallback((id: PageId) => {
    navigate(id);
    setMobileOpen(false);
  }, [navigate]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  const renderPage = () => {
    switch (page) {
      case 'home': return <PageHome navigate={navigate} />;
      case 'about': return <PageAbout navigate={navigate} />;
      case 'services': return <PageServices navigate={navigate} subPage={undefined} />;
      case 'services-hvac': return <PageServices navigate={navigate} subPage="hvac" />;
      case 'services-electrical': return <PageServices navigate={navigate} subPage="electrical" />;
      case 'services-plumbing': return <PageServices navigate={navigate} subPage="plumbing" />;
      case 'services-fire': return <PageServices navigate={navigate} subPage="fire" />;
      case 'services-preventive': return <PageServices navigate={navigate} subPage="preventive" />;
      case 'services-emergency': return <PageServices navigate={navigate} subPage="emergency" />;
      case 'industries': return <PageIndustries navigate={navigate} />;
      case 'projects': return <PageProjects navigate={navigate} />;
      case 'system': return <PageSystem navigate={navigate} subPage={undefined} />;
      case 'system-cmms': return <PageSystem navigate={navigate} subPage="cmms" />;
      case 'system-portal': return <PageSystem navigate={navigate} subPage="portal" />;
      case 'system-qr': return <PageSystem navigate={navigate} subPage="qr" />;
      case 'system-reports': return <PageSystem navigate={navigate} subPage="reports" />;
      case 'system-mobile': return <PageSystem navigate={navigate} subPage="mobile" />;
      case 'system-whatsapp': return <PageSystem navigate={navigate} subPage="whatsapp" />;
      case 'careers': return <PageCareers navigate={navigate} />;
      case 'blog': return <PageBlog navigate={navigate} />;
      case 'contact': return <PageContact navigate={navigate} />;
      case 'login': return <PageLogin navigate={navigate} />;
      // Company sub-pages
      case 'our-story': return <PageOurStory navigate={navigate} />;
      case 'mission-vision': return <PageMissionVision navigate={navigate} />;
      case 'leadership-team': return <PageLeadershipTeam navigate={navigate} />;
      // Resources
      case 'support': return <PageSupport navigate={navigate} />;
      case 'faq': return <PageFaq navigate={navigate} />;
      case 'knowledge-base': return <PageKnowledgeBase navigate={navigate} />;
      case 'downloads': return <PageDownloads navigate={navigate} />;
      case 'case-studies': return <PageCaseStudies navigate={navigate} />;
      // Legal
      case 'terms-conditions': return <PageTermsConditions navigate={navigate} />;
      case 'privacy-policy': return <PagePrivacyPolicy navigate={navigate} />;
      case 'cookie-policy': return <PageCookiePolicy navigate={navigate} />;
      case 'disclaimer': return <PageDisclaimer navigate={navigate} />;
      case 'acceptable-use-policy': return <PageAcceptableUsePolicy navigate={navigate} />;
      case 'sla': return <PageSla navigate={navigate} />;
      case 'customer-charter': return <PageCustomerCharter navigate={navigate} />;
      default: return <PageHome navigate={navigate} />;
    }
  };

  return (
    <div
      style={{
        background: 'var(--hm-paper)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Font preload links */}
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <SiteHeader
        currentPage={page}
        onNavigate={handleNav}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(v => !v)}
      />

      <main style={{ flex: 1, ...bodyFontStyle }}>
        {renderPage()}
      </main>

      <SiteFooter onNavigate={handleNav} />
    </div>
  );
}