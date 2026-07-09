'use client';

import React from 'react';
import { PageId } from '../public-website';
import { ThemeSection, ThemeLink, Reveal, PageWrapper, ThemeCard } from '../theme';

export function PageCustomerCharter({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Customer Charter</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Customer Charter
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            Our pledge to deliver exceptional facility maintenance services with integrity, reliability, and care.
          </p>
          <p style={{ marginTop: 8, fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', color: 'rgba(247,248,243,0.5)' }}>
            Last updated: January 2026
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <ThemeSection>
        <div className="grid gap-10 max-w-[820px]">
          <Reveal>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>1. Our Commitment</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              At MOHD.HMS ENTERPRISE, our customers are at the heart of everything we do. This Customer Charter outlines the standards of service you can expect when you engage with us, and it reflects our unwavering commitment to excellence in facility maintenance and management. We understand that the reliability, safety, and efficiency of your facilities are critical to your operations, and we take that responsibility seriously.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our charter is built upon the principles of professionalism, transparency, accountability, and continuous improvement. Every member of our team, from our field technicians to our senior management, is trained to uphold these principles in every interaction. We believe that exceptional service is not just about technical competence—it is about building lasting relationships based on trust, mutual respect, and shared success.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              We are proud to serve businesses and organisations across Brunei Darussalam, and we are committed to contributing to the safety, comfort, and operational efficiency of the facilities we maintain. This charter is our public commitment to you, our valued client, and it serves as the benchmark against which we measure our performance.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>2. Service Standards</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 16 }}>
              We commit to delivering all maintenance services in accordance with industry-recognised standards, applicable Brunei Darussalam regulations, and the specific requirements outlined in your Service Agreement. Our service standards encompass every aspect of our operations, from initial assessment and planning through to execution, documentation, and follow-up.
            </p>

            <div className="grid gap-4">
              <ThemeCard hover={false} className="p-5">
                <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 6 }}>Qualified Personnel</p>
                <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  All works are performed by trained, certified, and experienced technicians who undergo regular professional development. Our teams are equipped with the latest tools and knowledge to deliver safe, efficient, and code-compliant maintenance across all building systems.
                </p>
              </ThemeCard>

              <ThemeCard hover={false} className="p-5">
                <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 6 }}>Prompt Response</p>
                <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  We respond to emergency calls within one (1) hour, high-priority issues within four (4) hours, and standard requests within eight (8) business hours. Our 24/7 emergency hotline (+673 999 9999) ensures you can always reach us when it matters most.
                </p>
              </ThemeCard>

              <ThemeCard hover={false} className="p-5">
                <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 6 }}>Quality Materials</p>
                <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  We use only genuine, manufacturer-approved replacement parts and materials from reputable suppliers. All materials used in maintenance and repair works are covered by manufacturer warranties, providing you with additional peace of mind and long-term reliability.
                </p>
              </ThemeCard>

              <ThemeCard hover={false} className="p-5">
                <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 6 }}>Clean &amp; Safe Work</p>
                <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  Our teams maintain the highest standards of workplace safety and housekeeping. Upon completion of any work, we ensure the work area is clean, tidy, and restored to its original condition. All waste materials are disposed of responsibly and in compliance with environmental regulations.
                </p>
              </ThemeCard>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>3. Communication Promise</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We believe that clear, timely, and honest communication is the foundation of a successful client relationship. We commit to keeping you informed at every stage of the maintenance process, from initial request to final completion and beyond. Our dedicated account managers serve as your single point of contact, ensuring consistency and continuity in all communications.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              All service requests are acknowledged within two (2) hours during business hours, and you will receive regular status updates as work progresses. For scheduled maintenance, we provide advance notification of planned visits, including the date, time, scope of work, and any preparations required on your part. Upon completion, a detailed service report is provided, documenting the work performed, observations made, and any recommendations for future attention.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              We are accessible through multiple communication channels, including telephone, email, WhatsApp, and our client portal. Our goal is to ensure that you can always reach the right person, at the right time, through your preferred channel. We respond to all enquiries within one (1) business day and strive to resolve communication-related issues immediately.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>4. Quality Guarantee</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We stand behind the quality of our workmanship. All maintenance and repair services carried out by MOHD.HMS ENTERPRISE are covered by a workmanship warranty of ninety (90) days from the date of completion. If any issue arises within this period that is directly related to the work we performed, we will rectify it at no additional cost to you.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our quality management system includes regular internal audits, peer reviews, and client satisfaction assessments. Every completed work order undergoes a quality check before it is marked as resolved in our system. We track first-time fix rates as a key performance indicator and continuously invest in training and equipment to improve our first-time resolution capability.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              In the unlikely event that you are not satisfied with the quality of our service, we encourage you to contact us immediately so that we can address your concerns. We view every piece of feedback as an opportunity to improve, and we are committed to making things right.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>5. Complaints Resolution</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We take all complaints seriously and are committed to resolving them fairly, promptly, and to your satisfaction. Our complaints resolution process is designed to be straightforward, transparent, and accessible. You may submit a complaint through any of our communication channels—by telephone, email, WhatsApp, or through the client portal.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Upon receipt of a complaint, we will acknowledge it within one (1) business day and provide you with a reference number for tracking purposes. A thorough investigation will be conducted, and we will provide you with a substantive response within five (5) business days. For complex complaints that require additional investigation, we will keep you informed of our progress and provide a final resolution within fifteen (15) business days.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              If you are dissatisfied with the resolution of your complaint, you may request that the matter be escalated to our Director of Operations for further review. We maintain detailed records of all complaints and resolutions, which are used to identify systemic issues and drive continuous improvement in our service delivery.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>6. Transparency</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We believe that trust is built on transparency. We commit to providing clear, accurate, and honest information about our services, pricing, capabilities, and limitations. All quotations and proposals include a detailed breakdown of costs, scope of work, timelines, and any assumptions or exclusions. There are no hidden fees or surprise charges—what we quote is what you pay, unless the scope of work is modified by mutual agreement.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our client portal provides real-time visibility into all aspects of your maintenance programme, including work order status, asset histories, inspection reports, and performance metrics. We believe that an informed client is an empowered client, and we are committed to providing you with the data and insights you need to make informed decisions about your facility management.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              When issues arise, we communicate openly about the nature of the problem, the proposed solution, the expected timeline, and any associated costs. We do not over-promise or under-deliver—we set realistic expectations and then work diligently to exceed them.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>7. Feedback</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Your feedback is invaluable to us. It helps us understand what we are doing well, where we can improve, and how we can better serve your needs. We actively solicit feedback through post-service satisfaction surveys, quarterly business reviews, and informal conversations with your team. Every piece of feedback is reviewed, analysed, and acted upon.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We also welcome suggestions for new services, process improvements, or innovative approaches to facility maintenance. Many of our service enhancements have been inspired by client feedback, and we are always looking for ways to add value to our client relationships. You can share your feedback at any time through our contact channels or directly through the client portal.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Annual client satisfaction surveys are conducted to benchmark our performance and identify trends. The results of these surveys are shared with our entire team and are incorporated into our service improvement planning process.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>8. Contact</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We are here to serve you. Whether you have a question, a concern, a suggestion, or a service request, our team is ready to assist. Do not hesitate to reach out to us through any of the channels listed below.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: 'var(--hm-ink)' }}>MOHD.HMS ENTERPRISE</strong><br />
              Bandar Seri Begawan, Brunei Darussalam<br />
              Email: info@mohdhms.com<br />
              Emergency: +673 999 9999
            </p>
          </Reveal>
        </div>
      </ThemeSection>

      {/* CTA */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(56px,8vw,104px) 0', color: 'var(--hm-paper)', textAlign: 'center' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', lineHeight: 1.08 }}>
            Have questions?
          </h2>
          <p style={{ marginTop: 14, color: 'rgba(247,248,243,0.7)', fontSize: '1.05rem' }}>
            Contact our team to learn more about our service commitments.
          </p>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <ThemeLink variant="outline" onClick={() => navigate('contact')} style={{ color: 'var(--hm-paper)', borderColor: 'rgba(255,255,255,0.25)' }}>Contact us</ThemeLink>
            <ThemeLink variant="green" onClick={() => navigate('support')}>Support Center</ThemeLink>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}