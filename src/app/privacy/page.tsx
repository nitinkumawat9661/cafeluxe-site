import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Privacy Policy | CafeLuxe",
  description: "CafeLuxe privacy policy explaining information collection, cookies, data protection, third-party links, DPDP Act compliance and contact details.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  ["1. Information We Collect", ["We may collect personal information when you visit our site, fill out a form, contact us, or interact with our services.", "Personal Identification Information may include your name, email address, phone number, and other details voluntarily provided through contact forms, newsletter subscriptions, or inquiries.", "Non-Personal Identification Information may include browser details, device type, operating system, technical connection information, and IP address."]],
  ["2. How We Use Your Information", ["To improve customer service and respond to support needs efficiently.", "To personalize user experience and understand how users use our site and services.", "To improve our Website, services, menu, and functionality using feedback.", "To send periodic emails related to inquiries, updates, news, products, or services. You may unsubscribe at any time."]],
  ["3. Cookies and Web Beacons", ["Cafe Luxe uses cookies to store visitor preferences and pages accessed or visited.", "This information helps optimize user experience by customizing webpage content based on browser type or other information.", "You can disable cookies through your browser options."]],
  ["4. Protection of Your Information", ["We adopt appropriate data collection, storage, processing practices, and security measures to protect against unauthorized access, alteration, disclosure, or destruction of personal information, username, password, transaction information, and data stored on our site."]],
  ["5. Sharing Your Personal Information", ["We do not sell, trade, or rent personal identification information to others.", "We may share generic aggregated demographic information not linked to personal identification information with business partners, trusted affiliates, and advertisers for the purposes outlined above."]],
  ["6. Third-Party Websites", ["Our site may contain links to partners, suppliers, advertisers, sponsors, licensors, or other third parties.", "We do not control external websites and are not responsible for their content, links, practices, terms, or privacy policies."]],
  ["7. Compliance with Laws India", ["We operate in compliance with applicable Indian data protection laws, including the Digital Personal Data Protection DPDP Act.", "Your data is processed lawfully, transparently, and securely.", "You may request access, correction, or erasure of your personal data stored with us."]],
  ["8. Children's Information", ["We encourage parents and guardians to observe, participate in, monitor, and guide children's online activity.", "Cafe Luxe does not knowingly collect Personal Identifiable Information from children under the age of 13 or applicable age of digital consent.", "If such information is provided, contact us and we will do our best to promptly remove it."]],
  ["9. Changes to This Privacy Policy", ["Cafe Luxe may update this privacy policy at any time. Users are encouraged to check this page frequently for changes. Continued use of the Website means acceptance of changes."]],
  ["10. Your Acceptance of These Terms", ["By using this Website, you signify your acceptance of this policy. If you do not agree, please do not use our Website."]],
  ["11. Contacting Us", ["Email: nitinkumawat985@gmail.com"]],
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <section className="relative px-5 py-6 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(217,184,106,.24),transparent_28%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />
        <div className="relative mx-auto max-w-5xl">
          <SiteNav />
          <header className="mt-12 rounded-[2rem] border border-[#D9B86A]/22 bg-black/68 p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Legal and data protection</p>
            <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.4rem)] italic leading-[.95]">Privacy Policy</h1>
            <p className="mt-5 leading-8 text-[#D8CFBE]">At Cafe Luxe, accessible from https://cafeluxesite.in/, one of our main priorities is the privacy of our visitors.</p>
          </header>
          <div className="mt-8 grid gap-5">
            {sections.map(([title, items]) => (
              <article key={title} className="rounded-[1.6rem] border border-[#D9B86A]/18 bg-black/62 p-6 backdrop-blur-xl">
                <h2 className="font-serif text-2xl text-[#E7D3A1]">{title}</h2>
                {items.map((item) => <p key={item} className="mt-3 text-sm leading-7 text-[#D8CFBE]">{item}</p>)}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}