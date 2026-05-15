"use client";

import { useState } from "react";

export default function MasterLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/master/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("Invalid PIN. Try again.");
      return;
    }

    window.location.reload();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#041421] px-4 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-[#86B9B0]">Master Access</p>
        <h1 className="mt-4 text-3xl font-semibold">CafeLuxe Control</h1>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          type="password"
          placeholder="Enter master PIN"
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none"
        />
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button
          onClick={submitLogin}
          disabled={loading || pin.trim().length === 0}
          className="mt-5 w-full rounded-2xl bg-[#86B9B0] px-4 py-3 font-semibold text-[#041421] disabled:opacity-50"
        >
          {loading ? "Checking..." : "Unlock Dashboard"}
        </button>
      </section>
    </main>
  );
}
