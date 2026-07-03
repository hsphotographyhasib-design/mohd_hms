'use client';

import React from 'react';
import { PageId } from '../public-website';
import { ThemeSection, ThemeLink, Reveal, PageWrapper, ThemeCard } from '../theme';

export function PageSla({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div style={{ background: 'var(--hm-forest)', padding: 'clamp(48px,6vw,80px) 0', color: 'var(--hm-paper)' }}>
        <div className="mx-auto px-7" style={{ maxWidth: 'var(--hm-container)' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('home')} className="bg-transparent border-0 cursor-pointer p-0" style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.6)' }}>Home</button>
            <span style={{ color: 'rgba(247,248,243,0.4)', fontSize: '0.78rem' }}>/</span>
            <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.9)' }}>Service Level Agreement</span>
          </div>
          <h1 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', maxWidth: '18ch' }}>
            Service Level Agreement
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: 'rgba(247,248,243,0.7)', maxWidth: '55ch' }}>
            Our commitment to response times, resolution targets, and service quality standards for all maintenance engagements.
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
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>1. Scope of Services</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              This Service Level Agreement ("SLA") defines the performance standards, response times, and service commitments that MOHD.HMS ENTERPRISE provides to its clients for facility maintenance and management services. This SLA applies to all active service agreements and covers the full spectrum of our maintenance capabilities, including HVAC systems, electrical installations, plumbing infrastructure, fire safety systems, and building management solutions.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              The specific services covered under this SLA for each client engagement are detailed in the corresponding Service Agreement. This SLA serves as the overarching framework that governs our service delivery commitments and provides the benchmarks against which our performance is measured. Both routine scheduled maintenance and reactive emergency repairs fall within the scope of this agreement.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Our SLA commitments are supported by our Computerised Maintenance Management System (CMMS), which enables real-time tracking of work orders, automated escalation procedures, and comprehensive performance analytics. This technology-driven approach ensures consistent service delivery and transparent performance monitoring for all our clients.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>2. Response Times</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 16 }}>
              We classify all service requests and incidents into four priority levels, each with a defined maximum response time. Response time is measured from the moment a request is received and logged in our system to the moment our technical team acknowledges the request and begins mobilisation.
            </p>

            {/* Priority Level Cards */}
            <div className="grid gap-4">
              <ThemeCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 4 }}>Priority 1</p>
                    <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--hm-forest)', marginBottom: 6 }}>Emergency</p>
                    <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      Critical system failures posing immediate safety risks or complete facility shutdown. Includes fire alarm activation, total power failure, major water leaks, and gas detection alerts.
                    </p>
                  </div>
                  <div style={{ background: 'var(--hm-forest)', color: 'var(--hm-paper)', borderRadius: 'var(--hm-r-sm)', padding: '8px 16px', fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    &lt; 1 Hour
                  </div>
                </div>
              </ThemeCard>

              <ThemeCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 4 }}>Priority 2</p>
                    <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--hm-forest)', marginBottom: 6 }}>High</p>
                    <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      Significant system degradation affecting multiple occupants or critical operations. Includes partial HVAC failure, electrical faults in critical areas, and plumbing issues impacting hygiene facilities.
                    </p>
                  </div>
                  <div style={{ background: 'var(--hm-forest)', color: 'var(--hm-paper)', borderRadius: 'var(--hm-r-sm)', padding: '8px 16px', fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    &lt; 4 Hours
                  </div>
                </div>
              </ThemeCard>

              <ThemeCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 4 }}>Priority 3</p>
                    <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--hm-forest)', marginBottom: 6 }}>Medium</p>
                    <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      Non-critical system issues causing inconvenience but not affecting safety or core operations. Includes individual equipment malfunctions, minor leaks, and cosmetic damage to building systems.
                    </p>
                  </div>
                  <div style={{ background: 'var(--hm-forest)', color: 'var(--hm-paper)', borderRadius: 'var(--hm-r-sm)', padding: '8px 16px', fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    &lt; 8 Hours
                  </div>
                </div>
              </ThemeCard>

              <ThemeCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hm-green)', marginBottom: 4 }}>Priority 4</p>
                    <p style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--hm-forest)', marginBottom: 6 }}>Low</p>
                    <p style={{ color: 'var(--hm-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      General maintenance requests, scheduled inspections, and improvement recommendations. Includes filter replacements, routine servicing, and minor aesthetic repairs.
                    </p>
                  </div>
                  <div style={{ background: 'var(--hm-forest)', color: 'var(--hm-paper)', borderRadius: 'var(--hm-r-sm)', padding: '8px 16px', fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    &lt; 24 Hours
                  </div>
                </div>
              </ThemeCard>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>3. Resolution Targets</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Beyond initial response times, we are committed to achieving timely resolution of all reported issues. Resolution targets represent our goal for restoring normal operations and are defined in relation to each priority level. For Emergency (Priority 1) issues, we target full resolution or implementation of a safe interim measure within four (4) hours of the initial response. For High (Priority 2) issues, our resolution target is within twenty-four (24) hours.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Medium (Priority 3) issues are targeted for resolution within seventy-two (72) hours, while Low (Priority 4) requests are resolved within five (5) business days. These targets are measured during standard operating hours unless otherwise specified in the Service Agreement. For issues requiring specialised parts, equipment, or external contractor involvement, resolution timelines may be adjusted with client notification.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Our resolution targets are tracked through our CMMS, which provides real-time visibility into work order status and expected completion times. Clients can monitor progress through the client portal and receive automated notifications at key milestones throughout the resolution process.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>4. Escalation Process</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              If a service request is not addressed within the defined response time, an automatic escalation is triggered within our system. The first level of escalation assigns the request to a Senior Technician who has broader authority and access to additional resources. If the issue remains unresolved after the first escalation, it is escalated to the Operations Manager, who will coordinate a dedicated response team and communicate directly with the client.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              For critical issues that remain unresolved after two escalation levels, the matter is escalated to the Director of Operations, who has the authority to allocate emergency resources, engage external specialists, and implement contingency measures. At each escalation level, the client receives a status update with a revised estimated resolution time.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Clients may also initiate manual escalation at any time by contacting our emergency hotline at +673 999 9999 or by flagging the request through the client portal. We take all escalation requests seriously and prioritise them accordingly.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>5. Service Availability</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Our standard service availability for routine and scheduled maintenance is Monday through Saturday, 8:00 AM to 6:00 PM (Brunei Darussalam Time, BNT), excluding public holidays. Emergency response services are available 24 hours a day, 7 days a week, 365 days a year, including all public holidays.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              For clients with premium service agreements, extended coverage hours and dedicated on-site presence may be arranged. The specific availability terms for each client engagement are detailed in the individual Service Agreement. Our CMMS and client portal are designed for high availability, with a target uptime of 99.5% for all digital services, excluding planned maintenance windows.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Scheduled maintenance windows for our digital platforms are communicated to clients at least forty-eight (48) hours in advance and are typically scheduled during low-usage periods to minimise disruption.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>6. Reporting</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE is committed to transparency and provides comprehensive service performance reports to all clients. Monthly performance reports are generated automatically through our CMMS and include key metrics such as total work orders received, response time compliance rates, resolution time statistics, first-time fix rates, and equipment downtime analysis.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Quarterly business reviews are conducted with each client to discuss performance trends, identify areas for improvement, and align maintenance strategies with evolving facility needs. These reviews include a detailed analysis of SLA compliance, cost efficiency, and preventive maintenance effectiveness. Clients also have real-time access to performance dashboards through the client portal, enabling on-demand monitoring of service metrics.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Annual performance summaries are prepared at the end of each contract year and serve as a foundation for service planning and contract renewal discussions. All reports are delivered in professional formats suitable for management review and regulatory compliance purposes.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>7. Exclusions</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              This SLA does not cover service failures or delays caused by circumstances beyond our reasonable control, including but not limited to: natural disasters, pandemics, government-mandated restrictions, civil unrest, or severe weather conditions. Delays resulting from the Client&apos;s failure to provide timely access to premises, equipment, or necessary documentation are also excluded from SLA compliance calculations.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              Issues arising from unauthorised modifications to equipment or systems by parties other than our authorised personnel, the use of non-standard or counterfeit replacement parts, and pre-existing conditions that were not disclosed during the initial assessment are excluded from SLA guarantees. Third-party service provider failures, where such providers are engaged by the Client independently, are also excluded.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              Requests for services that fall outside the scope of the agreed Service Agreement, or that require specialised permits, certifications, or regulatory approvals that have not been obtained by the Client, may be subject to alternative response and resolution timelines. In such cases, we will communicate the adjusted expectations clearly and in advance.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <h3 style={{ fontFamily: 'var(--hm-disp)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--hm-forest)', marginBottom: 12 }}>8. Review and Amendment</h3>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              This SLA is subject to periodic review, typically on an annual basis or upon renewal of the Service Agreement. Reviews may also be initiated at the request of either party to address significant changes in service requirements, operational conditions, or industry standards. Any amendments to this SLA must be agreed upon in writing by both parties and will be documented as an addendum to the Service Agreement.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7, marginBottom: 12 }}>
              MOHD.HMS ENTERPRISE is committed to continuously improving our service delivery standards and welcomes client feedback on SLA performance. We may proactively propose adjustments to response times, resolution targets, or reporting frequencies where we believe such changes will benefit the client relationship and service outcomes.
            </p>
            <p style={{ color: 'var(--hm-muted)', lineHeight: 1.7 }}>
              For any questions regarding this SLA or to discuss adjustments to service levels, please contact our operations team.
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
            Contact our team to discuss your service level requirements.
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