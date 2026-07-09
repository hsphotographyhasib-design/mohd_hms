'use client';

import React from 'react';
import { PageId } from '../public-website';
import { ThemeSection, ThemeLink, Reveal, PageWrapper } from '../theme';

export function PageCookiePolicy({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Cookie Policy</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Cookie Policy
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            Understanding how we use cookies and similar technologies on our website to improve your experience.
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
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>1. What Are Cookies</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Cookies are small text files that are placed on your computer, smartphone, or other device when you visit a website. They are widely used to make websites work more efficiently, provide a better browsing experience, and supply information to the owners of the site. Cookies allow websites to recognise your device and remember information about your visit, such as your preferred language, font size, and other display preferences.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              In addition to cookies, we may also use similar technologies such as web beacons (also known as pixel tags or clear GIFs), local storage, and session storage. These technologies function similarly to cookies and help us collect information about how you interact with our website.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Cookies can be "persistent" (remaining on your device until they expire or you delete them) or "session" (lasting only for the duration of your current browser session). They can also be set by the website you are visiting ("first-party cookies") or by third-party services operating on that website ("third-party cookies").
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>2. Types of Cookies We Use</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              <strong style={{ color: 'var(--hm-ink)' }}>Necessary Cookies:</strong> These cookies are essential for the operation of our website. They enable core functionality such as page navigation, secure access to authenticated areas, and the loading of basic website elements. Necessary cookies cannot be disabled, as the website cannot function properly without them. They do not store any personally identifiable information beyond what is required for basic site operations.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              <strong style={{ color: 'var(--hm-ink)' }}>Functional Cookies:</strong> These cookies allow the website to remember choices you make (such as your preferred language, region, or display settings) and provide enhanced, personalised features. Functional cookies may also be used to provide services you have requested, such as watching a video or commenting on a blog. The information collected by these cookies is typically anonymised and aggregated.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              <strong style={{ color: 'var(--hm-ink)' }}>Analytics Cookies:</strong> These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. Analytics cookies enable us to measure the number of visitors, identify which pages are visited most frequently, and observe how users navigate through the site. This data helps us improve the structure and content of our website and enhance the overall user experience. We use tools such as Google Analytics for this purpose.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--hm-ink)' }}>Marketing Cookies:</strong> Marketing cookies are used to track visitors across websites with the intention of displaying relevant and engaging advertisements. These cookies are typically set by advertising networks with our permission. They remember that you have visited our website and use this information to present you with targeted advertisements on other platforms. Marketing cookies are only placed on your device if you have given your explicit consent.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>3. Managing Your Cookies</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              You have the right to decide whether to accept or reject cookies. When you first visit our website, you will be presented with a cookie consent banner that allows you to select which categories of cookies you wish to accept. You can modify your cookie preferences at any time by accessing the cookie settings link, typically found in the footer of our website.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Most web browsers also allow you to control cookies through their settings. You can set your browser to refuse all cookies, accept only first-party cookies, or delete cookies when you close your browser. The steps to manage cookies vary depending on the browser you use; please consult your browser&apos;s help documentation for specific instructions.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Please note that if you choose to disable certain cookies, some features of our website may not function as intended. For example, disabling functional cookies may affect your ability to use personalised features, and disabling analytics cookies may limit our ability to improve the website based on user behaviour data. Necessary cookies cannot be disabled as they are required for the website to operate.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>4. Third-Party Cookies</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Some cookies on our website are set by third-party services that operate on our pages. These third parties include analytics providers (such as Google Analytics), social media platforms (such as embedded social sharing features), and marketing/advertising networks. Third-party cookies are subject to the respective privacy and cookie policies of those third-party providers.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              We carefully select our third-party partners and ensure they comply with applicable data protection regulations. However, we do not have control over the cookies set by these third parties, and we recommend that you review the privacy policies of any third-party services that may place cookies on your device.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Third-party cookies are only activated on our website with your consent, except for those that are strictly necessary for the provision of the service you have requested. You can manage third-party cookie preferences through the cookie consent banner or your browser settings.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>5. Updates to This Policy</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE may update this Cookie Policy from time to time to reflect changes in the cookies we use, changes in technology, or for other operational, legal, or regulatory reasons. We encourage you to review this policy periodically to stay informed about our use of cookies and related technologies.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              When we make changes to this Cookie Policy, we will update the "Last updated" date at the top of this page. If the changes are material, we will provide additional notice, such as displaying a new cookie consent banner on your next visit to our website.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Your continued use of our website following any changes to this Cookie Policy indicates your acceptance of the updated terms. If you do not agree with the changes, you should adjust your cookie preferences or discontinue use of the website.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>6. Contact</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              If you have any questions or concerns about our use of cookies or this Cookie Policy, please contact us. We are happy to provide additional information and assist you with managing your cookie preferences.
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
            Contact our team for any clarifications regarding our cookie practices.
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