import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "CafeLuxe FAQ | QR Ordering, POS, KOT Billing & Staff App Answers",
  description:
    "CafeLuxe FAQ answers common questions about QR ordering software, restaurant POS workflow, KOT billing, staff Android app, digital menu and restaurant demo setup.",
  keywords: [
    "CafeLuxe FAQ",
    "QR ordering software questions",
    "restaurant POS FAQ",
    "KOT billing software FAQ",
    "restaurant staff app FAQ",
    "digital menu FAQ",
  ],
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    question: "What is CafeLuxe?",
    answer:
      "CafeLuxe is restaurant software for QR table ordering, digital menu, POS workflow, KOT billing, staff app operations and business records.",
  },
  {
    question: "Who can use CafeLuxe?",
    answer:
      "CafeLuxe is built for restaurants, cafes, cloud kitchens, food courts, quick-service outlets and growing food businesses that need faster ordering and clearer operations.",
  },
  {
    question: "Does CafeLuxe support QR table ordering?",
    answer:
      "Yes. Customers can scan a table QR code, open the digital menu from their phone and place orders without waiting for staff to take the order manually.",
  },
  {
    question: "Does CafeLuxe include KOT billing?",
    answer:
      "Yes. CafeLuxe supports KOT billing workflow so restaurant staff and kitchen teams can coordinate orders more clearly.",
  },
  {
    question: "Does CafeLuxe have a staff Android app?",
    answer:
      "Yes. CafeLuxe provides a staff Android app for live restaurant operations, including order handling, KOT workflow, billing, payments and records.",
  },
  {
    question: "Can CafeLuxe be used by cafes and cloud kitchens?",
    answer:
      "Yes. CafeLuxe can be used by cafes, dine-in restaurants, cloud kitchens and food businesses that need digital menu, order workflow and staff-side control.",
  },
  {
    question: "How can I request a CafeLuxe demo?",
    answer:
      "You can request a CafeLuxe demo from the Contact page by submitting your name, business name, city, phone number and restaurant technology requirement.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="relative px-5 py-6 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(217,184,106,.24),transparent_28%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />
        <div className="relative mx-auto max-w-6xl">
          <SiteNav />

          <header className="mt-10 rounded-[2rem] border border-[#D9B86A]/22 bg-black/68 p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">CafeLuxe FAQ</p>
            <h1 className="mt-4 max-w-5xl font-serif text-[clamp(3rem,5vw,5.4rem)] italic leading-[.95]">
              Answers About QR Ordering, POS, KOT Billing and Staff App.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#D8CFBE]">
              Common questions about CafeLuxe restaurant software, QR table ordering, digital menu, KOT workflow, staff app and demo setup.
            </p>
          </header>

          <section className="mt-8 grid gap-4">
            {faqs.map(({ question, answer }) => (
              <article key={question} className="rounded-[1.6rem] border border-[#D9B86A]/18 bg-black/62 p-6 backdrop-blur-xl">
                <h2 className="font-serif text-2xl text-[#E7D3A1]">{question}</h2>
                <p className="mt-3 text-sm leading-7 text-[#D8CFBE]">{answer}</p>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-[2rem] border border-[#D9B86A]/22 bg-black/68 p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Request Demo</p>
            <h2 className="mt-3 max-w-4xl font-serif text-4xl italic leading-tight text-[#E7D3A1]">
              Need CafeLuxe for Your Restaurant?
            </h2>
            <p className="mt-5 max-w-4xl text-sm leading-8 text-[#D8CFBE]">
              Share your restaurant name, city and requirement so the CafeLuxe team can guide you for QR ordering, POS workflow, KOT billing and staff app setup.
            </p>
            <Link href="/contact" className="mt-6 inline-flex rounded-xl bg-[#D9B86A] px-7 py-4 font-black text-black">
              Contact CafeLuxe
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}
