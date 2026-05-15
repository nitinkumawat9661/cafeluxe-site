const restaurants = [
  {
    name: "Nanu Da Dhaba",
    clientId: "trustfirst_demo",
    plan: "Demo",
    status: "Active",
    tables: 12,
    qrPath: "/c/trustfirst_demo/t/06",
  },
];

export default function MasterDashboard() {
  return (
    <main className="min-h-screen bg-[#041421] px-4 py-6 text-white sm:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-[#86B9B0]">TrustFirstSolutions</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">CafeLuxe Master Dashboard</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Central control panel for restaurants, plans, printer health, alerts, sales, and SaaS operations.
          </p>
        </div>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]">Client Management</p>
              <h2 className="mt-2 text-2xl font-semibold">Restaurants</h2>
              <p className="mt-2 text-sm text-white/60">Static foundation. Backend connection will be added next.</p>
            </div>
            <button className="rounded-2xl bg-[#86B9B0] px-5 py-3 text-sm font-semibold text-[#041421]">
              Add Restaurant
            </button>
          </div>

          <div className="mt-5 overflow-visible rounded-3xl border border-white/10">
            {restaurants.map((restaurant) => (
              <div key={restaurant.clientId} className="grid gap-4 border-b border-white/10 bg-black/10 p-4 last:border-b-0 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1fr] lg:items-center">
                <div>
                  <p className="font-semibold">{restaurant.name}</p>
                  <p className="text-sm text-white/55">Client ID: {restaurant.clientId}</p>
                </div>
                <p className="text-sm text-white/70">Tables: {restaurant.tables}</p>
                <span className="w-fit rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-200">{restaurant.status}</span>
                <span className="w-fit rounded-full bg-yellow-400/15 px-3 py-1 text-sm text-yellow-100">{restaurant.plan}</span>
                <div className="flex gap-2">
                  <a href={restaurant.qrPath} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80">Open QR</a>
                  <details className="relative">
                    <summary className="cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-sm">
                      Manage
                    </summary>
                    <div className="absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-white/10 bg-[#06202b] p-4 shadow-2xl">
                      <p className="font-semibold">{restaurant.name}</p>
                      <p className="mt-1 text-xs text-white/55">Client ID: {restaurant.clientId}</p>
                      <div className="mt-4 space-y-2 text-sm text-white/75">
                        <p>Plan: {restaurant.plan}</p>
                        <p>Status: {restaurant.status}</p>
                        <p>Tables: {restaurant.tables}</p>
                        <p>QR Path: {restaurant.qrPath}</p>
                      </div>
                      <div className="mt-4 grid gap-2">
                        <a href={restaurant.qrPath} className="rounded-xl bg-[#86B9B0] px-3 py-2 text-center text-sm font-semibold text-[#041421]">
                          Open QR Page
                        </a>
                        <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70">
                          Edit Details Soon
                        </button>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}


