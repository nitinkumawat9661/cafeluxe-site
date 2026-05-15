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
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <a href={restaurant.qrPath} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80">Open QR</a>
                  <details className="w-full min-w-72 lg:min-w-80">
                    <summary className="cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-sm">
                      Manage
                    </summary>
                    <div className="mt-3 w-full rounded-2xl border border-white/10 bg-[#06202b] p-4 shadow-2xl">
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
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]">Subscription Control</p>
          <h2 className="mt-2 text-2xl font-semibold">Plans & Feature Access</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Backend plan locking will be connected later.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Current Plan</p>
              <h3 className="mt-2 text-2xl font-semibold text-yellow-100">Demo Plan</h3>
              <p className="mt-2 text-sm text-white/60">Expires: Not set</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Ordering Status</p>
              <h3 className="mt-2 text-2xl font-semibold text-emerald-200">Enabled</h3>
              <p className="mt-2 text-sm text-white/60">QR ordering is currently allowed.</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Payment Status</p>
              <h3 className="mt-2 text-2xl font-semibold text-orange-100">Pending</h3>
              <p className="mt-2 text-sm text-white/60">Manual subscription tracking for now.</p>
            </article>
          </div>
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]">Error Monitoring</p>
          <h2 className="mt-2 text-2xl font-semibold">Alerts & System Health</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Live app, website, printer, and Appwrite alerts will be connected later.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-red-300/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-200">Critical</p>
              <h3 className="mt-2 text-xl font-semibold">Printer Offline</h3>
              <p className="mt-2 text-sm text-white/60">Source: Android / Kitchen Printer</p>
              <span className="mt-4 inline-flex rounded-full bg-red-400/15 px-3 py-1 text-sm text-red-100">Open</span>
            </article>

            <article className="rounded-3xl border border-yellow-300/20 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-100">Warning</p>
              <h3 className="mt-2 text-xl font-semibold">Order Sync Delay</h3>
              <p className="mt-2 text-sm text-white/60">Source: Website / Appwrite</p>
              <span className="mt-4 inline-flex rounded-full bg-yellow-400/15 px-3 py-1 text-sm text-yellow-100">Watching</span>
            </article>

            <article className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-100">Info</p>
              <h3 className="mt-2 text-xl font-semibold">System Healthy</h3>
              <p className="mt-2 text-sm text-white/60">Source: Master Dashboard</p>
              <span className="mt-4 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-100">Solved</span>
            </article>
          </div>
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]">Device Health</p>
          <h2 className="mt-2 text-2xl font-semibold">Printer & App Monitoring</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Live device heartbeat and printer status will be connected later.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <article className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-white/55">Kitchen Printer</p>
              <h3 className="mt-2 text-xl font-semibold text-emerald-100">Online</h3>
              <p className="mt-2 text-sm text-white/60">Last KOT: Recently printed</p>
            </article>

            <article className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-white/55">Bill Printer</p>
              <h3 className="mt-2 text-xl font-semibold text-emerald-100">Online</h3>
              <p className="mt-2 text-sm text-white/60">Last bill: Recently printed</p>
            </article>

            <article className="rounded-3xl border border-blue-300/20 bg-blue-500/10 p-4">
              <p className="text-sm text-white/55">Android Staff App</p>
              <h3 className="mt-2 text-xl font-semibold text-blue-100">Active</h3>
              <p className="mt-2 text-sm text-white/60">Last sync: Placeholder</p>
            </article>

            <article className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-white/55">Website Ordering</p>
              <h3 className="mt-2 text-xl font-semibold text-emerald-100">Enabled</h3>
              <p className="mt-2 text-sm text-white/60">QR ordering route healthy.</p>
            </article>
          </div>
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]">Sales Analytics</p>
          <h2 className="mt-2 text-2xl font-semibold">Business Overview</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Live sales, orders, and payment analytics will be connected later.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Today Sales</p>
              <h3 className="mt-2 text-2xl font-semibold text-emerald-100">₹0</h3>
              <p className="mt-2 text-sm text-white/60">Live total later.</p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Today Orders</p>
              <h3 className="mt-2 text-2xl font-semibold">0</h3>
              <p className="mt-2 text-sm text-white/60">Order count later.</p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Most Sold Item</p>
              <h3 className="mt-2 text-2xl font-semibold text-yellow-100">Bundi Raita</h3>
              <p className="mt-2 text-sm text-white/60">From popular items logic later.</p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Payments</p>
              <h3 className="mt-2 text-2xl font-semibold text-blue-100">Cash / UPI</h3>
              <p className="mt-2 text-sm text-white/60">Breakdown later.</p>
            </article>
          </div>
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]">Staff Control</p>
          <h2 className="mt-2 text-2xl font-semibold">Roles & Permissions</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Staff accounts and permission locking will be connected later.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            {[
              { role: "Owner", status: "Active", permissions: "Full Access" },
              { role: "Manager", status: "Active", permissions: "Menu, Records, Payments" },
              { role: "Cashier", status: "Pending", permissions: "Billing, Payments" },
              { role: "Kitchen", status: "Pending", permissions: "KOT, Order Status" },
            ].map((staff) => (
              <article key={staff.role} className="rounded-3xl border border-white/10 bg-black/10 p-4">
                <p className="text-sm text-white/55">Role</p>
                <h3 className="mt-2 text-xl font-semibold">{staff.role}</h3>
                <span className="mt-3 inline-flex rounded-full bg-[#86B9B0]/15 px-3 py-1 text-sm text-[#D0D6D6]">
                  {staff.status}
                </span>
                <p className="mt-3 text-sm text-white/60">{staff.permissions}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}









