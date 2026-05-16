"use client";

import { useState } from "react";

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export default function MasterOnboardingWizard() {
  const [restaurantName, setRestaurantName] = useState("");
  const [clientId, setClientId] = useState("");
  const [tableCount, setTableCount] = useState("5");
  const [plan, setPlan] = useState("Demo");
  const [logo, setLogo] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function uploadLogoForClient(nextClientId: string) {
    if (!logo) return "Logo skipped.";
    const formData = new FormData();
    formData.append("logo", logo);

    const uploadRes = await fetch("/api/master/onboarding/logo", { method: "POST", body: formData });
    const uploadData = await readJsonSafe(uploadRes) as { message?: string; logoUrl?: string };
    if (!uploadRes.ok || !uploadData.logoUrl) throw new Error(uploadData.message || "Logo upload failed.");

    const settingsRes = await fetch("/api/master/onboarding/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: nextClientId, logoUrl: uploadData.logoUrl }),
    });
    const settingsData = await readJsonSafe(settingsRes) as { message?: string };
    if (!settingsRes.ok) throw new Error(settingsData.message || "Logo setting save failed.");
    return "Logo saved.";
  }

  async function createFullRestaurant() {
    setSaving(true);
    setMessage("Creating restaurant...");
    try {
      const res = await fetch("/api/master/onboarding/restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, clientId, tableCount: Number(tableCount), plan }),
      });

      const data = await readJsonSafe(res) as { message?: string; clientId?: string; tableCount?: number };
      if (!res.ok || !data.clientId) throw new Error(data.message || "Restaurant creation failed.");

      setMessage("Restaurant created. Saving logo...");
      const logoStatus = await uploadLogoForClient(data.clientId);
      setMessage(`Created ${data.clientId} with ${data.tableCount} tables. ${logoStatus} Refresh dashboard.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Onboarding failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 grid gap-3">
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Restaurant name" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} />
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Client ID, example: nanu_da_dhaba" value={clientId} onChange={(e) => setClientId(e.target.value)} />
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Table count" value={tableCount} onChange={(e) => setTableCount(e.target.value)} />
      <select className="rounded-2xl border border-white/10 bg-[#06202b] px-4 py-3 text-sm outline-none" value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option>Demo</option><option>Paid</option><option>Trial</option>
      </select>
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
      <button onClick={createFullRestaurant} disabled={saving} className="rounded-2xl bg-[#86B9B0] px-4 py-3 text-sm font-semibold text-[#041421] disabled:opacity-50">
        {saving ? "Working..." : "Create Restaurant + Save Logo"}
      </button>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
