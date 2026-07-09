'use client';

import React from 'react';
import { PageId } from '../public-website';
import { ThemeSection, ThemeLink, Reveal, PageWrapper } from '../theme';

export function PagePrivacyPolicy({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Privacy Policy</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Privacy Policy
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            How we collect, use, and protect your personal information in compliance with Brunei data protection regulations.
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
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>1. Information We Collect</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE collects personal and business information that you voluntarily provide to us when you use our website, request a quotation, engage our services, or communicate with our team. This information may include your name, job title, company name, business address, email address, telephone number, and any other details necessary to deliver our facility maintenance services.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We also collect certain technical information automatically when you visit our website, including your IP address, browser type and version, operating system, referring URLs, pages visited, time and date of visits, and the duration of your session. This data is collected through cookies and similar technologies as described in our Cookie Policy.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              In the course of providing our services, we may also collect information relating to the facilities we maintain, including equipment specifications, maintenance records, inspection reports, and photographic documentation of works performed. Such information is treated as confidential and is used solely for the purpose of service delivery.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>2. How We Use Your Information</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The personal information we collect is used for the following purposes: to process and fulfil your service requests and quotations; to communicate with you regarding your account, services, and projects; to manage our client relationships and provide customer support; to improve our website, services, and overall client experience; to comply with legal, regulatory, and contractual obligations; and to prevent fraud and ensure the security of our systems and services.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We may use your contact information to send you service-related updates, maintenance reminders, and information about new services or promotions that we believe may be relevant to your business. Where required by law, we will obtain your explicit consent before sending marketing communications, and you may opt out of such communications at any time.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Technical data collected from website visits is used to analyse usage patterns, diagnose technical issues, and optimise website performance. This data is aggregated and anonymised where possible, and is not used to personally identify individual users.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>3. Data Sharing</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We do not sell, rent, or trade your personal information to third parties. We may share your information with trusted third-party service providers who assist us in operating our business, such as IT hosting providers, payment processors, email service providers, and professional advisors (legal, accounting, audit). These service providers are contractually obligated to handle your data securely and only for the purposes for which it was shared.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We may disclose your personal information when required to do so by law, regulation, or legal process, or when we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others, to investigate fraud, or to respond to a government request. In the event of a corporate transaction such as a merger, acquisition, or sale of assets, your personal information may be transferred as part of that transaction, subject to continued protection under these terms.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              We may also share anonymised and aggregated data with industry partners for research, benchmarking, and market analysis purposes. Such data cannot be used to identify individual persons or businesses.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>4. Data Retention</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We retain your personal information only for as long as necessary to fulfil the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements. Client service records and maintenance documentation are retained for a minimum of seven (7) years following the completion of the relevant service engagement, in accordance with industry best practices and regulatory expectations.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Website usage data and analytics information are typically retained for a period of twenty-four (24) months, after which it is anonymised or deleted. When determining retention periods, we consider the nature and sensitivity of the data, the potential risk of harm from unauthorised disclosure, our legal obligations, and the purposes for which the data is processed.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              When personal information is no longer required, we take reasonable steps to securely delete or anonymise it. However, residual copies may remain in our backup systems for a limited period before being permanently destroyed in accordance with our data disposal procedures.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>5. Your Rights</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Subject to applicable laws and regulations of Brunei Darussalam, you have the right to access the personal information we hold about you, request correction of inaccurate or incomplete data, and request deletion of your personal information where it is no longer necessary for the purposes for which it was collected. You may also request restriction of processing, data portability, and withdrawal of consent where processing is based on consent.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              To exercise any of these rights, please submit a written request to our Data Protection Officer at info@mohdhms.com. We will acknowledge your request within ten (10) business days and respond substantively within thirty (30) days. In certain circumstances, we may not be able to fully accommodate your request, for example where retention is required by law or where the data is necessary for the establishment, exercise, or defence of legal claims.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              If you are dissatisfied with our response to your request, you have the right to lodge a complaint with the relevant data protection authority in Brunei Darussalam. We are committed to working with you to resolve any concerns about how we handle your personal information.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>6. Cookies</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our website uses cookies and similar tracking technologies to enhance your browsing experience, analyse website traffic, and understand how visitors interact with our content. Cookies are small text files placed on your device that help us remember your preferences and improve the functionality of our website.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              For detailed information about the types of cookies we use, how to manage your cookie preferences, and your choices regarding cookie consent, please refer to our dedicated Cookie Policy. By continuing to use our website, you consent to the use of cookies as described in that policy.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>7. Data Security</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. These measures include encryption of data in transit and at rest, secure access controls and authentication mechanisms, regular security assessments and penetration testing, employee training on data protection and information security, and incident response procedures for data breaches.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the Internet or electronic storage is completely secure. We cannot guarantee the absolute security of your data, and you acknowledge that you provide your information at your own risk.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify the affected individuals and relevant authorities without undue delay and in accordance with applicable legal requirements.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>8. Third-Party Links</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our website may contain links to third-party websites, services, or resources that are not operated or controlled by MOHD.HMS ENTERPRISE. This Privacy Policy does not apply to third-party websites, and we are not responsible for the privacy practices, content, or policies of any third-party sites. We encourage you to review the privacy policies of any third-party websites you visit through links on our site.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              The inclusion of any link on our website does not imply our endorsement of the linked site or its content. We have no control over the nature, content, and availability of those external sites. Your interactions with third-party websites are governed solely by those sites&apos; terms and privacy policies.
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>9. Children&apos;s Privacy</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our website and services are not directed at individuals under the age of eighteen (18). We do not knowingly collect, use, or disclose personal information from children. If we become aware that we have inadvertently collected personal information from a child, we will take immediate steps to delete that information from our systems.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              If you are a parent or guardian and believe that your child has provided us with personal information, please contact us at info@mohdhms.com and we will take appropriate action to remove such information.
            </p>
          </Reveal>

          <Reveal delay={0.45}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>10. Changes to This Policy</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors. When we make material changes, we will notify you by posting a prominent notice on our website or, where appropriate, by sending you an email notification. We encourage you to review this policy periodically to stay informed about how we protect your information.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              The date of the most recent revision will be indicated at the top of this page. Your continued use of our website or services after the publication of the revised policy constitutes your acceptance of the updated terms.
            </p>
          </Reveal>

          <Reveal delay={0.5}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>11. Contact</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our handling of your personal information, please do not hesitate to contact us. Our Data Protection Officer can be reached through the following channels.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: 'var(--hm-ink)' }}>MOHD.HMS ENTERPRISE</strong><br />
              Data Protection Officer<br />
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
            Contact our team for any privacy-related enquiries.
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