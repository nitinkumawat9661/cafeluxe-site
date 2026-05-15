"use client";

import { useEffect, useState } from "react";

type HealthItem = {
  status: string;
  detail: string;
};

type HealthData = {
  websiteOrdering: HealthItem;
  printer: HealthItem;
  app: HealthItem;
};

function tone(status?: string) {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("active") || value.includes("enabled")) {
    return "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";
  }
  if (value.includes("warning")) {
    return "border-yellow-300/20 bg-yellow-500/10 text-yellow-100";
  }
  return "border-white/10 bg-black/10 text-white";
}

export default function MasterHealthLive({ clientId }: { clientId: string }) {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    fetch(`/api/master/health?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [clientId]);

  const cards = [
    ["Printer System", data?.printer],
    ["Android Staff App", data?.app],
    ["Website Ordering", data?.websiteOrdering],
  ] as const;

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {cards.map(([label, item]) => (
        <article key={label} className={`rounded-3xl border p-4 ${tone(item?.status)}`}>
          <p className="text-sm text-white/55">{label}</p>
          <h3 className="mt-2 text-xl font-semibold">{item?.status ?? "Checking..."}</h3>
          <p className="mt-2 text-sm text-white/60">{item?.detail ?? "Loading live status..."}</p>
        </article>
      ))}
    </div>
  );
}
