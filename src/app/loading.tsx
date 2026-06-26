export default function Loading() {
  return (
    <main className="min-h-screen bg-[#030201] px-5 py-10 text-[#F7EFE0] sm:px-8 lg:px-[5vw]">
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
        <div className="h-16 w-16 animate-pulse rounded-full border border-[#D9B86A]/35 bg-[#D9B86A]/10" />
        <p className="mt-6 text-xs font-black uppercase tracking-[.34em] text-[#D9B86A]">Loading CafeLuxe</p>
        <div className="mt-6 h-4 w-72 max-w-full animate-pulse rounded-full bg-[#D9B86A]/20" />
        <div className="mt-3 h-4 w-56 max-w-full animate-pulse rounded-full bg-[#D9B86A]/10" />
      </section>
    </main>
  );
}
