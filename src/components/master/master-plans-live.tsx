"use client";

import { useEffect, useState } from "react";

type PlanData = {
  plan: string;
  orderingStatus: string;
  paymentStatus: string;
  expiresAt: string;
};

export default function MasterPlansLive({ clientId }: { clientId: string }) {
  const [data, setData] = useState<PlanData>({
    plan: "Demo",
    orderingStatus: "Enabled",
    paymentStatus: "Pending",
    expiresAt: "Not set",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/master/plans?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((next) => {
        if (next) setData(next);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="mt-5 text-sm text-white/60">Loading live plan details...</p>;

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Current Plan</p>
        <h3 className="mt-2 text-2xl font-semibold text-yellow-100">{data.plan} Plan</h3>
        <p className="mt-2 text-sm text-white/60">Expires: {data.expiresAt}</p>
      </article>
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Ordering Status</p>
        <h3 className="mt-2 text-2xl font-semibold text-emerald-200">{data.orderingStatus}</h3>
        <p className="mt-2 text-sm text-white/60">QR ordering access from settings.</p>
      </article>
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Payment Status</p>
        <h3 className="mt-2 text-2xl font-semibold text-orange-100">{data.paymentStatus}</h3>
        <p className="mt-2 text-sm text-white/60">Subscription payment tracking.</p>
      </article>
    </div>
  );
}
