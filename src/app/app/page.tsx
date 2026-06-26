import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Download CafeLuxe Staff App | Android APK",
  description: "Download the official CafeLuxe Staff Android APK for restaurant QR orders, KOT billing, POS workflow, payments and staff operations.",
  keywords: ["CafeLuxe staff app", "restaurant staff app", "restaurant KOT app", "Android POS app", "QR ordering staff app"],
  alternates: { canonical: "/app" },
};

const steps = [
  ["01", "Download the official APK", "Use only the CafeLuxe website download button for the latest staff app build."],
  ["02", "Allow Android installation", "If Android asks, allow install from browser or file manager for this APK."],
  ["03", "Install and open app", "Open CafeLuxe Staff App and continue with restaurant-side operations."],
  ["04", "Use secure staff workflow", "Handle orders, KOT, billing, payments and records from the staff app."]
];

export default function StaffAppPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <section className="relative overflow-hidden px-5 py-6 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_22%,rgba(217,184,106,.28),transparent_30%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />
        <div className="relative mx-auto max-w-[1660px]">
          <SiteNav />

          <div className="grid gap-10 py-14 lg:grid-cols-[.55fr_.45fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Official Android APK</p>
              <h1 className="mt-5 max-w-4xl font-serif text-[clamp(3rem,5vw,5.4rem)] italic leading-[.95] tracking-[-0.05em]">
                Download CafeLuxe Staff App for Live Restaurant Operations.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#D8CFBE]">
                Built for staff-side order handling, KOT billing, table workflows, payment status and daily restaurant control.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/downloads/cafeluxe-staff-app-latest.apk" download className="rounded-xl bg-[#D9B86A] px-7 py-4 font-black text-black">Download Latest APK</a>
                <Link href="/features" className="rounded-xl border border-[#D9B86A]/45 px-7 py-4 font-black text-[#E7D3A1]">View Features</Link>
              </div>
            </div>

            <div className="relative min-h-[470px] overflow-hidden rounded-[2.4rem] border border-[#D9B86A]/22 bg-black/68 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,184,106,.20),transparent_42%)]" />
              <Image src="/luxury/apk-phone-mockup.png" alt="CafeLuxe Staff App Android phone mockup" width={1000} height={1000} priority sizes="(max-width: 1024px) 78vw, 35vw" className="absolute left-1/2 top-1/2 w-[78%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_45px_110px_rgba(0,0,0,.98)]" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(([num, title, text]) => (
              <article key={title} className="rounded-[2rem] border border-[#D9B86A]/20 bg-black/62 p-6 backdrop-blur-xl">
                <p className="font-serif text-4xl italic text-[#D9B86A]">{num}</p>
                <h2 className="mt-4 font-serif text-2xl text-[#E7D3A1]">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#D8CFBE]">{text}</p>
              </article>
            ))}
          </div>

          <section className="mt-8 rounded-[2.4rem] border border-[#D9B86A]/22 bg-black/72 p-6 backdrop-blur-xl lg:p-8">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Android Staff App</p>
            <h2 className="mt-3 max-w-4xl font-serif text-4xl italic leading-tight text-[#E7D3A1]">
              CafeLuxe Staff App for Restaurant Teams
            </h2>
            <p className="mt-5 max-w-4xl text-sm leading-8 text-[#D8CFBE]">
              The CafeLuxe Staff App helps restaurant teams manage QR orders, KOT billing workflow, payment status, table activity and staff-side order handling from Android devices.
            </p>
            <p className="mt-4 max-w-4xl text-sm leading-8 text-[#D8CFBE]">
              It is useful for restaurants, cafes and cloud kitchens that need a lightweight Android POS app experience without depending only on a billing counter.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
