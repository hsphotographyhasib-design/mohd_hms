'use client';

import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function TermsAndConditionsPage() {
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
            Terms &amp; Conditions
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
              Welcome to MOHD.HMS ENTERPRISE. These Terms and Conditions
              (&ldquo;Terms&rdquo;) govern your access to and use of the
              MOHD.HMS ENTERPRISE facility management platform, including all
              related services, applications, tools, and documentation
              (collectively, the &ldquo;Service&rdquo;).
            </p>
            <p className="mt-3">
              By accessing or using our Service, you agree to be bound by these
              Terms. If you do not agree with any part of these Terms, you must
              not use the Service. We recommend that you read these Terms
              carefully and consult with legal counsel if you have any questions.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              2. Description of Service
            </h2>
            <p>
              MOHD.HMS ENTERPRISE provides a comprehensive Computerised
              Maintenance Management System (CMMS) designed for facility
              management operations. Our Service includes, but is not limited to:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                Work order management, creation, assignment, and tracking
              </li>
              <li>
                Preventive maintenance scheduling and execution
              </li>
              <li>
                Equipment and asset lifecycle management
              </li>
              <li>
                Inventory and spare parts tracking
              </li>
              <li>
                QR code-based equipment identification and service requests
              </li>
              <li>
                Complaints management and escalation workflows
              </li>
              <li>
                Financial management including quotations and invoicing
              </li>
              <li>
                Employee and vendor management
              </li>
              <li>
                Reporting, analytics, and dashboard insights
              </li>
              <li>
                WhatsApp integration for real-time communication
              </li>
            </ul>
            <p className="mt-3">
              We reserve the right to modify, suspend, or discontinue any part
              of the Service at any time, with or without notice.
            </p>
          </section>

          {/* 3. User Accounts & Registration */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              3. User Accounts &amp; Registration
            </h2>
            <p>
              To access certain features of the Service, you must register for
              an account. When registering, you agree to the following:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                You must provide accurate, current, and complete information
                during registration and keep it updated at all times.
              </li>
              <li>
                You are responsible for safeguarding your login credentials and
                for all activities that occur under your account.
              </li>
              <li>
                You must immediately notify us of any unauthorised use of your
                account or any other breach of security.
              </li>
              <li>
                You may not create multiple accounts, impersonate another
                person, or use false information.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that
                violate these Terms or are inactive for an extended period.
              </li>
            </ul>
          </section>

          {/* 4. Acceptable Use Policy */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              4. Acceptable Use Policy
            </h2>
            <p>
              You agree to use the Service only for lawful purposes and in
              accordance with these Terms. You shall not:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                Use the Service in any way that violates applicable laws or
                regulations of Brunei Darussalam or any other jurisdiction.
              </li>
              <li>
                Attempt to gain unauthorised access to any portion of the
                Service, other accounts, or computer systems.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service.
              </li>
              <li>
                Upload, transmit, or distribute any malicious software, viruses,
                or harmful code.
              </li>
              <li>
                Use the Service to send unsolicited communications, spam, or
                promotional material.
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any part of the
                Service.
              </li>
              <li>
                Use automated scripts, bots, or scraping tools to access the
                Service without prior written consent.
              </li>
              <li>
                Share your account access with unauthorised third parties.
              </li>
            </ul>
          </section>

          {/* 5. Intellectual Property */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              5. Intellectual Property
            </h2>
            <p>
              The Service and all of its contents, features, and functionality
              &mdash; including but not limited to text, graphics, logos, icons,
              images, audio clips, software, data compilations, and the design,
              selection, and arrangement thereof &mdash; are owned by
              MOHD.HMS ENTERPRISE, its licensors, or other providers of such
              material and are protected by copyright, trademark, patent, trade
              secret, and other intellectual property laws.
            </p>
            <p className="mt-3">
              You are granted a limited, non-exclusive, non-transferable,
              revocable licence to access and use the Service for your internal
              business operations. You may not:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                Reproduce, distribute, or publicly display any part of the
                Service without prior written consent.
              </li>
              <li>
                Modify, adapt, or create derivative works based on the Service.
              </li>
              <li>
                Use any trademarks, service marks, or trade names belonging to
                MOHD.HMS ENTERPRISE without express permission.
              </li>
            </ul>
            <p className="mt-3">
              All data you input into the Service remains your property.
              MOHD.HMS ENTERPRISE does not claim ownership of your data.
            </p>
          </section>

          {/* 6. Data Protection & Privacy */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              6. Data Protection &amp; Privacy
            </h2>
            <p>
              Your privacy is important to us. Our collection, use, and
              protection of personal data is governed by our{' '}
              <Link
                href="/privacy-policy"
                className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>
              , which forms an integral part of these Terms. By using the
              Service, you consent to the collection and use of your information
              as described in the Privacy Policy.
            </p>
            <p className="mt-3">
              We comply with applicable data protection laws of Brunei
              Darussalam and implement appropriate technical and organisational
              measures to protect your personal data against unauthorised
              access, alteration, disclosure, or destruction.
            </p>
          </section>

          {/* 7. Service Availability */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              7. Service Availability
            </h2>
            <p>
              We strive to provide uninterrupted access to the Service; however,
              the Service is provided on an &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; basis. We do not guarantee that:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                The Service will be available at all times, without
                interruptions, or error-free.
              </li>
              <li>
                The results obtained from the use of the Service will be
                accurate or reliable.
              </li>
              <li>
                Any defects or errors in the Service will be corrected.
              </li>
            </ul>
            <p className="mt-3">
              We may perform scheduled or emergency maintenance that may
              temporarily affect the availability of the Service. We will
              endeavour to provide reasonable advance notice for scheduled
              maintenance where practicable.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              8. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law in Brunei
              Darussalam:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                MOHD.HMS ENTERPRISE shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages,
                including but not limited to loss of profits, data, use,
                goodwill, or other intangible losses.
              </li>
              <li>
                Our total aggregate liability arising out of or related to
                these Terms or the Service shall not exceed the total fees
                paid by you to MOHD.HMS ENTERPRISE in the twelve (12) months
                preceding the event giving rise to the claim.
              </li>
              <li>
                We are not liable for any unauthorised access to or
                alteration of your data, or any failure to store or transmit
                data.
              </li>
            </ul>
            <p className="mt-3">
              Nothing in these Terms shall exclude or limit liability for
              death or personal injury caused by negligence, fraud, or any
              other liability that cannot be excluded or limited by applicable
              law.
            </p>
          </section>

          {/* 9. Modifications to Terms */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              9. Modifications to Terms
            </h2>
            <p>
              We reserve the right to revise and update these Terms at any time
              at our sole discretion. When we make changes, we will:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>
                Update the &ldquo;Effective Date&rdquo; and &ldquo;Version&rdquo; at the top of this
                page.
              </li>
              <li>
                Provide notice through the Service, via email, or by other
                reasonable means for material changes.
              </li>
            </ul>
            <p className="mt-3">
              Your continued use of the Service after any modifications
              constitutes your acceptance of the revised Terms. If you do not
              agree with the updated Terms, you must discontinue use of the
              Service.
            </p>
          </section>

          {/* 10. Governing Law */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              10. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of Brunei Darussalam, without regard to its conflict of
              law provisions. Any disputes arising from or relating to these
              Terms or the Service shall be subject to the exclusive
              jurisdiction of the courts of Brunei Darussalam.
            </p>
          </section>

          {/* 11. Contact Information */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              11. Contact Information
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding these
              Terms and Conditions, please contact us:
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