"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#030201] px-5 py-10 text-[#F7EFE0] sm:px-8 lg:px-[5vw]">
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
        <p className="text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">CafeLuxe</p>
        <h1 className="mt-5 font-serif text-[clamp(2.8rem,6vw,5rem)] italic leading-none text-[#E7D3A1]">
          Something went wrong
        </h1>
        <p className="mt-5 max-w-xl text-base leading-8 text-[#D8CFBE]">
          The page could not load properly. You can retry or return to the homepage.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button type="button" onClick={reset} className="rounded-xl bg-[#D9B86A] px-7 py-4 font-black text-black">
            Try Again
          </button>
          <Link href="/" className="rounded-xl border border-[#D9B86A]/45 px-7 py-4 font-black text-[#E7D3A1]">
            Go Home
          </Link>
        </div>
      </section>
    </main>
  );
}
