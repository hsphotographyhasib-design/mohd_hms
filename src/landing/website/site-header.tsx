'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { PageId } from './public-website';

/* Navigation items — matches landing.html header */
const NAV_ITEMS: { id: PageId; label: string; children?: { id: PageId; label: string }[] }[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  {
    id: 'services',
    label: 'Services',
    children: [
      { id: 'services-hvac', label: 'HVAC Maintenance' },
      { id: 'services-electrical', label: 'Electrical' },
      { id: 'services-plumbing', label: 'Plumbing & Mechanical' },
      { id: 'services-fire', label: 'Fire Protection' },
      { id: 'services-preventive', label: 'Preventive Maintenance' },
      { id: 'services-emergency', label: 'Emergency Breakdown' },
    ],
  },
  { id: 'industries', label: 'Industries' },
  { id: 'projects', label: 'Projects' },
  {
    id: 'system',
    label: 'System',
    children: [
      { id: 'system-cmms', label: 'CMMS Platform' },
      { id: 'system-portal', label: 'Client Portal' },
      { id: 'system-qr', label: 'QR Asset Management' },
      { id: 'system-reports', label: 'Reports & Analytics' },
      { id: 'system-mobile', label: 'Mobile App' },
      { id: 'system-whatsapp', label: 'WhatsApp AI' },
    ],
  },
  { id: 'careers', label: 'Careers' },
  { id: 'blog', label: 'Blog' },
  { id: 'contact', label: 'Contact' },
];

interface SiteHeaderProps {
  currentPage: PageId;
  onNavigate: (id: PageId) => void;
  onSignIn?: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

export function SiteHeader({
  currentPage,
  onNavigate,
  mobileOpen,
  onMobileToggle,
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isActive = (id: PageId) => {
    if (id === currentPage) return true;
    // For parent items like 'services', check if any sub-page is active
    const item = NAV_ITEMS.find(n => n.id === id);
    if (item?.children) {
      return item.children.some(c => c.id === currentPage);
    }
    return false;
  };

  const handleDropdownEnter = (id: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setHoveredDropdown(id);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setHoveredDropdown(null);
    }, 150);
  };

