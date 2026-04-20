import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#0f172a_45%,_#020617_100%)] px-4 py-8 text-zinc-100">
      <main className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/75 p-6 shadow-[0_24px_70px_-30px_rgba(16,185,129,0.55)]">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">CafeLuxe QR</p>
        <h1 className="mt-2 text-2xl font-semibold">QR Ordering Live</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Live route format: <span className="font-mono text-zinc-100">/c/[client]/t/[table]</span>
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Link
            href="/c/trustfirst_demo/t/T01"
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            Open Table T01
          </Link>
          <Link
            href="/c/trustfirst_demo/t/T02"
            className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
          >
            Open Table T02
          </Link>
        </div>
      </main>
    </div>
  );
}
