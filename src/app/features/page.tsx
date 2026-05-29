import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "CafeLuxe Features | QR Ordering, POS, KOT Billing & Staff App",
  description:
    "Explore CafeLuxe restaurant software features including QR table ordering, digital menu, KOT billing, staff app, live records, payments and restaurant operations.",
  keywords: [
    "QR ordering software",
    "restaurant POS software",
    "KOT billing software",
    "digital menu for restaurants",
    "restaurant staff app",
    "CafeLuxe features"
  ],
  alternates: { canonical: "/features" },
};

const features = [
  ["01", "QR Table Ordering", "Guests scan the table QR, browse the digital menu and place orders without waiting for staff."],
  ["02", "Live Digital Menu", "Menu categories, item availability and pricing stay organized for smooth restaurant operations."],
  ["03", "KOT Billing Workflow", "Kitchen order tickets help staff prepare orders faster with clearer communication."],
  ["04", "Staff Android App", "Restaurant teams can manage orders, KOT, billing, payments and records from the staff app."],
  ["05", "Payment & Records", "Track daily orders, payment status, business records and operational movement from one system."],
  ["06", "Admin Control Layer", "Restaurant owners get cleaner control over menu, tables, records and staff-side workflows."],
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <section className="relative overflow-hidden px-5 py-6 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(217,184,106,.28),transparent_28%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />

        <div className="relative mx-auto max-w-[1660px]">
          <SiteNav />

          <header className="grid gap-8 py-16 lg:grid-cols-[.58fr_.42fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">CafeLuxe feature suite</p>
              <h1 className="mt-5 max-w-5xl font-serif text-[clamp(3.2rem,5vw,5.6rem)] italic leading-[.95] tracking-[-0.05em]">
                Built for Restaurants That Need Speed, Control and Premium Guest Flow.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-8 text-[#D8CFBE]">
              CafeLuxe combines QR ordering, digital menu management, KOT billing and staff operations into one premium restaurant-tech system.
            </p>
          </header>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map(([num, title, text]) => (
              <article key={title} className="rounded-[2rem] border border-[#D9B86A]/20 bg-black/62 p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#D9B86A]/45">
                <p className="font-serif text-4xl italic text-[#D9B86A]">{num}</p>
                <h2 className="mt-5 font-serif text-2xl text-[#E7D3A1]">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-[#D8CFBE]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}