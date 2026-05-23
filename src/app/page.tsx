import Link from "next/link";

const features = [
  "QR table ordering",
  "Digital menu",
  "KOT billing",
  "Staff Android app",
  "Admin order panel",
  "Restaurant records",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#041421] text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#86B9B0]">
          CafeLuxe Restaurant Software
        </p>

        <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
          QR Ordering, Restaurant POS, KOT Billing and Staff App in one system.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#D0D6D6]">
          CafeLuxe helps cafes, restaurants and cloud kitchens accept QR orders,
          manage menus, send KOTs, track payments and run staff operations from a clean digital platform.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app/" className="rounded-2xl bg-[#86B9B0] px-6 py-3 font-bold text-[#041421]">
            Download Staff App
          </Link>
          <Link href="/c/trustfirst_demo/t/01" className="rounded-2xl border border-white/20 px-6 py-3 font-bold">
            View Demo QR Menu
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map((item) => (
            <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
              <p className="text-lg font-bold">{item}</p>
              <p className="mt-2 text-sm text-[#D0D6D6]">
                Built for practical restaurant operations and fast customer ordering.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
