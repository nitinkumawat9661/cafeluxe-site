import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "About Us | CafeLuxe",
  description:
    "About CafeLuxe, a premium restaurant technology platform for QR ordering, POS workflow, KOT billing, staff operations and digital restaurant control.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <section className="relative px-5 py-6 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(217,184,106,.24),transparent_28%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />
        <div className="relative mx-auto max-w-6xl">
          <SiteNav />

          <header className="mt-14 rounded-[2rem] border border-[#D9B86A]/22 bg-black/68 p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">About CafeLuxe</p>
            <h1 className="mt-4 max-w-5xl font-serif text-[clamp(3rem,5vw,5.4rem)] italic leading-[.95]">
              Premium Restaurant Technology Built for Serious Operations.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#D8CFBE]">
              CafeLuxe is a restaurant technology platform focused on QR ordering, digital menu systems, POS workflow, KOT billing, staff operations and business records.
            </p>
          </header>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {["QR Ordering", "KOT Billing", "Staff App"].map((item) => (
              <div key={item} className="rounded-[1.6rem] border border-[#D9B86A]/18 bg-black/62 p-6">
                <h2 className="font-serif text-2xl text-[#E7D3A1]">{item}</h2>
                <p className="mt-3 text-sm leading-7 text-[#D8CFBE]">Built to help restaurants handle daily operations with speed, clarity and premium customer experience.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}