'use client';

import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-emerald-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-600 text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-emerald-700 tracking-tight">
                MOHD.HMS
              </span>
              <span className="text-lg font-light text-emerald-600 tracking-tight ml-1">
                ENTERPRISE
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500">
            Effective Date: January 1, 2026 &nbsp;|&nbsp; Version: 1.0
          </p>
          <Separator className="mt-6 bg-emerald-200" />
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-sm sm:text-base leading-relaxed text-gray-700">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              1. Introduction
            </h2>
            <p>
              MOHD.HMS ENTERPRISE (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed
              to protecting your privacy and ensuring the security of your
              personal data. This Privacy Policy explains how we collect, use,
              disclose, store, and protect your information when you access or
              use our facility management platform and related services
              (collectively, the &ldquo;Service&rdquo;).
            </p>
            <p className="mt-3">
              This policy applies to all users of the Service, including
              facility managers, maintenance personnel, administrators,
              vendors, and any other authorised users. By using our Service,
              you acknowledge that you have read, understood, and consent to
              the practices described in this Privacy Policy.
            </p>
            <p className="mt-3">
              Our Data Protection Officer can be reached at{' '}
              <a
                href="mailto:privacy@mohdhms.com"
                className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
              >
                privacy@mohdhms.com
              </a>
              .
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              2. Information We Collect
            </h2>
            <p>We collect several categories of information to provide and improve our Service:</p>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">
              2.1 Information You Provide Directly
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">Account Information:</span> Full
                name, email address, phone number, job title, department, and
                organisation name during registration.
              </li>
              <li>
                <span className="font-medium">Authentication Data:</span>
                Login credentials, passwords (stored in encrypted form), and
                authentication tokens.
              </li>
              <li>
                <span className="font-medium">Business Data:</span> Work orders,
                maintenance records, equipment details, inventory data,
                complaints, quotations, invoices, and vendor information you
                input into the Service.
              </li>
              <li>
                <span className="font-medium">Communications:</span> Messages,
                feedback, support requests, and correspondence you send to us.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">Usage Data:</span> Pages visited,
                features used, time spent on the Service, and interaction
                patterns.
              </li>
              <li>
                <span className="font-medium">Device Information:</span> Browser
                type, operating system, device type, IP address, and screen
                resolution.
              </li>
              <li>
                <span className="font-medium">Log Data:</span> Access times,
                error logs, and system event data for troubleshooting and
                security purposes.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-5 mb-2">
              2.3 Information from Third Parties
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Information from integration partners (e.g., WhatsApp Business
                API providers) when you connect external services.
              </li>
              <li>
                Publicly available information relevant to facility management
                operations.
              </li>
            </ul>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              3. How We Use Your Information
            </h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">Service Delivery:</span> To
                provide, maintain, and improve the CMMS facility management
                platform and its features.
              </li>
              <li>
                <span className="font-medium">Authentication &amp; Security:</span>{' '}
                To verify your identity, manage access controls, and protect
                against unauthorised access.
              </li>
              <li>
                <span className="font-medium">Communication:</span> To send
                service-related notifications, system alerts, maintenance
                reminders, and respond to your inquiries.
              </li>
              <li>
                <span className="font-medium">Analytics &amp; Improvement:</span>{' '}
                To analyse usage patterns, identify trends, and enhance the
                performance and usability of the Service.
              </li>
              <li>
                <span className="font-medium">Compliance:</span> To comply with
                applicable laws, regulations, and legal processes in Brunei
                Darussalam.
              </li>
              <li>
                <span className="font-medium">Support:</span> To provide
                technical support, troubleshoot issues, and resolve disputes.
              </li>
            </ul>
          </section>

          {/* 4. Data Sharing & Disclosure */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              4. Data Sharing &amp; Disclosure
            </h2>
            <p>
              We do not sell, trade, or rent your personal data to third
              parties. We may share your information only in the following
              circumstances:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">Within Your Organisation:</span>{' '}
                Authorised users within your organisation who have been granted
                appropriate access permissions may view relevant business data
                as required for their roles.
              </li>
              <li>
                <span className="font-medium">Service Providers:</span> Trusted
                third-party vendors who assist us in operating the Service
                (e.g., cloud hosting, communication providers) under strict
                confidentiality obligations.
              </li>
              <li>
                <span className="font-medium">Legal Requirements:</span> When
                required by law, regulation, court order, or governmental
                authority of Brunei Darussalam or other applicable
                jurisdictions.
              </li>
              <li>
                <span className="font-medium">Business Transfers:</span> In
                connection with a merger, acquisition, reorganisation, or sale
                of assets, your data may be transferred to the acquiring
                entity.
              </li>
              <li>
                <span className="font-medium">Consent:</span> When you have
                given us explicit consent to share your information for a
                specific purpose.
              </li>
            </ul>
          </section>

          {/* 5. Data Storage & Security */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              5. Data Storage &amp; Security
            </h2>
            <p>
              We implement robust technical and organisational measures to
              protect your personal data:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">Encryption:</span> Data is
                encrypted in transit using TLS/SSL protocols and at rest
                using industry-standard encryption methods.
              </li>
              <li>
                <span className="font-medium">Access Controls:</span> Role-based
                access control (RBAC) ensures that users can only access data
                relevant to their authorised role.
              </li>
              <li>
                <span className="font-medium">Infrastructure Security:</span>
                Regular security audits, vulnerability assessments, and
                penetration testing of our systems.
              </li>
              <li>
                <span className="font-medium">Data Backups:</span> Regular,
                encrypted backups to prevent data loss in the event of
                hardware failure or other incidents.
              </li>
              <li>
                <span className="font-medium">Incident Response:</span>
                Established procedures for detecting, reporting, and
                responding to data security incidents.
              </li>
            </ul>
            <p className="mt-3">
              While we employ reasonable security measures, no system is
              completely secure. We cannot guarantee the absolute security of
              your data and encourage you to use strong passwords and protect
              your account credentials.
            </p>
          </section>

          {/* 6. Cookies & Tracking */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              6. Cookies &amp; Tracking Technologies
            </h2>
            <p>
              Our Service may use cookies and similar tracking technologies to
              enhance your experience:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">Essential Cookies:</span> Required
                for authentication, session management, and core Service
                functionality. These cannot be disabled.
              </li>
              <li>
                <span className="font-medium">Analytics Cookies:</span> Help us
                understand how users interact with the Service and identify
                areas for improvement.
              </li>
              <li>
                <span className="font-medium">Preference Cookies:</span> Remember
                your settings and preferences for a more personalised
                experience.
              </li>
            </ul>
            <p className="mt-3">
              You can manage your cookie preferences through your browser
              settings. Please note that disabling certain cookies may affect
              the functionality of the Service.
            </p>
          </section>

          {/* 7. User Rights */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              7. Your Rights
            </h2>
            <p>
              Under applicable data protection laws of Brunei Darussalam, you
              have the following rights regarding your personal data:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">Right of Access:</span> You may
                request a copy of the personal data we hold about you.
              </li>
              <li>
                <span className="font-medium">Right to Correction:</span> You
                may request correction of any inaccurate or incomplete personal
                data.
              </li>
              <li>
                <span className="font-medium">Right to Deletion:</span> You may
                request the deletion of your personal data, subject to legal
                retention requirements and legitimate business needs.
              </li>
              <li>
                <span className="font-medium">Right to Restrict Processing:</span>{' '}
                You may request that we limit the processing of your personal
                data in certain circumstances.
              </li>
              <li>
                <span className="font-medium">Right to Data Portability:</span>{' '}
                You may request to receive your personal data in a structured,
                commonly used, and machine-readable format.
              </li>
              <li>
                <span className="font-medium">Right to Withdraw Consent:</span>{' '}
                Where processing is based on consent, you may withdraw your
                consent at any time without affecting the lawfulness of prior
                processing.
              </li>
              <li>
                <span className="font-medium">Right to Lodge a Complaint:</span>{' '}
                You have the right to lodge a complaint with the relevant data
                protection authority in Brunei Darussalam.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact our Data
              Protection Officer at{' '}
              <a
                href="mailto:privacy@mohdhms.com"
                className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
              >
                privacy@mohdhms.com
              </a>
              . We will respond to your request within thirty (30) days.
            </p>
          </section>

          {/* 8. Data Retention */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              8. Data Retention
            </h2>
            <p>
              We retain your personal data only for as long as necessary to
              fulfil the purposes for which it was collected, including:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                For the duration of your account&apos;s active status.
              </li>
              <li>
                As required by applicable laws, regulations, or legal
                proceedings in Brunei Darussalam.
              </li>
              <li>
                To resolve disputes, enforce our agreements, and protect our
                legal rights.
              </li>
            </ul>
            <p className="mt-3">
              When personal data is no longer required, we will securely
              delete or anonymise it in accordance with our data retention
              procedures. Business data (such as work orders and maintenance
              records) may be retained for longer periods as required for
              operational and compliance purposes.
            </p>
          </section>

          {/* 9. Children's Privacy */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              9. Children&apos;s Privacy
            </h2>
            <p>
              The Service is not intended for use by individuals under the age
              of eighteen (18). We do not knowingly collect personal data from
              children. If we discover that we have inadvertently collected
              personal data from a child, we will take immediate steps to
              delete such information from our systems.
            </p>
            <p className="mt-3">
              If you believe that a child has provided us with personal data,
              please contact our Data Protection Officer at{' '}
              <a
                href="mailto:privacy@mohdhms.com"
                className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
              >
                privacy@mohdhms.com
              </a>
              .
            </p>
          </section>

          {/* 10. Changes to This Policy */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              10. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, or legal requirements. When
              we make changes:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                We will update the &ldquo;Effective Date&rdquo; and &ldquo;Version&rdquo; at the
                top of this page.
              </li>
              <li>
                For material changes, we will notify you through the Service,
                via email, or by other reasonable means.
              </li>
              <li>
                Your continued use of the Service after changes become
                effective constitutes your acceptance of the revised policy.
              </li>
            </ul>
            <p className="mt-3">
              We encourage you to review this Privacy Policy periodically to
              stay informed about how we protect your information.
            </p>
          </section>

          {/* 11. Contact Us */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              11. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 sm:p-6 space-y-2 text-sm">
              <p className="font-semibold text-gray-900">
                MOHD.HMS ENTERPRISE
              </p>
              <p>
                <span className="font-medium text-gray-600">Address:</span>{' '}
                Bandar Seri Begawan, Brunei Darussalam
              </p>
              <p>
                <span className="font-medium text-gray-600">Email:</span>{' '}
                <a
                  href="mailto:info@mohdhms.com"
                  className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  info@mohdhms.com
                </a>
              </p>
              <p>
                <span className="font-medium text-gray-600">Phone:</span>{' '}
                +673 000 0000
              </p>
              <Separator className="my-3 bg-emerald-200" />
              <p>
                <span className="font-medium text-gray-600">Data Protection Officer:</span>{' '}
                <a
                  href="mailto:privacy@mohdhms.com"
                  className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  privacy@mohdhms.com
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Back to Login */}
        <Separator className="my-10 bg-gray-200" />
        <div className="flex justify-center">
          <Button
            variant="outline"
            asChild
            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} MOHD.HMS ENTERPRISE. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms-and-conditions"
              className="hover:text-emerald-600 transition-colors"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/privacy-policy"
              className="hover:text-emerald-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}