import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import BookDemoForm from "@/components/BookDemoForm";

export const metadata: Metadata = {
  title: "Contact Us | CafeLuxe",
  description:
    "Contact CafeLuxe for restaurant QR ordering, POS, KOT billing, staff app, website and restaurant technology demo inquiries.",
  alternates: { canonical: "/contact" },
};

const contact = [
  ["Email", "nitinkumawat985@gmail.com"],
  ["Phone", "7414853321"],
  ["Website", "https://cafeluxesite.in/"],
];

export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <section className="relative px-5 py-6 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(217,184,106,.24),transparent_28%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />
        <div className="relative mx-auto max-w-6xl">
          <SiteNav />

          <header className="mt-10 rounded-[2rem] border border-[#D9B86A]/22 bg-black/68 p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Contact CafeLuxe</p>
            <h1 className="mt-4 max-w-5xl font-serif text-[clamp(3rem,5vw,5.4rem)] italic leading-[.95]">
              Talk to Us About Your Restaurant Technology Setup.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#D8CFBE]">
              For QR ordering, POS, KOT billing, staff app, website, demo, or custom restaurant workflow requirements, use the demo form or contact details below.
            </p>
          </header>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {contact.map(([title, value]) => (
              <article key={title} className="rounded-[1.6rem] border border-[#D9B86A]/18 bg-black/62 p-6 backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[.24em] text-[#D9B86A]">{title}</p>
                <p className="mt-4 break-words text-lg font-semibold leading-8 text-[#E7D3A1] sm:text-xl">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-[#D9B86A]/22 bg-black/68 p-8 backdrop-blur-xl">
            <h2 className="font-serif text-3xl text-[#E7D3A1]">Request a Demo</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8CFBE]">
              Click the Book a Demo button and submit your details. Your inquiry will be sent directly to our team.
            </p>
            <div className="mt-6"><BookDemoForm /></div>
          </div>
        </div>
      </section>
    </main>
  );
}