'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
// CSS loaded via <link> tag below to avoid affecting authenticated app styles

const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Industries', href: '#industries' },
  { label: 'Projects', href: '#projects' },
  { label: 'System', href: '#overview' },
  { label: 'Careers', href: '#careers' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
]

const MOBILE_NAV_ITEMS = [
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Industries', href: '#industries' },
  { label: 'Projects', href: '#projects' },
  { label: 'System Overview', href: '#overview' },
  { label: 'Careers', href: '#careers' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
]

interface PublicLayoutProps {
  children: ReactNode
  onSignIn?: () => void
}

export function PublicLayout({ children, onSignIn }: PublicLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const scrollRun = useRef(false)

  // Scroll effects
  useEffect(() => {
    const onScroll = () => {
      if (!scrollRun.current) {
        scrollRun.current = true
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10)
          setShowTop(window.scrollY > 700)
          scrollRun.current = false
        })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reveal animations
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    document.querySelectorAll('.reveal, .imgrise').forEach(el => io.observe(el))
    return () => io.disconnect()
  })

  // Active nav tracking based on scroll position
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      if (!scrollRun.current) {
        scrollRun.current = true
        requestAnimationFrame(() => {
          forceUpdate(n => n + 1)
          scrollRun.current = false
        })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on hash change
  const [activeSection, setActiveSection] = useState('home')
  useEffect(() => {
    const sections = NAV_ITEMS.map(n => n.href.replace('#', '')).map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveSection(e.target.id)
            break
          }
        }
      },
      { threshold: 0.2, rootMargin: '-80px 0px -50% 0px' }
    )
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [])

  const isActive = (href: string) => {
    const id = href.replace('#', '')
    if (!activeSection && id === 'home') return true
    return activeSection === id
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/landing-styles.css" />
      <script dangerouslySetInnerHTML={{ __html: 'function imgErr(el){if(el.dataset.fb){el.src=el.dataset.fb;el.removeAttribute("data-fb")}else{el.style.display="none"}}' }} />

      {/* Utility bar is rendered once in layout.tsx via <TopUtilityBar /> */}

      {/* Header */}
      <header id="hdr" className={scrolled ? 'scrolled' : ''}>
        <div className="container nav">
          <a href="#home" className="brand" aria-label="MOHD.HMS Enterprise">
            <span className="bmark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z"/><path d="M12 7v6M9 9l3-2 3 2M9 15l3 2 3-2"/></svg>
            </span>
            <span><span className="bname">MOHD.HMS</span><br /><span className="bsub">Enterprise</span></span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            {NAV_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                style={isActive(item.href) ? { color: 'var(--forest)' } : undefined}
                data-active={isActive(item.href) ? 'true' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <a
              href="#"
              className="signin"
              aria-label="Sign in"
              title="Sign in"
              onClick={e => { e.preventDefault(); onSignIn?.() }}
            >
              <span className="signin-ico" />
            </a>
            <button
              className="hamburger"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile panel */}
      <div className={`mpanel ${menuOpen ? 'open' : ''}`}>
        {MOBILE_NAV_ITEMS.map(item => (
          <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={isActive(item.href) ? { color: 'var(--green)' } : undefined}>
            {item.label}
          </a>
        ))}
        <div className="mp-act">
          <a
            href="#"
            className="btn btn-fill"
            style={{ width: '100%' }}
            onClick={e => { e.preventDefault(); onSignIn?.(); setMenuOpen(false) }}
          >
            Sign in
            <span className="signin-ico" style={{ width: 18, height: 18, backgroundColor: 'var(--paper)' }} />
          </a>
        </div>
      </div>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer>
        <div className="fwm">MOHD.HMS</div>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="brand">
                <span className="bmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z"/><path d="M12 7v6M9 9l3-2 3 2M9 15l3 2 3-2"/></svg></span>
                <span><span className="bname">MOHD.HMS</span><br /><span className="bsub" style={{ color: 'rgba(247,248,243,.45)' }}>Enterprise</span></span>
              </div>
              <p>Facility maintenance and engineering services — keeping your assets safe, compliant and running.</p>
              <div className="foot-c">
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> Bandar Seri Begawan, Brunei</span>
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.4 2.4 1.3 4 .2 5.2L8.1 9.9a16 16 0 0 0 6 6"/></svg> +673 000 0000</span>
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg> info@mohdhms.com</span>
              </div>
            </div>
            <div className="fcol">
              <h5>Services</h5>
              <a href="#services">HVAC maintenance</a>
              <a href="#services">Electrical</a>
              <a href="#services">Fire protection</a>
              <a href="#services">Preventive</a>
              <a href="#services">Emergency</a>
            </div>
            <div className="fcol">
              <h5>Company</h5>
              <a href="#about">About us</a>
              <a href="#projects">Projects</a>
              <a href="#industries">Industries</a>
              <a href="#careers">Careers</a>
              <a href="#blog">Blog</a>
            </div>
            <div className="fcol">
              <h5>Clients</h5>
              <a href="#">Sign in</a>
              <a href="#overview">System overview</a>
              <a href="#projects">Projects</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="fcol">
              <h5>Legal</h5>
              <a href="#">Privacy policy</a>
              <a href="#">Terms &amp; conditions</a>
              <a href="#">HSE policy</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>© 2026 MOHD.HMS ENTERPRISE. All rights reserved.</span>
            <div className="socials">
              <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4 0 4.75 2.65 4.75 6.1V21h-4v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H9z"/></svg></a>
              <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9H17l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg></a>
              <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating action buttons */}
      <div className="fabs">
        <button className={`fab top ${showTop ? 'show' : ''}`} aria-label="Scroll to top" onClick={scrollToTop}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
        </button>
        <a className="fab em" href="tel:+6739999999" aria-label="Emergency"><span className="tip">24/7 emergency</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></a>
        <a className="fab call" href="tel:+6730000000" aria-label="Call"><span className="tip">Call us</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg></a>
        <a className="fab wa" href="#" aria-label="WhatsApp"><span className="tip">WhatsApp</span><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.5 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3-1-1.7-.9-2.9-2.6-3-2.7-.1-.1-.8-1-.8-2s.5-1.4.7-1.6c.2-.2.4-.2.5-.2h.4c.2 0 .3 0 .5.4l.7 1.6c0 .2.1.3 0 .5l-.4.5c-.2.2-.3.3-.1.6.2.3.8 1.2 1.6 1.9 1.1.9 1.8 1.1 2 1.2.2.1.3.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.7c.2.1.4.2.4.3.1.2.1.7-.1 1.3z"/></svg></a>
      </div>

      {/* Active nav underline style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .nav-links a[data-active="true"]::after { transform: scaleX(1) !important; }
      ` }} />
    </>
  )
}