'use client'

import { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  I, ic, IMG, fl,
  defaultSectors, defaultWhy, defaultCaps, defaultIndustries,
  defaultOpsStats, defaultFeed, defaultSteps, defaultProjects, defaultProjStats,
  defaultPfeats, defaultDig, defaultTeam, defaultQuotes, defaultPosts,
  defaultVacs, defaultBenefits,
  getServices, getIndustries, getTestimonials, getProjects, getBlogs, getCareers,
  type CMSData,
} from '../landing-data'
import { useLandingData } from '../use-landing-data'

/* ── Reveal hook ── */
function useReveal(deps?: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    root.querySelectorAll('.reveal, .imgrise').forEach(el => io.observe(el))
    return () => io.disconnect()
    }, deps)
  return ref
}

/* ── Helper to get uploads base64 (simplified) ── */
function up(key: string) {
  if (typeof window !== 'undefined' && (window as any).UP?.[key]) {
    return `<img src="${(window as any).UP[key]}" loading="lazy" alt="">`
  }
  return ''
}

/* ──── SECTION COMPONENTS ──── */

export function HeroSection() {
  const { cms } = useLandingData()
  const hero = cms?.hero
  return (
    <section className="hero" id="home">
      <div className="container hero-grid">
        <div className="reveal in">
          <div className="kicker">Facility maintenance &amp; engineering</div>
          <h1 dangerouslySetInnerHTML={{ __html: hero?.headline || 'Engineered upkeep for <em>serious facilities</em>.' }} />
          <p className="lead">{hero?.subheadline || 'MOHD.HMS ENTERPRISE keeps buildings and plants running — HVAC, electrical, plumbing, mechanical and fire protection, delivered by certified teams and tracked through a modern maintenance system.'}</p>
          <div className="hero-cta">
            <Link href="/contact" className="btn btn-fill" id="heroCta1">
              {hero?.cta1Text || 'Contact us'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <Link href="/services" className="btn btn-out" id="heroCta2">{hero?.cta2Text || 'Our services'}</Link>
          </div>
          <div className="hero-meta">
            <div className="m"><div className="mn">{hero?.stat1Value || '15+'}</div><div className="ml">{hero?.stat1Label || 'Years experience'}</div></div>
            <div className="m"><div className="mn">{hero?.stat2Value || '24/7'}</div><div className="ml">{hero?.stat2Label || 'Emergency cover'}</div></div>
            <div className="m"><div className="mn">{hero?.stat3Value || '1,200+'}</div><div className="ml">{hero?.stat3Label || 'Assets maintained'}</div></div>
          </div>
        </div>
        <div className="hero-figs reveal in d2">
          <div className="fig hero-fig imgrise">
            <span className="ico" dangerouslySetInnerHTML={{ __html: ic(IMG, 1.4) }} />
            <div dangerouslySetInnerHTML={{ __html: up('hero') || '<span style="display:grid;place-items:center;width:100%;height:100%;color:var(--faint);font-family:var(--mono);font-size:.8rem">Hero image</span>' }} />
            <span className="cap">On site — rooftop HVAC service</span>
          </div>
          <div className="fig hero-mini imgrise">
            <span className="ico" dangerouslySetInnerHTML={{ __html: ic(IMG, 1.4) }} />
            <div dangerouslySetInnerHTML={{ __html: up('gauges') || '' }} />
          </div>
          <div className="hero-chip">
            <span className="hc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
            <div><b>{hero?.chipText || '98% SLA met'}</b><span>{hero?.chipSubtext || 'across active contracts'}</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SectorsStrip() {
  const { cms } = useLandingData()
  const sectors = defaultSectors
  return (
    <div className="sectors">
      <div className="container">
        <p className="lbl">Maintaining mission-critical facilities across</p>
        <div className="sect-row" dangerouslySetInnerHTML={{
          __html: sectors.map(([t, p]) => `<span>${ic(p as string, 1.9)}${t}</span>`).join('')
        }} />
      </div>
    </div>
  )
}

export function AboutSection() {
  const { cms } = useLandingData()
  const about = cms?.about
  const ref = useReveal([cms])

  const aboutDesc = about?.description || 'From routine preventive maintenance to emergency breakdowns, our certified technicians respond fast and document every job through our maintenance management system — so clients always know exactly what was done, when, and by whom.'
  const mvv = about
    ? [['Mission', about.mission], ['Vision', about.vision], ['Values', about.values]].filter(([, v]) => v)
    : [['Mission', 'To deliver reliable, safe and efficient maintenance that protects our clients\' assets and uptime.'], ['Vision', 'To be the region\'s most trusted facility maintenance and engineering partner.'], ['Values', '<b>Safety first.</b> Integrity, craftsmanship, responsiveness and continuous improvement.']]

  return (
    <section className="section" id="about" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">01 — About</span><span className="rule" /></div>
          <h2>A maintenance partner built on accountability.</h2>
        </div>
        <div className="about-grid">
          <div className="reveal">
            <div className="fig about-fig imgrise">
              <span className="ico" dangerouslySetInnerHTML={{ __html: ic(IMG, 1.4) }} />
              <div dangerouslySetInnerHTML={{ __html: up('about') || '' }} />
            </div>
            <div className="about-stat"><div className="n">500+</div><div className="l">Projects delivered</div></div>
          </div>
          <div className="reveal d1">
            <p className="about-lead">We are a multi-disciplinary engineering and maintenance company serving commercial, industrial, healthcare and government facilities.</p>
            <p className="about-body">{aboutDesc}</p>
            <div className="mvv">
              {mvv.map(([k, v]) => (
                <div key={k} className="mvv-item"><span className="k">{k}</span><p dangerouslySetInnerHTML={{ __html: v as string }} /></div>
              ))}
            </div>
          </div>
        </div>
        <div className="why-row" dangerouslySetInnerHTML={{
          __html: defaultWhy.map(([t, d, p], i) =>
            `<div class="why-cell reveal ${i ? 'd' + i : ''}"><span class="wi">${ic(p as string)}</span><b>${t}</b><p>${d}</p></div>`
          ).join('')
        }} />
      </div>
    </section>
  )
}

export function ServicesSection() {
  const { cms } = useLandingData()
  const svcData = getServices(cms)
  const ref = useReveal([cms])
  return (
    <section className="section stone" id="services" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">02 — Services</span><span className="rule" /></div>
          <h2>Complete maintenance, under one contract.</h2>
          <p className="lede">A full range of engineering and facility services — available individually or bundled into an annual maintenance contract with guaranteed response times.</p>
        </div>
        <div className="cap-grid" dangerouslySetInnerHTML={{
          __html: svcData.map(([cl, items]) =>
            `<div class="cap-col reveal"><div class="cl">${cl}</div>${items.map(([n, d, p]) =>
              `<div class="cap-item"><span class="cci">${ic(p as string)}</span><div><b>${n}</b><span>${d}</span></div></div>`
            ).join('')}</div>`
          ).join('')
        }} />
      </div>
    </section>
  )
}

export function IndustriesSection() {
  const { cms } = useLandingData()
  const indData = getIndustries(cms)
  const ref = useReveal([cms])
  return (
    <section className="section" id="industries" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">03 — Industries</span><span className="rule" /></div>
          <h2>Trusted across demanding environments.</h2>
        </div>
        <div className="ind-grid" dangerouslySetInnerHTML={{
          __html: indData.map(([t, p], i) =>
            `<div class="ind reveal ${i % 4 ? 'd' + (i % 4) : ''}"><span class="ii">${ic(p as string)}</span><span>${t}</span></div>`
          ).join('')
        }} />
      </div>
    </section>
  )
}

export function SystemSection() {
  const ref = useReveal()
  const barsData: [string, number][] = [['Sep', 62], ['Oct', 74], ['Nov', 58], ['Dec', 83], ['Jan', 71], ['Feb', 92], ['Mar', 88]]
  const maxH = Math.max(...barsData.map(([, v]) => v))

  return (
    <section className="section forest" id="overview" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">04 — System overview</span><span className="rule" /></div>
          <h2>Real-time visibility on every facility.</h2>
          <p className="lede">Our maintenance management system gives clients and teams one live view of equipment, complaints and work orders — connected to real operational data.</p>
        </div>
        <div className="ops reveal">
          <div className="ops-head"><b>Operations overview</b><span className="ops-live"><span className="d" /> Live</span></div>
          <div className="ops-stats" dangerouslySetInnerHTML={{
            __html: defaultOpsStats.map(([n, l]) => `<div class="ops-stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('')
          }} />
          <div className="ops-low">
            <div className="ops-chart">
              <div className="ct">Work orders completed · last 7 months</div>
              <div className="bars" dangerouslySetInnerHTML={{
                __html: barsData.map(([m, v]) => `<div class="col"><div class="bar" style="height:${Math.round(v / maxH * 120)}px"></div><div class="bl">${m}</div></div>`).join('')
              }} />
            </div>
            <div className="ops-feed">
              <div className="ct">Recent activity</div>
              <div dangerouslySetInnerHTML={{
                __html: defaultFeed.map(([t, c, tm]) => `<div class="frow"><span class="fk" style="background:${c}"></span>${t}<small>${tm}</small></div>`).join('')
              }} />
            </div>
          </div>
        </div>
        <p className="ops-note">Figures are representative until the maintenance system API is connected.</p>
      </div>
    </section>
  )
}

export function WorkflowSection() {
  const ref = useReveal()
  return (
    <section className="section" id="workflow" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">05 — Workflow</span><span className="rule" /></div>
          <h2>A clear, accountable path for every job.</h2>
        </div>
        <div className="flow" dangerouslySetInnerHTML={{
          __html: defaultSteps.map(([t, d, p], i) =>
            `<div class="fstep reveal"><span class="num">0${i + 1}</span><span class="fic">${ic(p as string)}</span><h4>${t}</h4><p>${d}</p></div>`
          ).join('')
        }} />
      </div>
    </section>
  )
}

export function ProjectsSection() {
  const { cms } = useLandingData()
  const projData = getProjects(cms)
  const ref = useReveal([cms])
  const filterRef = useRef<HTMLDivElement>(null)

  const handleFilter = useCallback((cat: string) => {
    if (!filterRef.current) return
    filterRef.current.querySelectorAll('button').forEach(b => b.classList.remove('active'))
    filterRef.current.querySelector(`[data-c="${cat}"]`)?.classList.add('active')
    document.querySelectorAll('.proj').forEach(p => {
      p.classList.toggle('hide', cat !== 'all' && (p as HTMLElement).dataset.cat !== cat)
    })
  }, [])

  const cats: [string, string][] = [['all', 'All'], ['hvac', 'HVAC'], ['electrical', 'Electrical'], ['fire', 'Fire'], ['civil', 'Civil']]

  return (
    <section className="section stone" id="projects" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">06 — Projects</span><span className="rule" /></div>
          <h2>Work delivered across the region.</h2>
        </div>
        <div className="pfilter" ref={filterRef} onClick={e => {
          const b = (e.target as HTMLElement).closest('button')
          if (b) handleFilter(b.dataset.c || 'all')
        }} dangerouslySetInnerHTML={{
          __html: cats.map(([c, l], i) => `<button class="${i ? '' : 'active'}" data-c="${c}">${l}</button>`).join('')
        }} />
        <div className="proj-grid" dangerouslySetInnerHTML={{
          __html: projData.map((p: any) => {
            const media = `<div class="fig"><span class="ico">${ic(IMG, 1.4)}</span>${p.up ? up(p.up) : fl(600, 450, p.kw, p.lk, p.sd)}</div>`
            return `<article class="proj reveal" data-cat="${p.cat}"><div style="position:relative"><span class="ptag">${p.meta[0]}</span><span class="pst ${p.st}">${p.st === 'done' ? 'Completed' : 'Ongoing'}</span>${media}</div><h4>${p.t}</h4><div class="pm">${p.m}</div><div class="pmeta"><span>${p.meta[0]}</span><span>${p.meta[1]}</span></div></article>`
          }).join('')
        }} />
        <div className="proj-stats" dangerouslySetInnerHTML={{
          __html: defaultProjStats.map(([n, l]) => `<div class="pstat reveal"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('')
        }} />
      </div>
    </section>
  )
}

export function PortalSection() {
  const ref = useReveal()
  return (
    <section className="section" id="portal" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">07 — Self-service</span><span className="rule" /></div>
          <h2>Manage your facility from one place.</h2>
        </div>
        <div className="portal-grid">
          <div className="reveal">
            <p style={{ color: 'var(--muted)', maxWidth: '48ch' }}>Clients log in to raise complaints, scan equipment, track work and view their full service history — anytime, from any device.</p>
            <div className="pf-list" dangerouslySetInnerHTML={{
              __html: defaultPfeats.map(([t, p]) => `<div class="pf"><span class="pi">${ic(p as string)}</span><b>${t}</b></div>`).join('')
            }} />
          </div>
          <div className="reveal d2">
            <div className="device"><div className="dev-screen">
              <div className="dev-head"><div className="av" /><span className="t">Client app</span></div>
              <div className="dev-card"><div className="s">Open requests</div><div className="dev-stat">3 active</div></div>
              <div className="dev-card"><div className="t">Complaint #2294 · Chiller</div><div className="s">Technician en route · ETA 12 min</div></div>
              <div className="dev-card"><div className="t">Scan equipment QR</div><div className="s">Pull asset history instantly</div></div>
              <div className="dev-card"><div className="t">Latest invoice · INV-1043</div><div className="s">Ready to view</div></div>
              <div className="dev-btn">Submit a complaint</div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function DigitalSection() {
  const ref = useReveal()
  return (
    <section className="section stone" id="digital" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">08 — Technology</span><span className="rule" /></div>
          <h2>Engineering, backed by smart software.</h2>
          <p className="lede">A digital layer over every service keeps work transparent, scheduled and measurable.</p>
        </div>
        <div className="dig-grid" dangerouslySetInnerHTML={{
          __html: defaultDig.map(([t, d, p], i) =>
            `<div class="dig reveal ${i % 4 ? 'd' + (i % 4) : ''}"><span class="di">${ic(p as string)}</span><b>${t}</b><p>${d}</p></div>`
          ).join('')
        }} />
      </div>
    </section>
  )
}

export function TeamSection() {
  const ref = useReveal()
  return (
    <section className="section" id="team" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">09 — Team</span><span className="rule" /></div>
          <h2>Certified people behind every job.</h2>
          <p className="lede">Management, supervisors, technicians and support — working as one accountable team.</p>
        </div>
        <div className="team-grid" dangerouslySetInnerHTML={{
          __html: defaultTeam.map(([n, r, im, d], i) =>
            `<div class="member reveal ${i ? 'd' + i : ''}"><div class="fig"><span class="ico">${ic(I.user, 1.5)}</span><img src="https://i.pravatar.cc/320?img=${im}" data-fb="https://picsum.photos/seed/tm${im}/320/360" loading="lazy" onerror="imgErr(this)" alt="${n}"></div><b>${n}</b><div class="role">${r}</div><p>${d}</p></div>`
          ).join('')
        }} />
      </div>
    </section>
  )
}

export function TestimonialsSection() {
  const { cms } = useLandingData()
  const qData = getTestimonials(cms)
  const ref = useReveal([cms])
  const [qi, setQi] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setQi(i => (i + 1) % qData.length), 5500)
    return () => clearInterval(timer)
  }, [qData.length])

  return (
    <section className="section stone" id="testimonials" ref={ref}>
      <div className="container">
        <div className="quote reveal">
          <div className="qm">&ldquo;</div>
          <div>
            {qData.map((q, i) => (
              <div key={i} className={`qbody ${i === qi ? 'show' : ''}`} data-q={i}>
                <blockquote>{q.q}</blockquote>
                <div className="qwho">
                  <img src={`https://i.pravatar.cc/120?img=${q.im}`} data-fb={`https://picsum.photos/seed/q${q.im}/120/120`} onerror="imgErr(this)" alt={q.n} />
                  <div style={{ textAlign: 'left' }}><b>{q.n}</b><span>{q.r}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="qnav">
            {qData.map((_, i) => (
              <button key={i} className={`qdot ${i === qi ? 'active' : ''}`} data-i={i} aria-label={`Quote ${i + 1}`} onClick={() => setQi(i)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function BlogSection() {
  const { cms } = useLandingData()
  const blogData = getBlogs(cms)
  const ref = useReveal([cms])
  const f = blogData[0] as any

  return (
    <section className="section" id="blog" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">10 — Insights</span><span className="rule" /></div>
          <h2>Articles &amp; company news.</h2>
        </div>
        <div className="blog-grid">
          {f && (
            <article className="feature reveal" dangerouslySetInnerHTML={{
              __html: `<div class="fig imgrise"><span class="ico">${ic(IMG, 1.4)}</span>${f[7] ? up(f[7]) : fl(820, 460, f[4] || 'maintenance', f[5] || 81, f[6] || 'b1')}</div><span class="cat">${f[0]}</span><h3>${f[1]}</h3><p>${f[2]}</p><div class="meta">${f[3]}</div>`
            }} />
          )}
          <div className="blog-side" dangerouslySetInnerHTML={{
            __html: blogData.slice(1).map((p: any) =>
              `<div class="mini"><div class="fig"><span class="ico">${ic(IMG, 1.4)}</span>${p[7] ? up(p[7]) : fl(200, 200, p[4] || 'maintenance', p[5] || 82, p[6] || 'b2')}</div><div><span class="cat">${p[0]}</span><h4>${p[1]}</h4><div class="meta">${p[3]}</div></div></div>`
            ).join('')
          }} />
        </div>
      </div>
    </section>
  )
}

export function CareersSection() {
  const { cms } = useLandingData()
  const careerData = getCareers(cms)
  const ref = useReveal([cms])
  return (
    <section className="section stone" id="careers" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">11 — Careers</span><span className="rule" /></div>
          <h2>Build your career with our team.</h2>
          <p className="lede">We invest in our people with training, certification and a strong safety culture.</p>
        </div>
        <div className="career-grid">
          <div className="reveal">
            <div dangerouslySetInnerHTML={{
              __html: careerData.map(([t, m]) =>
                `<div class="vac reveal"><div><b>${t}</b><br><span>${m}</span></div><a href="/contact" class="btn btn-out btn-sm vb">Apply now</a></div>`
              ).join('')
            }} />
            <p className="cnote">Don&apos;t see your role? Send your CV to <Link href="/contact">careers@mohdhms.com</Link> — we&apos;re always hiring skilled technicians.</p>
          </div>
          <div className="reveal d1">
            <div className="fig imgrise" style={{ aspectRatio: '4/2.7', borderRadius: 'var(--r)', border: '1px solid var(--line)', marginBottom: 24 }}>
              <span className="ico" dangerouslySetInnerHTML={{ __html: ic(IMG, 1.4) }} />
              <div dangerouslySetInnerHTML={{ __html: up('tools') || '' }} />
            </div>
            <div className="ben" dangerouslySetInnerHTML={{
              __html: defaultBenefits.map(([t, d, p]) =>
                `<div class="ben-item"><span class="bi">${ic(p as string)}</span><div><b>${t}</b><p>${d}</p></div></div>`
              ).join('')
            }} />
          </div>
        </div>
      </div>
    </section>
  )
}

export function ContactSection() {
  const ref = useReveal()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = {
      name: (form.querySelector('#cn') as HTMLInputElement)?.value || '',
      email: (form.querySelector('#ce') as HTMLInputElement)?.value || '',
      phone: (form.querySelector('#cp') as HTMLInputElement)?.value || '',
      subject: 'Website enquiry',
      message: (form.querySelector('#cmsg') as HTMLTextAreaElement)?.value || '',
      source: 'website',
    }
    fetch('/api/cms/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {})
    setSubmitted(true)
    form.reset()
    setTimeout(() => setSubmitted(false), 5000)
  }, [])

  return (
    <section className="section" id="contact" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">12 — Contact</span><span className="rule" /></div>
          <h2>Talk to our maintenance team.</h2>
          <p className="lede">Reach out for service enquiries, contracts or emergency support — we respond fast.</p>
        </div>
        <div className="contact-grid">
          <div className="reveal">
            <div className="cinfo">
              <div className="crow"><span className="cci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5" /></svg></span><div><b>Office</b><span>Unit 5, Industrial Avenue, Bandar Seri Begawan, Brunei Darussalam</span></div></div>
              <div className="crow"><span className="cci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg></span><div><b>Phone &amp; WhatsApp</b><span><a href="tel:+6730000000">+673 000 0000</a> · <a href="#">WhatsApp chat</a></span></div></div>
              <div className="crow"><span className="cci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg></span><div><b>Email</b><span><a href="mailto:info@mohdhms.com">info@mohdhms.com</a></span></div></div>
              <div className="crow"><span className="cci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><div><b>Working hours</b><span>Monday – Saturday · 8:00am – 6:00pm</span></div></div>
              <div className="crow em"><span className="cci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg></span><div><b>24/7 emergency line</b><span><a href="tel:+6739999999">+673 999 9999</a> — breakdowns &amp; critical faults</span></div></div>
            </div>
            <div className="cmap">
              <iframe title="Office location" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=114.90%2C4.87%2C114.98%2C4.93&layer=mapnik&marker=4.9031%2C114.9398" />
            </div>
          </div>
          <div className="cform reveal d1">
            <h3>Send us a message</h3>
            <p className="csub">Tell us what you need and our team will respond within one business day.</p>
            <form onSubmit={handleSubmit}>
              <div className="frow2">
                <div className="field"><label htmlFor="cn">Full name</label><input id="cn" required placeholder="Your name" /></div>
                <div className="field"><label htmlFor="cp">Phone</label><input id="cp" placeholder="+673" /></div>
              </div>
              <div className="field"><label htmlFor="ce">Email</label><input id="ce" type="email" required placeholder="you@company.com" /></div>
              <div className="field"><label htmlFor="cserv">Service needed</label>
                <select id="cserv"><option>HVAC maintenance</option><option>Electrical maintenance</option><option>Plumbing / mechanical</option><option>Fire protection</option><option>Annual maintenance contract</option><option>Emergency breakdown</option><option>Other</option></select>
              </div>
              <div className="field"><label htmlFor="cmsg">Message</label><textarea id="cmsg" placeholder="Describe your facility and what you need…" /></div>
              <button className="btn btn-fill" type="submit">Send message
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
              </button>
              <div className={`cf-ok ${submitted ? 'show' : ''}`} id="cfOk">Thanks — your message has been sent. Our team will respond within one business day.</div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SupportSection() {
  const ref = useReveal()
  return (
    <section className="section" ref={ref}>
      <div className="container">
        <div className="shead">
          <div className="top"><span className="ix">Support</span><span className="rule" /></div>
          <h2>How can we help you?</h2>
          <p className="lede">Find answers to common questions or reach our support team directly.</p>
        </div>
        <div className="cap-grid">
          <div className="cap-col reveal">
            <div className="cl">Contact Support</div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.msg) }} /><div><b>Email us</b><span><a href="mailto:info@mohdhms.com">info@mohdhms.com</a></span></div></div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.phone) }} /><div><b>Call us</b><span><a href="tel:+6730000000">+673 000 0000</a></span></div></div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.alert) }} /><div><b>Emergency</b><span><a href="tel:+6739999999">+673 999 9999</a> (24/7)</span></div></div>
          </div>
          <div className="cap-col reveal">
            <div className="cl">Resources</div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.file) }} /><div><b>Service Request Guide</b><span>Learn how to submit and track requests</span></div></div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.qr) }} /><div><b>Equipment QR Scanning</b><span>Scan any asset QR for instant history</span></div></div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.history) }} /><div><b>Invoice &amp; Billing</b><span>View and download invoices online</span></div></div>
          </div>
          <div className="cap-col reveal">
            <div className="cl">System Access</div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.portal) }} /><div><b>Client Portal</b><span>Log in to manage your facilities</span></div></div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.chart) }} /><div><b>Live Dashboard</b><span>Real-time operations overview</span></div></div>
            <div className="cap-item"><span className="cci" dangerouslySetInnerHTML={{ __html: ic(I.bell) }} /><div><b>Notifications</b><span>Stay updated on work progress</span></div></div>
          </div>
        </div>
      </div>
    </section>
  )
}