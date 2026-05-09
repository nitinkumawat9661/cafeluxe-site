"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#F8F5F0" }}
    >
      {/* Header with Back Button */}
      <header
        className="border-b"
        style={{ borderColor: "#E8D9C5" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-75"
            style={{ color: "#C6A57B" }}
          >
            <ChevronLeft size={18} />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Page Title */}
        <div className="mb-12 sm:mb-16">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            Privacy Policy
          </h1>
          <p
            className="text-base sm:text-lg"
            style={{ color: "#7A6D60" }}
          >
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Introduction Section */}
        <section className="mb-12">
          <p
            className="text-base sm:text-lg leading-relaxed mb-4"
            style={{ color: "#2E2A26" }}
          >
            CafeLuxe (&quot;we,&quot; &quot;us,&quot; &quot;our,&quot; or &quot;Company&quot;) is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you visit our platform and use
            our services.
          </p>
          <p
            className="text-base sm:text-lg leading-relaxed"
            style={{ color: "#2E2A26" }}
          >
            Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do
            not use our services.
          </p>
        </section>

        {/* Information Collection Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            1. Information We Collect
          </h2>

          <div className="space-y-6">
            <div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "#C6A57B" }}
              >
                Information You Provide Directly
              </h3>
              <p
                className="text-base leading-relaxed mb-3"
                style={{ color: "#2E2A26" }}
              >
                We collect information you voluntarily provide, including but not limited to:
              </p>
              <ul
                className="space-y-2 pl-4 sm:pl-6 list-disc"
                style={{ color: "#2E2A26" }}
              >
                <li>Account credentials (name, email address, phone number)</li>
                <li>Restaurant or business information</li>
                <li>Payment and billing information</li>
                <li>Table configurations and menu data</li>
                <li>Customer and order information you input into the platform</li>
                <li>Communications with our support team</li>
              </ul>
            </div>

            <div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "#C6A57B" }}
              >
                Automatically Collected Information
              </h3>
              <p
                className="text-base leading-relaxed mb-3"
                style={{ color: "#2E2A26" }}
              >
                When you access our platform, we automatically collect:
              </p>
              <ul
                className="space-y-2 pl-4 sm:pl-6 list-disc"
                style={{ color: "#2E2A26" }}
              >
                <li>Device information (type, operating system, browser type)</li>
                <li>IP address and approximate geolocation</li>
                <li>Pages visited and time spent on each page</li>
                <li>Referring/exit pages and click patterns</li>
                <li>Search queries and interaction data</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Usage Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            2. How We Use Your Information
          </h2>

          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: "#2E2A26" }}
          >
            CafeLuxe uses the collected information for various purposes:
          </p>

          <ul
            className="space-y-3 pl-4 sm:pl-6 list-disc"
            style={{ color: "#2E2A26" }}
          >
            <li>
              <span className="font-semibold">Service Provision:</span> To deliver, maintain, and improve our SaaS
              platform and services
            </li>
            <li>
              <span className="font-semibold">Communication:</span> To send transactional emails, service updates, and
              customer support responses
            </li>
            <li>
              <span className="font-semibold">Billing:</span> To process payments and manage your account subscriptions
            </li>
            <li>
              <span className="font-semibold">Analytics:</span> To understand usage patterns and optimize platform
              performance
            </li>
            <li>
              <span className="font-semibold">Security:</span> To detect fraud, prevent abuse, and protect our platform
            </li>
            <li>
              <span className="font-semibold">Compliance:</span> To comply with legal obligations and enforce our terms
              of service
            </li>
            <li>
              <span className="font-semibold">Marketing:</span> To send promotional materials (with your consent)
            </li>
          </ul>
        </section>

        {/* Cookies Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            3. Cookies and Tracking Technologies
          </h2>

          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: "#2E2A26" }}
          >
            We use cookies, web beacons, pixels, and similar technologies to enhance your experience and gather usage
            data.
          </p>

          <div className="space-y-4 mb-4">
            <div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "#C6A57B" }}
              >
                Types of Cookies:
              </h3>
              <ul
                className="space-y-2 pl-4 sm:pl-6 list-disc"
                style={{ color: "#2E2A26" }}
              >
                <li>
                  <span className="font-semibold">Essential Cookies:</span> Required for authentication and security
                </li>
                <li>
                  <span className="font-semibold">Performance Cookies:</span> Track usage and optimize platform
                  functionality
                </li>
                <li>
                  <span className="font-semibold">Functional Cookies:</span> Remember your preferences and settings
                </li>
              </ul>
            </div>
          </div>

          <p
            className="text-base leading-relaxed"
            style={{ color: "#2E2A26" }}
          >
            You can control cookie preferences through your browser settings. However, disabling essential cookies may
            impact platform functionality.
          </p>
        </section>

        {/* Third-Party Services Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            4. Third-Party Services
          </h2>

          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: "#2E2A26" }}
          >
            CafeLuxe integrates with third-party services that may collect and process your data. These include:
          </p>

          <div className="space-y-6">
            <div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "#C6A57B" }}
              >
                Firebase (Google Cloud)
              </h3>
              <p
                className="text-base leading-relaxed"
                style={{ color: "#2E2A26" }}
              >
                We use Firebase for authentication, real-time database services, and analytics. Firebase processes your
                data according to{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:opacity-75 transition-opacity"
                  style={{ color: "#C6A57B" }}
                >
                  Google&apos;s Privacy Policy
                </a>
                . Your data is encrypted in transit and at rest.
              </p>
            </div>

            <div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "#C6A57B" }}
              >
                Netlify
              </h3>
              <p
                className="text-base leading-relaxed"
                style={{ color: "#2E2A26" }}
              >
                Our platform is hosted on Netlify, which may collect usage and analytics data. Review Netlify&apos;s privacy
                practices at their{" "}
                <a
                  href="https://www.netlify.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:opacity-75 transition-opacity"
                  style={{ color: "#C6A57B" }}
                >
                  Privacy Page
                </a>
                .
              </p>
            </div>

            <div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "#C6A57B" }}
              >
                Payment Processors
              </h3>
              <p
                className="text-base leading-relaxed"
                style={{ color: "#2E2A26" }}
              >
                Payment information is processed through secure third-party payment providers. We do not store full
                credit card details on our servers.
              </p>
            </div>

            <div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "#C6A57B" }}
              >
                Analytics Tools
              </h3>
              <p
                className="text-base leading-relaxed"
                style={{ color: "#2E2A26" }}
              >
                We may use analytics services to understand platform usage. These services may set their own cookies and
                collect anonymized usage data.
              </p>
            </div>
          </div>
        </section>

        {/* Data Security Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            5. Data Security
          </h2>

          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: "#2E2A26" }}
          >
            We implement industry-standard security measures to protect your data, including:
          </p>

          <ul
            className="space-y-2 pl-4 sm:pl-6 list-disc mb-4"
            style={{ color: "#2E2A26" }}
          >
            <li>End-to-end encryption for sensitive data</li>
            <li>Secure HTTPS connections</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication protocols</li>
            <li>Compliance with data protection regulations</li>
          </ul>

          <p
            className="text-base leading-relaxed"
            style={{ color: "#2E2A26" }}
          >
            However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security
            but commit to protecting your information to the best of our ability.
          </p>
        </section>

        {/* Data Retention Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            6. Data Retention
          </h2>

          <p
            className="text-base leading-relaxed"
            style={{ color: "#2E2A26" }}
          >
            We retain your personal data for as long as necessary to provide services, comply with legal obligations,
            and resolve disputes. You may request data deletion at any time, subject to legal requirements.
          </p>
        </section>

        {/* Your Privacy Rights Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            7. Your Privacy Rights
          </h2>

          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: "#2E2A26" }}
          >
            Depending on your location, you may have the following rights:
          </p>

          <ul
            className="space-y-3 pl-4 sm:pl-6 list-disc"
            style={{ color: "#2E2A26" }}
          >
            <li>
              <span className="font-semibold">Right to Access:</span> Request a copy of your personal data
            </li>
            <li>
              <span className="font-semibold">Right to Correction:</span> Update or correct inaccurate information
            </li>
            <li>
              <span className="font-semibold">Right to Deletion:</span> Request removal of your data
            </li>
            <li>
              <span className="font-semibold">Right to Opt-Out:</span> Unsubscribe from marketing communications
            </li>
            <li>
              <span className="font-semibold">Right to Data Portability:</span> Receive your data in a portable format
            </li>
          </ul>

          <p
            className="text-base leading-relaxed mt-4"
            style={{ color: "#2E2A26" }}
          >
            To exercise these rights, please contact us at privacy@cafeluxe.com with your request and supporting
            documentation.
          </p>
        </section>

        {/* Children's Privacy Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            8. Children&apos;s Privacy
          </h2>

          <p
            className="text-base leading-relaxed"
            style={{ color: "#2E2A26" }}
          >
            CafeLuxe is not intended for individuals under 18 years of age. We do not knowingly collect personal
            information from children. If we become aware that a child has provided us with information, we will
            promptly delete it and terminate the child&apos;s account.
          </p>
        </section>

        {/* Policy Changes Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            9. Changes to This Policy
          </h2>

          <p
            className="text-base leading-relaxed"
            style={{ color: "#2E2A26" }}
          >
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
            requirements, and other factors. We will notify you of material changes by posting the updated policy on
            our platform and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        {/* Contact Section */}
        <section className="mb-12">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-6 tracking-tight"
            style={{ color: "#2E2A26" }}
          >
            10. Contact Us
          </h2>

          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: "#2E2A26" }}
          >
            If you have questions about this Privacy Policy or our privacy practices, please contact us:
          </p>

          <div
            className="p-6 rounded-2xl mt-4"
            style={{ backgroundColor: "#E8D9C5" }}
          >
            <p
              className="text-base font-semibold mb-3"
              style={{ color: "#2E2A26" }}
            >
              CafeLuxe Privacy Team
            </p>
            <ul
              className="space-y-2 text-base"
              style={{ color: "#2E2A26" }}
            >
              <li>
                Email:{" "}
                <a
                  href="mailto:privacy@cafeluxe.com"
                  className="font-semibold hover:opacity-75 transition-opacity"
                  style={{ color: "#C6A57B" }}
                >
                  nitinkumawat985@gmail.com.com
                </a>
              </li>
              <li>Website: cafeluxe-site.vercel.app</li>
            </ul>
          </div>
        </section>

        {/* Footer Spacer */}
        <div className="mt-16 pt-8" style={{ borderTop: "1px solid #E8D9C5" }}>
          <p
            className="text-sm text-center"
            style={{ color: "#7A6D60" }}
          >
            © 2026 CafeLuxe. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
