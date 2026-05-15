import MasterHealthLive from "@/components/master/master-health-live";
import MasterSalesLive from "@/components/master/master-sales-live";
import BrandedQrCard from "@/components/master/branded-qr-card";

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

        <nav className="sticky top-3 z-30 mt-4 rounded-3xl border border-white/10 bg-[#041421]/90 p-3 shadow-2xl backdrop-blur">
          <div className="flex gap-2 overflow-x-auto">
            {[
              ["Restaurants", "#restaurants"],
              ["Plans", "#plans"],
              ["Alerts", "#alerts"],
              ["Health", "#health"],
              ["Sales", "#sales"],
              ["Staff", "#staff"],
              ["Feedback", "#feedback"],
              ["QR", "#qr"],
              ["Support", "#support"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm text-white/75 hover:bg-[#86B9B0] hover:text-[#041421]">
                {label}
              </a>
            ))}
          </div>
        </nav>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="restaurants" className="scroll-mt-28" />Client Management</p>
              <h2 className="mt-2 text-2xl font-semibold">Restaurants</h2>
              <p className="mt-2 text-sm text-white/60">Static foundation. Backend connection will be added next.</p>
            </div>
            <details className="w-full sm:w-auto">
              <summary className="cursor-pointer rounded-2xl bg-[#86B9B0] px-5 py-3 text-center text-sm font-semibold text-[#041421]">
                Add Restaurant
              </summary>
              <div className="mt-4 rounded-3xl border border-white/10 bg-[#06202b] p-5 shadow-2xl sm:w-[520px]">
                <h3 className="text-xl font-semibold">Restaurant Setup Wizard</h3>
                <p className="mt-2 text-sm text-white/60">Static setup form. Backend creation will be connected later.</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Restaurant name" />
                  <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Client ID" />
                  <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Table count" />
                  <select className="rounded-2xl border border-white/10 bg-[#06202b] px-4 py-3 text-sm outline-none">
                    <option>Demo Plan</option>
                    <option>Paid Plan</option>
                    <option>Trial Plan</option>
                  </select>
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/60">
                  Logo upload + branded QR generation placeholder
                </div>
              </div>
            </details>
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
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="plans" className="scroll-mt-28" />Subscription Control</p>
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
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="alerts" className="scroll-mt-28" />Error Monitoring</p>
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
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="health" className="scroll-mt-28" />Device Health</p>
          <h2 className="mt-2 text-2xl font-semibold">Printer & App Monitoring</h2>
          <p className="mt-2 text-sm text-white/60">Live status from Appwrite orders and print jobs.</p>

          <MasterHealthLive clientId="trustfirst_demo" />
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="sales" className="scroll-mt-28" />Sales Analytics</p>
          <h2 className="mt-2 text-2xl font-semibold">Business Overview</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Live sales, orders, and payment analytics will be connected later.</p>

          <MasterSalesLive clientId="trustfirst_demo" />
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="staff" className="scroll-mt-28" />Staff Control</p>
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
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="feedback" className="scroll-mt-28" />Customer Voice</p>
          <h2 className="mt-2 text-2xl font-semibold">Feedback & Ratings</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Live customer feedback and rating moderation will be connected later.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-white/55">Average Rating</p>
              <h3 className="mt-2 text-2xl font-semibold text-yellow-100">4.8 / 5</h3>
              <p className="mt-2 text-sm text-white/60">From QR feedback later.</p>
            </article>

            {[
              { type: "Praise", text: "Food quality was excellent.", status: "Reviewed" },
              { type: "Suggestion", text: "Add more combo options.", status: "New" },
              { type: "Complaint", text: "Service was delayed.", status: "Open" },
            ].map((item) => (
              <article key={item.type} className="rounded-3xl border border-white/10 bg-black/10 p-4">
                <p className="text-sm text-[#86B9B0]">{item.type}</p>
                <h3 className="mt-2 text-base font-semibold">{item.text}</h3>
                <span className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
                  {item.status}
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="qr" className="scroll-mt-28" />QR Management</p>
              <h2 className="mt-2 text-2xl font-semibold">Branded Table QR Codes</h2>
              <p className="mt-2 text-sm text-white/60">Static foundation. Logo-based QR preview and download will be connected next.</p>
            </div>
            <button className="rounded-2xl bg-[#86B9B0] px-5 py-3 text-sm font-semibold text-[#041421]">
              Bulk Download Soon
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            {["01", "02", "03", "06"].map((tableNo) => {
              const qrPath = `/c/trustfirst_demo/t/${tableNo}`;
              return (
                <BrandedQrCard
                  key={tableNo}
                  restaurantName="Nanu Da Dhaba"
                  tableNo={tableNo}
                  qrPath={qrPath}
                />
              );
            })}
          </div>
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="support" className="scroll-mt-28" />Support Desk</p>
          <h2 className="mt-2 text-2xl font-semibold">Client Tickets</h2>
          <p className="mt-2 text-sm text-white/60">Static foundation. Live issue tickets and support notes will be connected later.</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { title: "Printer not connecting", source: "Android App / Printer", priority: "High", status: "Open" },
              { title: "QR page slow loading", source: "Website", priority: "Medium", status: "In Progress" },
              { title: "Menu price update request", source: "Restaurant", priority: "Low", status: "Solved" },
            ].map((ticket) => (
              <article key={ticket.title} className="rounded-3xl border border-white/10 bg-black/10 p-4">
                <p className="text-sm text-[#86B9B0]">{ticket.source}</p>
                <h3 className="mt-2 text-lg font-semibold">{ticket.title}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-orange-400/15 px-3 py-1 text-sm text-orange-100">{ticket.priority}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">{ticket.status}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}


















