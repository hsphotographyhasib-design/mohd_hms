'use client';

import React from 'react';
import { PageId } from '../public-website';
import { ThemeSection, ThemeLink, Reveal, PageWrapper } from '../theme';

export function PageAcceptableUsePolicy({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Acceptable Use Policy</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Acceptable Use Policy
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            Guidelines for the responsible and lawful use of our website, client portal, and related services.
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
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>1. Purpose</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              This Acceptable Use Policy ("Policy") establishes the rules and guidelines governing the use of the MOHD.HMS ENTERPRISE website, client portal, facility management systems, and any related online services provided by the Company (collectively, the "Services"). This Policy is designed to ensure a safe, secure, and productive environment for all users, and to protect the integrity of our systems, data, and reputation.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              By accessing or using our Services, you agree to comply with this Policy in addition to our Terms and Conditions and Privacy Policy. This Policy applies to all users, including but not limited to clients, contractors, suppliers, employees, and any other individuals who access our Services. We reserve the right to modify this Policy at any time, and your continued use of our Services constitutes acceptance of any modifications.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Failure to comply with this Policy may result in the suspension or termination of your access to our Services, and may also lead to legal action where appropriate. We take violations of this Policy seriously and will investigate all reported incidents thoroughly.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>2. Acceptable Use</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              When using our Services, you agree to use them in a lawful, responsible, and respectful manner. Acceptable use includes, but is not limited to: accessing the Services only through authorised interfaces and methods; providing accurate and truthful information when interacting with our systems; using the client portal and management tools for their intended business purposes; maintaining the confidentiality of your account credentials and not sharing them with unauthorised parties; promptly reporting any suspected security vulnerabilities, unauthorised access, or other incidents to our team.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              You may use our website to learn about our services, request quotations, access client resources, communicate with our team, and engage with published content in a manner consistent with the purpose of the website. All content submitted through our Services, including feedback, reviews, and communications, should be professional, constructive, and relevant.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Users of our client portal and facility management systems are expected to use these tools responsibly for the management of maintenance tasks, work orders, asset records, and related operational activities. Data entered into our systems should be accurate, and users should follow established workflows and approval processes.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>3. Prohibited Activities</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The following activities are strictly prohibited when using our Services: attempting to gain unauthorised access to any part of the Services, user accounts, or connected systems; using automated tools, bots, scrapers, or scripts to access, extract, or monitor data from our website without prior written permission; transmitting any malware, viruses, worms, trojans, or other malicious code through our Services; engaging in any form of cyber attack, including denial-of-service attacks, SQL injection, or cross-site scripting.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Additionally, users must not: use the Services for any unlawful purpose or in violation of any applicable local, national, or international laws and regulations; infringe upon the intellectual property rights of MOHD.HMS ENTERPRISE or any third party; impersonate any person or entity, or falsely represent your affiliation with any person or entity; harass, threaten, intimidate, or otherwise cause distress to other users or our staff; upload, post, or transmit content that is defamatory, obscene, offensive, discriminatory, or otherwise objectionable.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Users are also prohibited from: attempting to interfere with or disrupt the integrity or performance of the Services; circumventing any security measures, access controls, or usage restrictions implemented by the Company; using the Services to send unsolicited commercial communications (spam); and reselling, sublicensing, or redistributing access to our Services without explicit written authorisation.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>4. User Responsibilities</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              As a user of our Services, you are responsible for maintaining the security and confidentiality of your account credentials. You must choose strong, unique passwords and must not share your login details with any unauthorised individual. You are solely responsible for all activities that occur under your account, and you must notify us immediately if you suspect that your account has been compromised or if any unauthorised access has occurred.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              You are responsible for ensuring that your use of the Services complies with all applicable laws and regulations of Brunei Darussalam and any other relevant jurisdiction. This includes compliance with data protection regulations, intellectual property laws, and any industry-specific regulations that may apply to your use of our facility management systems.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              If you are using our Services on behalf of an organisation, you represent and warrant that you have the authority to bind that organisation to this Policy. Your organisation is jointly responsible for ensuring compliance with this Policy by all of its users who access our Services.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>5. Enforcement</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE reserves the right to monitor, investigate, and enforce compliance with this Policy. We may use automated tools and manual review processes to detect potential violations. If we determine, in our sole discretion, that you have violated this Policy, we may take one or more of the following actions: issue a formal warning; temporarily suspend your access to the Services; permanently terminate your account and access; remove or block access to any content that violates this Policy; and report the violation to relevant law enforcement or regulatory authorities where appropriate.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We will investigate all reports of Policy violations promptly and thoroughly. Users are encouraged to report suspected violations by contacting our team at info@mohdhms.com. Reports will be treated confidentially to the extent possible, and we will not retaliate against any user who makes a good-faith report of a Policy violation.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Violations of this Policy that constitute criminal offences may be referred to the appropriate law enforcement authorities in Brunei Darussalam. MOHD.HMS ENTERPRISE cooperates fully with law enforcement investigations and will comply with lawful requests for information.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>6. Modifications</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We reserve the right to modify, amend, or update this Acceptable Use Policy at any time to reflect changes in our Services, technology, legal requirements, or industry best practices. When we make changes, we will update the "Last updated" date at the top of this page and, for material changes, provide reasonable notice through our website or via email to registered users.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We encourage all users to review this Policy periodically to stay informed of their obligations. Your continued use of our Services after any modifications to this Policy constitutes your acceptance of the revised terms. If you do not agree with any changes, you must discontinue your use of the affected Services and contact us to discuss your options.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Questions or suggestions regarding this Policy are welcome and can be directed to our team through the contact details provided below.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>7. Contact</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              If you have any questions about this Acceptable Use Policy, wish to report a violation, or need guidance on compliant use of our Services, please contact us. We are committed to maintaining a safe and productive environment for all users.
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
            Contact our team for any clarifications regarding acceptable use.
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