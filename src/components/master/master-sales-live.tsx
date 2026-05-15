"use client";

import { useEffect, useState } from "react";

type SalesData = {
  todaySales: number;
  todayOrders: number;
  mostSoldItem: { name: string; qty: number } | null;
  paymentBreakdown: Record<string, number>;
};

export default function MasterSalesLive({ clientId }: { clientId: string }) {
  const [data, setData] = useState<SalesData | null>(null);

  useEffect(() => {
    fetch(`/api/master/sales?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [clientId]);

  const payments = data?.paymentBreakdown ?? {};

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Today Sales</p>
        <h3 className="mt-2 text-2xl font-semibold text-emerald-100">₹{(data?.todaySales ?? 0).toFixed(2)}</h3>
      </article>
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Today Orders</p>
        <h3 className="mt-2 text-2xl font-semibold">{data?.todayOrders ?? 0}</h3>
      </article>
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Most Sold Item</p>
        <h3 className="mt-2 text-xl font-semibold text-yellow-100">{data?.mostSoldItem?.name ?? "No sales"}</h3>
        <p className="mt-2 text-sm text-white/60">Qty: {data?.mostSoldItem?.qty ?? 0}</p>
      </article>
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Payments</p>
        <h3 className="mt-2 text-sm font-semibold text-blue-100">
          {Object.keys(payments).length ? Object.entries(payments).map(([k,v]) => `${k}: ${v}`).join(" / ") : "No payments"}
        </h3>
      </article>
    </div>
  );
}
