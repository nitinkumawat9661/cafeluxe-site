"use client";

import { useState } from "react";

export default function MasterOnboardingWizard() {
  const [clientId, setClientId] = useState("trustfirst_demo");
  const [logo, setLogo] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function readJsonSafe(response: Response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  async function uploadLogo() {
    if (!clientId.trim() || !logo) {
      setMessage("Client ID and logo are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const formData = new FormData();
    formData.append("logo", logo);

    const uploadRes = await fetch("/api/master/onboarding/logo", {
      method: "POST",
      body: formData,
    });

    const uploadData = await readJsonSafe(uploadRes) as { message?: string; logoUrl?: string };

    if (!uploadRes.ok) {
      setSaving(false);
      setMessage(uploadData.message || "Logo upload failed.");
      return;
    }

    const settingsRes = await fetch("/api/master/onboarding/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId.trim(), logoUrl: uploadData.logoUrl }),
    });

    const settingsData = await readJsonSafe(settingsRes) as { message?: string };
    setSaving(false);

    if (!settingsRes.ok) {
      setMessage(settingsData.message || "Logo setting save failed.");
      return;
    }

    setMessage("Logo uploaded and saved to Appwrite settings. Refresh QR section to see updated logo.");
  }

  return (
    <div className="mt-5 grid gap-3">
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
      <input className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
      <button onClick={uploadLogo} disabled={saving} className="rounded-2xl bg-[#86B9B0] px-4 py-3 text-sm font-semibold text-[#041421] disabled:opacity-50">
        {saving ? "Saving..." : "Upload Logo to Appwrite"}
      </button>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}

