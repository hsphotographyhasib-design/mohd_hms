'use client';

import React from 'react';
import type { PageId } from './public-website';

interface SiteFooterProps {
  onNavigate: (id: PageId) => void;
}

const linkStyle: React.CSSProperties = {
  fontFamily: 'var(--hm-body)',
  fontSize: '0.86rem',
  color: 'rgba(247,248,243,0.65)',
  transition: '0.2s',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--hm-disp)',
  fontWeight: 600,
  fontSize: '0.88rem',
  marginBottom: 16,
};

export function SiteFooter({ onNavigate }: SiteFooterProps) {
  return (
    <footer
      style={{
        background: 'var(--hm-forest)',
        color: 'var(--hm-paper)',
        position: 'relative',
        marginTop: 'auto',
      }}
    >
      {/* Watermark */}
      <div
        style={{
          fontFamily: 'var(--hm-disp)',
          fontWeight: 700,
          fontSize: 'clamp(3rem, 10vw, 8rem)',
          letterSpacing: '-0.04em',
          color: 'rgba(247,248,243,0.04)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        MOHD.HMS
      </div>

      <div
        className="mx-auto px-7 py-16"
        style={{ maxWidth: 'var(--hm-container)', position: 'relative', zIndex: 1 }}
      >
        <div
          className="grid gap-12"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          }}
        >
          {/* Brand Column */}
          <div style={{ gridColumn: 'span 1 / span 2' }} className="min-w-0">
            <div className="flex items-center gap-[11px] mb-4">
              <span
                className="grid place-items-center shrink-0"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: 'var(--hm-paper-2)',
                }}
              >
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="var(--hm-forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z" />
                  <path d="M12 7v6M9 9l3-2 3 2M9 15l3 2 3-2" />
                </svg>
              </span>
              <span>
                <span
                  style={{
                    fontFamily: 'var(--hm-disp)',
                    fontWeight: 700,
                    fontSize: '1.26rem',
                    letterSpacing: '-0.01em',
                    color: 'var(--hm-paper)',
                    lineHeight: 1,
                    display: 'block',
                  }}
                >
                  MOHD.HMS
                </span>
                <span
                  style={{
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.64rem',
                    letterSpacing: '0.2em',
                    color: 'rgba(247,248,243,0.45)',
                    textTransform: 'uppercase',
                  }}
                >
                  Enterprise
                </span>
              </span>
            </div>
            <p
              className="mb-5 max-w-[300px]"
              style={{
                fontSize: '0.92rem',
                color: 'rgba(247,248,243,0.72)',
                lineHeight: 1.6,
              }}
            >
              Smart Facility Maintenance &amp; HVAC Solutions — keeping your assets safe, compliant and running.
            </p>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2" style={{ fontSize: '0.84rem', color: 'rgba(247,248,243,0.6)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                Bandar Seri Begawan, Brunei Darussalam
              </span>
              <span className="flex items-center gap-2" style={{ fontSize: '0.84rem', color: 'rgba(247,248,243,0.6)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                </svg>
                +673 000 0000
              </span>
              <span className="flex items-center gap-2" style={{ fontSize: '0.84rem', color: 'rgba(247,248,243,0.6)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
                info@mohdhms.com
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h5 style={headingStyle}>Services</h5>
            {[
              { label: 'HVAC Maintenance', id: 'services-hvac' as PageId },
              { label: 'Electrical Maintenance', id: 'services-electrical' as PageId },
              { label: 'Plumbing Services', id: 'services-plumbing' as PageId },
              { label: 'Fire Protection', id: 'services-fire' as PageId },
              { label: 'Preventive Maintenance', id: 'services-preventive' as PageId },
              { label: 'Corrective Maintenance', id: 'services-emergency' as PageId },
              { label: 'Facility Management', id: 'services' as PageId },
            ].map((item) => (
              <button
                key={item.id + item.label}
                onClick={() => onNavigate(item.id)}
                className="block bg-transparent border-0 cursor-pointer p-0 mb-2"
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.65)'; }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Company */}
          <div>
            <h5 style={headingStyle}>Company</h5>
            {[
              { label: 'About Us', id: 'about' as PageId },
              { label: 'Our Story', id: 'our-story' as PageId },
              { label: 'Mission & Vision', id: 'mission-vision' as PageId },
              { label: 'Leadership Team', id: 'leadership-team' as PageId },
              { label: 'Careers', id: 'careers' as PageId },
              { label: 'Contact Us', id: 'contact' as PageId },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="block bg-transparent border-0 cursor-pointer p-0 mb-2"
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.65)'; }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Industries */}
          <div>
            <h5 style={headingStyle}>Industries</h5>
            {[
              { label: 'Commercial Buildings', id: 'industries' as PageId },
              { label: 'Hotels', id: 'industries' as PageId },
              { label: 'Hospitals', id: 'industries' as PageId },
              { label: 'Government Buildings', id: 'industries' as PageId },
              { label: 'Mosques', id: 'industries' as PageId },
              { label: 'Factories', id: 'industries' as PageId },
              { label: 'Educational Institutions', id: 'industries' as PageId },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.id)}
                className="block bg-transparent border-0 cursor-pointer p-0 mb-2"
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.65)'; }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* System */}
          <div>
            <h5 style={headingStyle}>System</h5>
            {[
              { label: 'CMMS Platform', id: 'system-cmms' as PageId },
              { label: 'Customer Portal', id: 'system-portal' as PageId },
              { label: 'Mobile App', id: 'system-mobile' as PageId },
              { label: 'WhatsApp AI', id: 'system-whatsapp' as PageId },
              { label: 'QR Asset Management', id: 'system-qr' as PageId },
              { label: 'Reports & Analytics', id: 'system-reports' as PageId },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="block bg-transparent border-0 cursor-pointer p-0 mb-2"
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.65)'; }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Resources */}
          <div>
            <h5 style={headingStyle}>Resources</h5>
            {[
              { label: 'Blog', id: 'blog' as PageId },
              { label: 'Knowledge Base', id: 'knowledge-base' as PageId },
              { label: 'FAQ', id: 'faq' as PageId },
              { label: 'Downloads', id: 'downloads' as PageId },
              { label: 'Case Studies', id: 'case-studies' as PageId },
              { label: 'Support Center', id: 'support' as PageId },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="block bg-transparent border-0 cursor-pointer p-0 mb-2"
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.65)'; }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Legal */}
          <div>
            <h5 style={headingStyle}>Legal</h5>
            {[
              { label: 'Privacy Policy', id: 'privacy-policy' as PageId },
              { label: 'Terms & Conditions', id: 'terms-conditions' as PageId },
              { label: 'Cookie Policy', id: 'cookie-policy' as PageId },
              { label: 'Disclaimer', id: 'disclaimer' as PageId },
              { label: 'Acceptable Use Policy', id: 'acceptable-use-policy' as PageId },
              { label: 'Service Level Agreement', id: 'sla' as PageId },
              { label: 'Customer Charter', id: 'customer-charter' as PageId },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="block bg-transparent border-0 cursor-pointer p-0 mb-2"
                style={linkStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.65)'; }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className="flex items-center justify-between mt-12 pt-6 flex-wrap gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex flex-col gap-1">
            <span style={{ fontSize: '0.82rem', color: 'rgba(247,248,243,0.5)' }}>
              &copy; 2026 MOHD.HMS ENTERPRISE. All rights reserved.
            </span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(247,248,243,0.35)' }}>
              Smart Facility Maintenance &amp; HVAC Solutions · Bandar Seri Begawan, Brunei Darussalam
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => onNavigate('privacy-policy')}
              className="bg-transparent border-0 cursor-pointer p-0"
              style={{ fontSize: '0.78rem', color: 'rgba(247,248,243,0.5)', transition: '0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.5)'; }}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigate('terms-conditions')}
              className="bg-transparent border-0 cursor-pointer p-0"
              style={{ fontSize: '0.78rem', color: 'rgba(247,248,243,0.5)', transition: '0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.5)'; }}
            >
              Terms &amp; Conditions
            </button>
            <button
              onClick={() => onNavigate('cookie-policy')}
              className="bg-transparent border-0 cursor-pointer p-0"
              style={{ fontSize: '0.78rem', color: 'rgba(247,248,243,0.5)', transition: '0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.5)'; }}
            >
              Cookie Policy
            </button>
            <div className="flex gap-3 ml-2">
              {/* LinkedIn */}
              <a
                href="#"
                aria-label="LinkedIn"
                style={{ color: 'rgba(247,248,243,0.5)', transition: '0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.5)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4 0 4.75 2.65 4.75 6.1V21h-4v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H9z" />
                </svg>
              </a>
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                style={{ color: 'rgba(247,248,243,0.5)', transition: '0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.5)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9H17l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
                </svg>
              </a>
              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                style={{ color: 'rgba(247,248,243,0.5)', transition: '0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--hm-paper)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(247,248,243,0.5)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}