  const handleItemClick = (item: typeof NAV_ITEMS[0]) => {
    if (item.children) {
      // Clicking the parent navigates to the main page
      onNavigate(item.id);
      setHoveredDropdown(null);
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <>
      {/* Utility Bar */}
      <div
        style={{
          background: 'var(--hm-forest-2)',
          color: 'rgba(247,248,243,0.78)',
          fontSize: '0.78rem',
        }}
      >
        <div
          className="mx-auto flex items-center gap-[22px] px-7"
          style={{ height: 38, maxWidth: 'var(--hm-container)' }}
        >
          <span className="hidden sm:flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            Bandar Seri Begawan, Brunei
          </span>
          <div className="ml-auto flex gap-5 items-center">
            <a
              href="mailto:info@mohdhms.com"
              className="hidden sm:inline"
              style={{ color: 'rgba(247,248,243,0.9)' }}
            >
              info@mohdhms.com
            </a>
            <a
              href="tel:+6739999999"
              className="flex items-center gap-1.5"
              style={{ color: '#FFD9C7' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              24/7 Emergency: +673 999 9999
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: scrolled
            ? 'color-mix(in srgb, var(--hm-paper) 88%, transparent)'
            : 'var(--hm-paper)',
          backdropFilter: scrolled ? 'blur(12px)' : undefined,
          borderBottom: scrolled ? '1px solid var(--hm-line)' : '1px solid transparent',
          boxShadow: scrolled ? '0 10px 30px -24px rgba(11,40,29,0.4)' : undefined,
          transition: '0.3s var(--hm-ease)',
        }}
      >
        <div
          className="mx-auto flex items-center gap-[26px] px-7"
          style={{ height: 72, maxWidth: 'var(--hm-container)' }}
        >
          {/* Brand */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-[11px] bg-transparent border-0 cursor-pointer p-0"
            aria-label="MOHD.HMS Enterprise"
          >
            <span
              className="grid place-items-center shrink-0"
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                background: 'var(--hm-forest)',
              }}
            >
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="var(--hm-paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  color: 'var(--hm-forest)',
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
                  color: 'var(--hm-faint)',
                  textTransform: 'uppercase',
                }}
              >
                Enterprise
              </span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex gap-1 ml-2" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => item.children && handleDropdownEnter(item.id)}
                onMouseLeave={item.children ? handleDropdownLeave : undefined}
              >
                <button
                  onClick={() => handleItemClick(item)}
                  className="relative px-[0.66rem] py-2 text-[0.9rem] bg-transparent border-0 cursor-pointer rounded-[7px]"
                  style={{
                    fontFamily: 'var(--hm-body)',
                    color: isActive(item.id) ? 'var(--hm-forest)' : 'var(--hm-muted)',
                    transition: '0.2s',
                  }}
                >
                  {item.label}
                  {/* Underline indicator */}
                  <span
                    style={{
                      position: 'absolute',
                      left: '0.66rem',
                      right: '0.66rem',
                      bottom: '0.34rem',
                      height: 1.5,
                      background: 'var(--hm-green)',
                      transform: isActive(item.id) ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left',
                      transition: 'transform 0.25s var(--hm-ease)',
                    }}
                  />
                  {item.children && (
                    <svg
                      className="inline ml-0.5"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginBottom: 2 }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </button>

                {/* Dropdown */}
                {item.children && hoveredDropdown === item.id && (
                  <div
                    className="absolute top-full left-0 pt-2"
                    style={{ minWidth: 220, zIndex: 70 }}
                    onMouseEnter={() => handleDropdownEnter(item.id)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div
                      style={{
                        background: 'var(--hm-paper-2)',
                        border: '1px solid var(--hm-line)',
                        borderRadius: 'var(--hm-r)',
                        boxShadow: '0 16px 48px -12px rgba(11,40,29,0.25)',
                        padding: '6px',
                        animation: 'fadeIn 0.15s var(--hm-ease)',
                      }}
                    >
                      {/* Parent link */}
                      <button
                        onClick={() => onNavigate(item.id)}
                        className="w-full text-left px-3 py-2 rounded-[8px] bg-transparent border-0 cursor-pointer flex items-center gap-2"
                        style={{
                          fontFamily: 'var(--hm-disp)',
                          fontWeight: 500,
                          fontSize: '0.9rem',
                          color: 'var(--hm-forest)',
                        }}
                      >
                        All {item.label}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </button>
                      <div className="h-px my-1" style={{ background: 'var(--hm-line-soft)' }} />
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            onNavigate(child.id);
                            setHoveredDropdown(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-[8px] bg-transparent border-0 cursor-pointer"
                          style={{
                            fontFamily: 'var(--hm-body)',
                            fontSize: '0.86rem',
                            color: currentPage === child.id ? 'var(--hm-forest)' : 'var(--hm-muted)',
                            background: currentPage === child.id ? 'var(--hm-stone)' : undefined,
                            transition: '0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (currentPage !== child.id) {
                              (e.currentTarget as HTMLElement).style.background = 'var(--hm-stone)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentPage !== child.id) {
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }
                          }}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => onNavigate('login')}
              className="hidden lg:grid place-items-center bg-transparent border-[1px] cursor-pointer shrink-0"
              style={{
                width: 42,
                height: 42,
                borderRadius: 9,
                borderColor: 'var(--hm-line)',
                transition: '0.2s',
              }}
              aria-label="Sign in"
              title="Sign in"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--hm-forest)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-forest)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--hm-line)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--hm-forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={onMobileToggle}
              className="lg:hidden grid place-items-center bg-transparent border-[1px] cursor-pointer"
              style={{
                width: 40,
                height: 40,
                borderRadius: 9,
                borderColor: 'var(--hm-line)',
                color: 'var(--hm-forest)',
              }}
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Panel */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 110,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 55,
            background: 'var(--hm-paper)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflow: 'auto',
            animation: 'fadeIn 0.2s var(--hm-ease)',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                className="w-full text-left py-[0.85rem] px-2 bg-transparent border-0 border-b cursor-pointer"
                style={{
                  fontFamily: 'var(--hm-disp)',
                  fontWeight: 500,
                  fontSize: '1.08rem',
                  color: 'var(--hm-forest)',
                  borderBottom: '1px solid var(--hm-line-soft)',
                }}
              >
                {item.label}
              </button>
              {/* Show children inline */}
              {item.children && isActive(item.id) && (
                <div className="pl-4">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        onNavigate(child.id);
                        onMobileToggle();
                      }}
                      className="w-full text-left py-2 px-2 bg-transparent border-0 cursor-pointer"
                      style={{
                        fontFamily: 'var(--hm-body)',
                        fontSize: '0.92rem',
                        color: currentPage === child.id ? 'var(--hm-green)' : 'var(--hm-muted)',
                        borderBottom: '1px solid var(--hm-line-soft)',
                      }}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { onNavigate('login'); onMobileToggle(); }}
              className="flex-1 justify-center flex items-center gap-2"
              style={{
                fontFamily: 'var(--hm-body)',
                fontWeight: 600,
                fontSize: '0.94rem',
                padding: '0.82rem 1.4rem',
                borderRadius: 'var(--hm-r-sm)',
                border: '1px solid transparent',
                background: 'var(--hm-forest)',
                color: 'var(--hm-paper)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Sign in
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--hm-paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Dropdown animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}