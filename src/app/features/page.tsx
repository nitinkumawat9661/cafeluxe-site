import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features",
  description:
    "CafeLuxe features include QR ordering, digital menu, restaurant POS, KOT billing, staff app, table ordering, and admin order management.",
};

const features = [
  "QR table ordering for restaurants",
  "Digital menu with live product categories",
  "KOT billing workflow for kitchen operations",
  "Staff Android app for restaurant teams",
  "Admin order panel for live order tracking",
  "Menu, category, payment and records management",
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[#041421] px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-[#86B9B0]">← Back to CafeLuxe</Link>

        <h1 className="mt-8 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
          CafeLuxe features for modern restaurant ordering and billing.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#D0D6D6]">
          CafeLuxe combines QR ordering, restaurant POS workflows, KOT billing,
          staff operations, and digital menu management in one practical system.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-bold">{feature}</h2>
              <p className="mt-3 text-sm leading-6 text-[#D0D6D6]">
                Designed to reduce manual work and help restaurants handle orders faster.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
