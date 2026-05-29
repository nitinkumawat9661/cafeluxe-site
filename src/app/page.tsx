import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import TypewriterHeading from "@/components/TypewriterHeading";

const features = ["QR Table Ordering", "Live Digital Menu", "KOT Billing", "Staff App", "Records", "Data Security"];

const faqs = [
  ["What is CafeLuxe?", "CafeLuxe is restaurant software for QR ordering, digital menu, POS workflow, KOT billing, staff app and business records."],
  ["Who can use CafeLuxe?", "CafeLuxe is built for cafes, restaurants, cloud kitchens, food courts and food businesses that need faster ordering and billing."],
  ["Does CafeLuxe support QR table ordering?", "Yes. Customers can scan a table QR, open the digital menu and place orders from their phone."],
  ["Does CafeLuxe include KOT billing?", "Yes. CafeLuxe supports kitchen order ticket workflows for clearer staff and kitchen coordination."],
  ["How can I request a demo?", "You can use the Book Demo button on the website and submit your restaurant details."]
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030201] text-[#F7EFE0]">
      <section className="relative min-h-screen overflow-hidden px-5 py-5 sm:px-8 lg:px-[5vw]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(217,184,106,.30),transparent_27%),linear-gradient(115deg,#030201,#080604_48%,#171007)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/70 to-transparent" />

        <div className="relative mx-auto max-w-[1660px]">
          <SiteNav />

          <div className="grid items-center gap-8 pt-6 lg:min-h-[440px] lg:grid-cols-[.42fr_.58fr]">
            <div className="relative z-20">
              <TypewriterHeading />
              <p className="mt-5 max-w-xl text-base leading-7 text-[#D8CFBE]">
                CafeLuxe is an all-in-one platform for QR ordering, POS, KOT billing and staff operations.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/features" className="rounded-xl bg-[#D9B86A] px-7 py-4 font-black text-black">Explore Features</Link>
                <Link href="/app" className="rounded-xl border border-[#D9B86A]/45 px-7 py-4 font-black text-[#E7D3A1]">Download App</Link>
              </div>
            </div>

            <div className="relative z-10 min-h-[455px] overflow-visible">
              <div className="absolute right-[10%] top-[10%] h-80 w-80 rounded-full bg-[#D9B86A]/20 blur-3xl" />
              <img src="/luxury/hero-product-scene-hd.png?v=22" alt="CafeLuxe premium POS, QR stand and lamp product scene" className="pointer-events-none absolute left-[-7%] top-[48%] z-10 w-[116%] max-w-none -translate-y-1/2 object-contain drop-shadow-[0_60px_145px_rgba(0,0,0,.98)]" />
            </div>
          </div>

          <div className="relative z-40 mt-8 rounded-[1.8rem] border border-[#D9B86A]/22 bg-black/82 p-4 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,.65)]">
            <p className="text-center font-serif text-xl text-[#D9B86A]">Everything You Need. In Perfect Harmony.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {features.map((item) => <div key={item} className="rounded-2xl border border-[#D9B86A]/20 bg-[#080604]/90 p-4 text-center font-serif text-base text-[#E7D3A1]">{item}</div>)}
            </div>
          </div>

          <section className="relative z-30 mt-8 grid gap-8 rounded-[2.4rem] border border-[#D9B86A]/22 bg-black/72 p-6 backdrop-blur-xl lg:grid-cols-[.55fr_.45fr] lg:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Official Android APK</p>
              <h2 className="mt-4 max-w-3xl font-serif text-[clamp(2.4rem,3.4vw,4.2rem)] italic leading-[.98] tracking-[-0.04em]">
                Download CafeLuxe Staff App for Live Restaurant Operations.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#D8CFBE]">
                Built for staff-side order handling, KOT billing, table workflows, payments and daily restaurant control.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <a href="/downloads/cafeluxe-staff-app-latest.apk" download className="rounded-xl bg-[#D9B86A] px-7 py-4 font-black text-black">
                  Download Latest APK
                </a>
                <Link href="/app" className="rounded-xl border border-[#D9B86A]/45 px-7 py-4 font-black text-[#E7D3A1]">
                  Install Guide
                </Link>
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#D9B86A]/18 bg-[#090604]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_40%,rgba(217,184,106,.18),transparent_42%)]" />
              <img src="/luxury/apk-phone-mockup.png?v=1" alt="CafeLuxe staff app phone mockup" className="absolute left-1/2 top-1/2 w-[72%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_40px_95px_rgba(0,0,0,.95)]" />
            </div>
          </section>
          <section className="relative z-30 mt-8 rounded-[2.4rem] border border-[#D9B86A]/22 bg-black/72 p-6 backdrop-blur-xl lg:p-8">
            <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">FAQ</p>
            <h2 className="mt-3 font-serif text-4xl italic text-[#E7D3A1]">Common Questions</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {faqs.map(([q, a]) => (
                <article key={q} className="rounded-2xl border border-[#D9B86A]/18 bg-[#080604]/80 p-5">
                  <h3 className="font-serif text-xl text-[#E7D3A1]">{q}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#D8CFBE]">{a}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}