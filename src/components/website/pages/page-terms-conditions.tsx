'use client';

import React from 'react';
import { PageId } from '../public-website';
import { ThemeSection, ThemeLink, Reveal, PageWrapper } from '../theme';

export function PageTermsConditions({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Terms &amp; Conditions</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Terms &amp; Conditions
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            The terms and conditions governing the use of our facility maintenance services and this website.
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
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>1. Introduction</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              These Terms and Conditions constitute a legally binding agreement between MOHD.HMS ENTERPRISE ("the Company", "we", "us", or "our") and the client or user ("Client", "you", or "your") who engages our facility maintenance, management, or related engineering services. By accessing this website or engaging our services, you acknowledge that you have read, understood, and agree to be bound by these terms in their entirety.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The Company is registered and operates in Bandar Seri Begawan, Brunei Darussalam. All services are provided in accordance with the laws and regulations of Brunei Darussalam. These terms apply to all visitors, users, and clients of our website and services, including but not limited to facility maintenance, HVAC servicing, electrical works, plumbing, fire safety systems, and preventive maintenance programmes.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              If you do not agree with any part of these terms, you must discontinue use of our website and services immediately. We reserve the right to refuse service to any person or entity at our sole discretion.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>2. Services</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE provides comprehensive facility maintenance and management services, including but not limited to: heating, ventilation, and air conditioning (HVAC) installation and maintenance; electrical system installation, testing, and repair; plumbing and sanitary system maintenance; fire detection and suppression system servicing; preventive and corrective maintenance programmes; emergency breakdown response; and building management system support.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The specific scope of services, deliverables, timelines, and pricing for each engagement shall be outlined in a separate Service Agreement or quotation provided to the Client. In the event of any conflict between these Terms and Conditions and a signed Service Agreement, the terms of the Service Agreement shall prevail to the extent of the conflict.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              We reserve the right to modify, suspend, or discontinue any service or service component with reasonable notice to the Client. All services are subject to availability and the Client&apos;s compliance with the terms set out herein.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>3. Client Obligations</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The Client agrees to provide accurate and complete information necessary for the Company to perform the contracted services, including but not limited to building plans, equipment specifications, access credentials, and relevant safety documentation. The Client shall ensure that our personnel have safe and timely access to the premises, equipment, and systems requiring maintenance or repair.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The Client is responsible for obtaining any necessary permits, approvals, or authorisations required for the works to be carried out. The Client shall not interfere with or obstruct the Company&apos;s personnel in the performance of their duties, and shall comply with all applicable health and safety regulations at the premises.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Any delays caused by the Client&apos;s failure to meet these obligations may result in adjustments to project timelines and associated costs, for which the Company shall not be held liable.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>4. Payment Terms</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Payment terms shall be as specified in the Service Agreement or quotation. Unless otherwise agreed in writing, invoices are due within thirty (30) days from the date of issuance. The Company reserves the right to charge interest on overdue payments at a rate of 1.5% per month or the maximum rate permitted by law in Brunei Darussalam, whichever is lower.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              For project-based engagements, the Company may require an upfront deposit or progress payments as outlined in the proposal. All quoted prices are exclusive of applicable taxes, duties, and levies unless stated otherwise. The Company reserves the right to adjust pricing to reflect changes in material costs, labour rates, or regulatory requirements with reasonable notice to the Client.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              The Company may suspend services for accounts that are more than sixty (60) days overdue, after providing written notice to the Client. All costs associated with the collection of overdue payments, including reasonable legal fees, shall be borne by the Client.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>5. Limitation of Liability</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              To the fullest extent permitted by applicable law, MOHD.HMS ENTERPRISE shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or in connection with the use of our services or this website, including but not limited to loss of profits, data, business opportunities, or goodwill, regardless of the cause of action or theory of liability.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our total aggregate liability for any claim arising out of or relating to our services shall not exceed the total fees paid by the Client to the Company for the specific service giving rise to the claim during the twelve (12) months preceding the event. This limitation applies regardless of whether the alleged liability is based on contract, tort, negligence, strict liability, or any other legal theory.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              The Company shall not be liable for any failure or delay in performance caused by circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, pandemics, government actions, labour disputes, or supply chain disruptions.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>6. Termination</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Either party may terminate a service engagement by providing thirty (30) days&apos; written notice to the other party. Upon termination, the Client shall pay all outstanding fees for services rendered and expenses incurred up to the date of termination. The Company shall return any Client property, documents, or materials in our possession within a reasonable period.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The Company may terminate services immediately and without prior notice in the event of: the Client&apos;s material breach of these terms; the Client&apos;s failure to make payment when due; circumstances that render the continuation of services unsafe or unlawful; or the Client&apos;s insolvency or cessation of business.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Provisions of these terms that by their nature should survive termination, including but not limited to limitation of liability, intellectual property rights, confidentiality obligations, and dispute resolution, shall remain in full force and effect after termination.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>7. Dispute Resolution</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              In the event of any dispute, controversy, or claim arising out of or in connection with these Terms and Conditions or the services provided, the parties shall first attempt to resolve the matter through good-faith negotiation. Either party may initiate this process by providing written notice to the other party describing the nature of the dispute.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              If the dispute cannot be resolved through negotiation within thirty (30) days of the notice, the parties agree to submit the matter to mediation administered by a mutually agreed mediator in Bandar Seri Begawan, Brunei Darussalam. The costs of mediation shall be shared equally between the parties.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              If mediation fails to resolve the dispute, either party may pursue legal remedies through the courts of Brunei Darussalam. These terms shall be governed by and construed in accordance with the laws of Brunei Darussalam, without regard to its conflict of law principles.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>8. Amendments</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE reserves the right to amend, modify, or update these Terms and Conditions at any time at our sole discretion. Any changes will be effective immediately upon posting the revised terms on our website. The date of the most recent revision will be indicated at the top of this document.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              For material changes that may affect the Client&apos;s rights or obligations, we will endeavour to provide reasonable advance notice via email or through a prominent notice on our website. Your continued use of our website or services after the publication of amended terms constitutes your acceptance of such changes. We recommend reviewing these terms periodically to stay informed of any updates.
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>9. Contact Information</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              If you have any questions, concerns, or requests regarding these Terms and Conditions, please contact us using the details provided below. Our team is committed to addressing your enquiries in a timely and professional manner.
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
            Contact our team for any clarifications regarding our terms.
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