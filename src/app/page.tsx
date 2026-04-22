import Link from "next/link";

export default function Home() {
  const royalNavy = "#0C1F37";
  const luxuryGold = "#C6A05C";
  const warmHighlight = "#E7C98A";
  const deepCharcoal = "#1C1C1C";

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 py-10 text-zinc-100"
      style={{ background: `linear-gradient(180deg, ${royalNavy} 0%, #0A1730 36%, ${deepCharcoal} 100%)` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(231,201,138,0.08)_0%,rgba(255,255,255,0)_36%,rgba(12,31,55,0.24)_100%)]" />
      <main
        className="relative mx-auto w-full max-w-md rounded-3xl border p-6 shadow-[0_30px_84px_-44px_rgba(0,0,0,0.98)] backdrop-blur"
        style={{
          borderColor: "rgba(231,201,138,0.3)",
          background: "linear-gradient(165deg, rgba(17,24,39,0.92) 0%, rgba(28,28,28,0.95) 100%)",
        }}
      >
        <p className="text-xs uppercase tracking-[0.24em]" style={{ color: warmHighlight }}>
          Cafe Luxe
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[0.02em]" style={{ color: warmHighlight }}>
          Premium Table Ordering
        </h1>
        <p className="mt-2 text-sm text-zinc-300">
          Route format: <span className="font-mono text-zinc-100">/c/[client]/t/[table]</span>
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Link
            href="/c/trustfirst_demo/t/T01"
            className="inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold text-zinc-950 transition active:translate-y-px"
            style={{
              borderColor: "rgba(231,201,138,0.42)",
              background: `linear-gradient(180deg, ${warmHighlight} 0%, ${luxuryGold} 100%)`,
            }}
          >
            Open Table T01
          </Link>
          <Link
            href="/c/trustfirst_demo/t/T02"
            className="inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold text-zinc-100 transition active:translate-y-px"
            style={{
              borderColor: "rgba(231,201,138,0.28)",
              background: "linear-gradient(160deg, rgba(17,24,39,0.86) 0%, rgba(28,28,28,0.92) 100%)",
            }}
          >
            Open Table T02
          </Link>
        </div>
      </main>
    </div>
  );
}
