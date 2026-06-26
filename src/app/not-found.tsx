import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#030201] px-5 py-10 text-[#F7EFE0] sm:px-8 lg:px-[5vw]">
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">404</p>
        <h1 className="mt-5 font-serif text-[clamp(3rem,6vw,5.5rem)] italic leading-none text-[#E7D3A1]">
          Page Not Found
        </h1>
        <p className="mt-5 max-w-xl text-base leading-8 text-[#D8CFBE]">
          The CafeLuxe page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/" className="rounded-xl bg-[#D9B86A] px-7 py-4 font-black text-black">
            Go Home
          </Link>
          <Link href="/contact" className="rounded-xl border border-[#D9B86A]/45 px-7 py-4 font-black text-[#E7D3A1]">
            Request Demo
          </Link>
        </div>
      </section>
    </main>
  );
}
