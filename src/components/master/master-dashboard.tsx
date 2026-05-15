const featureCards = [
  {
    title: "Restaurants",
    value: "Client Control",
    description: "Add, manage, activate, or suspend restaurant accounts.",
  },
  {
    title: "Plans",
    value: "Subscription",
    description: "Control demo, paid plans, expiry, and feature locks.",
  },
  {
    title: "Printer Health",
    value: "Monitoring",
    description: "Track kitchen and bill printer status for each client.",
  },
  {
    title: "Error Alerts",
    value: "Coming Next",
    description: "Central alerts for app, website, printer, and order failures.",
  },
];

export default function MasterDashboard() {
  return (
    <main className="min-h-screen bg-[#041421] px-4 py-6 text-white sm:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-[#86B9B0]">
            TrustFirstSolutions
          </p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">
            CafeLuxe Master Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Central control panel for restaurants, plans, printer health,
            alerts, sales, and future SaaS operations.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur"
            >
              <p className="text-sm text-[#86B9B0]">{card.title}</p>
              <h2 className="mt-3 text-2xl font-semibold">{card.value}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
