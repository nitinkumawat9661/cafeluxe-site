"use client";

import { useEffect, useState } from "react";

type AlertItem = {
  level: string;
  title: string;
  source: string;
  status: string;
};

function tone(level: string) {
  const value = level.toLowerCase();
  if (value.includes("critical")) return "border-red-300/20 bg-red-500/10 text-red-100";
  if (value.includes("warning")) return "border-yellow-300/20 bg-yellow-500/10 text-yellow-100";
  return "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";
}

export default function MasterAlertsLive({ clientId }: { clientId: string }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/master/alerts?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { alerts: [] }))
      .then((data) => setAlerts(Array.isArray(data.alerts) ? data.alerts : []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="mt-5 text-sm text-white/60">Loading live alerts...</p>;

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {alerts.map((alert) => (
        <article key={`${alert.level}-${alert.title}`} className={`rounded-3xl border p-4 ${tone(alert.level)}`}>
          <p className="text-sm">{alert.level}</p>
          <h3 className="mt-2 text-xl font-semibold">{alert.title}</h3>
          <p className="mt-2 text-sm text-white/60">Source: {alert.source}</p>
          <span className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">{alert.status}</span>
        </article>
      ))}
    </div>
  );
}
