"use client";

import { useState } from "react";

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export default function MasterOnboardingWizard() {
  const [restaurantName, setRestaurantName] = useState("");
  const [clientId, setClientId] = useState("trustfirst_demo");
  const [tableCount, setTableCount] = useState("5");
  const [plan, setPlan] = useState("Demo");
  const [logo, setLogo] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createRestaurant() {
    setSaving(true); setMessage("");
    const res = await fetch("/api/master/onboarding/restaurant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantName, clientId, tableCount: Number(tableCount), plan }),
    });
    const data = await readJsonSafe(res) as { message?: string; clientId?: string };
    setSaving(false);
    setMessage(res.ok ? `Restaurant created: ${data.clientId}` : data.message || "Restaurant creation failed.");
  }

  async function uploadLogo() {
    if (!clientId.trim() || !logo) return setMessage("Client ID and logo are required.");
    setSaving(true); setMessage("");
    const formData = new FormData();
    formData.append("logo", logo);
    const uploadRes = await fetch("/api/master/onboarding/logo", { method: "POST", body: formData });
    const uploadData = await readJsonSafe(uploadRes) as { message?: string; logoUrl?: string };
    if (!uploadRes.ok || !uploadData.logoUrl) {
      setSaving(false); return setMessage(uploadData.message || "Logo upload failed.");
    }
    const settingsRes = await fetch("/api/master/onboarding/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId.trim(), logoUrl: uploadData.logoUrl }),
    });
    const settingsData = await readJsonSafe(settingsRes) as { message?: string };
    setSaving(false);
    setMessage(settingsRes.ok ? "Logo uploaded and saved. Refresh QR section." : settingsData.message || "Logo setting save failed.");
  }

  return (
    <div className="mt-5 grid gap-3">
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Restaurant name" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} />
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Table count" value={tableCount} onChange={(e) => setTableCount(e.target.value)} />
      <select className="rounded-2xl border border-white/10 bg-[#06202b] px-4 py-3 text-sm outline-none" value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option>Demo</option><option>Paid</option><option>Trial</option>
      </select>
      <button onClick={createRestaurant} disabled={saving} className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold disabled:opacity-50">Create Restaurant in Appwrite</button>
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
      <button onClick={uploadLogo} disabled={saving} className="rounded-2xl bg-[#86B9B0] px-4 py-3 text-sm font-semibold text-[#041421] disabled:opacity-50">{saving ? "Saving..." : "Upload Logo to Appwrite"}</button>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
