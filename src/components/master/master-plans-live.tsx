"use client";

import { useEffect, useState } from "react";

type PlanData = {
  plan: string;
  orderingStatus: string;
  paymentStatus: string;
  expiresAt: string;
};

const defaultData: PlanData = {
  plan: "Demo",
  orderingStatus: "Enabled",
  paymentStatus: "Pending",
  expiresAt: "Not set",
};

export default function MasterPlansLive({ clientId }: { clientId: string }) {
  const [data, setData] = useState<PlanData>(defaultData);
  const [form, setForm] = useState<PlanData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPlans() {
    const res = await fetch(`/api/master/plans?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load plan details");
    const next = await res.json();
    setData(next);
    setForm(next);
  }

  useEffect(() => {
    loadPlans().catch(() => {}).finally(() => setLoading(false));
  }, [clientId]);

  async function savePlans() {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/master/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, ...form }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Failed to save plan settings");

      await loadPlans();
      setMessage("Plan settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save plan settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="mt-5 text-sm text-white/60">Loading live plan details...</p>;

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
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

      <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-xl backdrop-blur">
        <div className="mb-4 flex flex-col gap-1">
          <h4 className="text-base font-semibold text-white">Update Plan Controls</h4>
          <p className="text-sm text-white/55">Change subscription, ordering access, payment status, and expiry date.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Plan</span>
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#041421] px-3 py-3 text-sm text-white outline-none focus:border-[#86B9B0]">
          <option>Demo</option>
          <option>Basic</option>
          <option>Pro</option>
          <option>Premium</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Ordering</span>
            <select value={form.orderingStatus} onChange={(e) => setForm({ ...form, orderingStatus: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#041421] px-3 py-3 text-sm text-white outline-none focus:border-[#86B9B0]">
          <option>Enabled</option>
          <option>Disabled</option>
          <option>Paused</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Payment</span>
            <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#041421] px-3 py-3 text-sm text-white outline-none focus:border-[#86B9B0]">
          <option>Pending</option>
          <option>Paid</option>
          <option>Overdue</option>
          <option>Trial</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Expiry</span>
            <input value={form.expiresAt === "Not set" ? "" : form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value || "Not set" })} type="date" className="w-full rounded-2xl border border-white/10 bg-[#041421] px-3 py-3 text-sm text-white outline-none focus:border-[#86B9B0]" />
          </label>

          <button onClick={savePlans} disabled={saving} className="mt-6 rounded-2xl bg-[#86B9B0] px-4 py-3 text-sm font-semibold text-[#041421] shadow-lg transition hover:scale-[1.01] disabled:opacity-60">
          {saving ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-white/65">{message}</p> : null}
    </div>
  );
}
