import MasterHealthLive from "@/components/master/master-health-live";
import MasterAlertsLive from "@/components/master/master-alerts-live";
import MasterPlansLive from "@/components/master/master-plans-live";
import MasterStaffLive from "@/components/master/master-staff-live";
import MasterRestaurantsLive from "@/components/master/master-restaurants-live";
import MasterOnboardingWizard from "@/components/master/master-onboarding-wizard";
import MasterSalesLive from "@/components/master/master-sales-live";
import MasterQrLive from "@/components/master/master-qr-live";
import MasterSupportLive from "@/components/master/master-support-live";
import MasterFeedbackLive from "@/components/master/master-feedback-live";


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
                <p className="mt-2 text-sm text-white/60">Upload a restaurant logo and save it directly into Appwrite settings.</p>

                <MasterOnboardingWizard />
              </div>
            </details>
          </div>

          <MasterRestaurantsLive />
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="plans" className="scroll-mt-28" />Subscription Control</p>
          <h2 className="mt-2 text-2xl font-semibold">Plans & Feature Access</h2>
          <p className="mt-2 text-sm text-white/60">Live plan, ordering, and payment status from Appwrite settings.</p>

          <MasterPlansLive clientId="trustfirst_demo" />
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="alerts" className="scroll-mt-28" />Error Monitoring</p>
          <h2 className="mt-2 text-2xl font-semibold">Alerts & System Health</h2>
          <p className="mt-2 text-sm text-white/60">Live alerts from Appwrite orders, print jobs, and notifications.</p>

          <MasterAlertsLive clientId="trustfirst_demo" />
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
          <p className="mt-2 text-sm text-white/60">Live staff roles from Appwrite users. Waiter is shown as a placeholder until added.</p>

          <MasterStaffLive clientId="trustfirst_demo" />
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="feedback" className="scroll-mt-28" />Customer Voice</p>
          <h2 className="mt-2 text-2xl font-semibold">Feedback & Ratings</h2>
          <p className="mt-2 text-sm text-white/60">Live customer feedback from Appwrite notifications.</p>

          <MasterFeedbackLive clientId="trustfirst_demo" />
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="qr" className="scroll-mt-28" />QR Management</p>
              <h2 className="mt-2 text-2xl font-semibold">Branded Table QR Codes</h2>
              <p className="mt-2 text-sm text-white/60">Live branded QR preview, single PNG download, and bulk PNG download from Appwrite table data.</p>
            </div>
          </div>

          <MasterQrLive clientId="trustfirst_demo" />
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.25em] text-[#86B9B0]"><span id="support" className="scroll-mt-28" />Support Desk</p>
          <h2 className="mt-2 text-2xl font-semibold">Client Tickets</h2>
          <p className="mt-2 text-sm text-white/60">Live support tickets from Appwrite notifications.</p>

          <MasterSupportLive clientId="trustfirst_demo" />
        </section>
      </section>
    </main>
  );
}
