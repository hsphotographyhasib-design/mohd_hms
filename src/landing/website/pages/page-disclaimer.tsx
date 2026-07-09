'use client';

import React from 'react';
import { PageId } from '../public-website';
import { ThemeSection, ThemeLink, Reveal, PageWrapper } from '../theme';

export function PageDisclaimer({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Disclaimer</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Disclaimer
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            Important notices and limitations regarding the use of our website and information provided herein.
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
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>1. General Disclaimer</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The information provided on the MOHD.HMS ENTERPRISE website is for general informational purposes only. While we endeavour to keep the information on this website accurate and up to date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the website or the information, products, services, or related graphics contained on the website for any purpose.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Any reliance you place on such information is therefore strictly at your own risk. In no event will we be liable for any loss or damage, including without limitation, indirect or consequential loss or damage, or any loss or damage whatsoever arising from loss of data or profits arising out of, or in connection with, the use of this website.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              This website may contain typographical errors, inaccuracies, or omissions. We reserve the right to correct any errors, inaccuracies, or omissions, and to change or update information at any time without prior notice. The materials on this website are not guaranteed to be free from viruses or other malicious code and are provided on an "as is" and "as available" basis.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>2. Professional Advice</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The content on this website, including but not limited to articles, blog posts, case studies, service descriptions, and technical guides, is provided for informational purposes only and does not constitute professional advice. It should not be relied upon as a substitute for professional consultation with qualified engineers, technicians, or other specialists in the facility maintenance and management industry.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE recommends that you seek the advice of qualified professionals before making any decisions based on information published on this website. Every building, facility, and maintenance situation is unique, and the general information provided here may not be applicable to your specific circumstances.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              For personalised advice tailored to your facility&apos;s requirements, please contact our team directly to arrange a consultation. Our engineers and specialists can assess your specific needs and provide recommendations based on a thorough evaluation of your premises and equipment.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>3. Website Content Accuracy</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We strive to ensure that all information presented on this website, including service descriptions, pricing indications, project case studies, and technical specifications, is accurate at the time of publication. However, the facility maintenance industry is subject to frequent changes in regulations, standards, technologies, and best practices. As such, the information on this website may not always reflect the most current developments.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Service descriptions and pricing information provided on this website are indicative only and are subject to confirmation through a formal quotation. The final scope of work, deliverables, and pricing will be outlined in a Service Agreement or contract between MOHD.HMS ENTERPRISE and the Client. No content on this website should be interpreted as a binding offer or guarantee of specific outcomes.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Images, photographs, and illustrations used on this website are for illustrative purposes and may not represent the exact appearance, condition, or specifications of actual projects or services delivered. Equipment models, brands, and specifications mentioned are subject to availability and may be substituted with equivalent alternatives where necessary.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>4. External Links</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our website may contain hyperlinks to websites owned and operated by third parties. These links are provided solely for your convenience and to provide additional information. The inclusion of any external link does not imply endorsement, recommendation, or approval by MOHD.HMS ENTERPRISE of the linked website, its content, products, services, or operators.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We have no control over the content, nature, or availability of external websites. External websites may have their own terms of use, privacy policies, and cookie policies, which we strongly recommend you review. We accept no responsibility for the content, accuracy, or legality of third-party websites, or for any damage or loss that may result from your interaction with them.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              If you encounter any broken links or external websites that you believe contain inappropriate or harmful content, please inform us so that we can review and, if necessary, remove the link from our website.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>5. Service Availability</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We endeavour to ensure that our website is available 24 hours a day, 7 days a week. However, we do not guarantee that access to the website will be uninterrupted, timely, secure, or error-free. Temporary interruptions to the availability of the website may occur due to system maintenance, upgrades, server outages, or other causes beyond our reasonable control.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Similarly, while we are committed to delivering our facility maintenance services to the highest standards, the availability and scheduling of services may be affected by factors including but not limited to: emergency situations requiring priority response, weather conditions, supply chain disruptions, regulatory requirements, and the availability of specialised equipment or personnel.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              We will make every effort to communicate any planned service disruptions or website maintenance windows in advance. For time-critical maintenance needs, please contact our emergency hotline at +673 999 9999.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>6. Limitation of Liability</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              To the maximum extent permitted by applicable law, MOHD.HMS ENTERPRISE, its directors, employees, agents, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages arising from your use of, or inability to use, this website or the information, materials, or services provided through it. This includes, but is not limited to, damages for loss of profits, goodwill, data, or other intangible losses.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              This limitation of liability applies regardless of the legal theory under which the claim is made, whether in contract, tort (including negligence), strict liability, or any other legal theory, even if we have been advised of the possibility of such damages. Some jurisdictions do not allow the exclusion or limitation of liability for consequential or incidental damages, so the above limitation may not apply to you.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              In jurisdictions that do not allow such limitations, our liability shall be limited to the greatest extent permitted by applicable law. For specific liability terms related to our services, please refer to our Terms and Conditions and any applicable Service Agreement.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>7. Changes</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE reserves the right to amend, update, or replace this Disclaimer at any time without prior notice. Changes become effective immediately upon being posted on this page. The "Last updated" date at the top of this page indicates when the most recent revisions were made.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We encourage you to periodically review this Disclaimer to stay informed of any changes. Your continued use of the website following the posting of changes constitutes your acceptance of such changes. If you do not agree with any part of this Disclaimer, you should discontinue your use of the website.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              For any questions regarding this Disclaimer, please contact us at the details provided below.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 8, marginTop: 16 }}>
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
            Contact our team for any clarifications regarding this disclaimer.
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