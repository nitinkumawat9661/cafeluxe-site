import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Terms and Conditions | CafeLuxe",
  description: "CafeLuxe terms and conditions for website usage, intellectual property, services, pricing, refunds and contact details.",
  alternates: { canonical: "/terms" },
};

const sections = [
  ["1. Intellectual Property Rights", ["Unless otherwise stated, Cafe Luxe and/or its licensors own the intellectual property rights for all material on this Website. All intellectual property rights are reserved. You may access this from Cafe Luxe for your own personal use subjected to restrictions set in these terms and conditions.", "You must not republish, sell, rent, sub-license, reproduce, duplicate, copy, or redistribute content from Cafe Luxe unless content is specifically made for redistribution."]],
  ["2. Use of the Website", ["The content of the pages of this Website is for your general information and use only. It is subject to change without notice.", "Unauthorized use of this Website may give rise to a claim for damages and/or be a criminal offense.", "You agree not to use the Website for any purpose that is unlawful, prohibited by these Terms, or harmful to others."]],
  ["3. User Comments and Content", ["Certain parts of this Website may offer the opportunity for users to post and exchange opinions, information, or material. Cafe Luxe does not filter, edit, publish, or review Comments prior to their appearance on the Website.", "Comments do not reflect the views and opinions of Cafe Luxe, its agents, and/or affiliates.", "Cafe Luxe reserves the right to monitor all Comments and remove inappropriate, offensive, or terms-breaching Comments."]],
  ["4. Products, Services, and Pricing", ["All products or services displayed on the Website are subject to availability.", "We reserve the right to modify the prices of our products or services, or discontinue them, at any time without prior notice.", "We strive to display products, menu items, and services accurately, but cannot guarantee that your deviceÃ¢â‚¬â„¢s display will perfectly reflect actual colors or details."]],
  ["5. Disclaimer of Warranties and Limitation of Liability", ["This Website and its content are provided on an \"as is\" and \"as available\" basis without warranties of any kind.", "Cafe Luxe does not guarantee that the Website will be uninterrupted, timely, secure, or error-free.", "To the maximum extent permitted by applicable law, Cafe Luxe shall not be liable for damages arising from your access to, use of, or inability to use this Website."]],
  ["6. Third-Party Links", ["Our Website may contain links to third-party websites or services that are not owned or controlled by Cafe Luxe. We assume no responsibility for their content, privacy policies, or practices."]],
  ["7. Privacy Policy", ["Your use of our Website is also governed by our Privacy Policy. Please review our Privacy Policy to understand how we collect, use, and protect your personal data."]],
  ["8. Governing Law", ["These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts located in India."]],
  ["9. Changes to These Terms", ["We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice before new terms take effect."]],
  ["10. Refunds", ["We do not provide any kind of refund due to nature of business."]],
  ["11. Contact Us", ["Email: nitinkumawat985@gmail.com", "Contact - 7414853321"]],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <section className="relative px-5 py-6 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(217,184,106,.24),transparent_28%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />
        <div className="relative mx-auto max-w-5xl">
          <SiteNav />
          <header className="mt-12 rounded-[2rem] border border-[#D9B86A]/22 bg-black/68 p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Legal</p>
            <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.4rem)] italic leading-[.95]">Terms and Conditions</h1>
            <p className="mt-5 leading-8 text-[#D8CFBE]">Welcome to Cafe Luxe. These Terms govern your use of https://cafeluxesite.in/ and any services, content, or products provided through it. This website is managed by Nitin kumawat.</p>
          </header>

          <div className="mt-8 grid gap-5">
            {sections.map(([title, items]) => (
              <article key={title as string} className="rounded-[1.6rem] border border-[#D9B86A]/18 bg-black/62 p-6 backdrop-blur-xl">
                <h2 className="font-serif text-2xl text-[#E7D3A1]">{title}</h2>
                {(items as string[]).map((item) => <p key={item} className="mt-3 text-sm leading-7 text-[#D8CFBE]">{item}</p>)}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}