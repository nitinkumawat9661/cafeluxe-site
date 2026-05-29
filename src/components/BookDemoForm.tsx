"use client";

import { FormEvent, useState } from "react";

export default function BookDemoForm() {
  const [open, setOpen] = useState(false);
  const [requirement, setRequirement] = useState("QR Ordering + POS Demo");
  const [status, setStatus] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("Sending...");

    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    const business = String(data.get("business") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const city = String(data.get("city") || "").trim();
    const customRequirement = String(data.get("customRequirement") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!/^[A-Za-z ]{2,40}$/.test(name)) {
      setStatus("Name must contain only letters and spaces, 2-40 characters.");
      return;
    }

    if (business.length < 2 || business.length > 80) {
      setStatus("Business name must be 2-80 characters.");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setStatus("Phone number must be a valid 10 digit Indian mobile number.");
      return;
    }

    if (!/^[A-Za-z ]{2,40}$/.test(city)) {
      setStatus("City must contain only letters and spaces, 2-40 characters.");
      return;
    }

    if (requirement === "Custom Requirement" && (customRequirement.length < 5 || customRequirement.length > 160)) {
      setStatus("Custom requirement must be 5-160 characters.");
      return;
    }

    if (message.length > 300) {
      setStatus("Additional message cannot exceed 300 characters.");
      return;
    }

    const res = await fetch("/api/demo-inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        business,
        phone,
        city,
        requirement,
        customRequirement,
        message,
        consent: data.get("consent") === "yes",
      }),
    });

    if (!res.ok) {
      setStatus("Could not send inquiry. Please try again.");
      return;
    }

    setStatus("Inquiry sent successfully.");
    form.reset();
    setRequirement("QR Ordering + POS Demo");
    setTimeout(() => {
      setStatus("");
      setOpen(false);
    }, 900);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="group relative flex items-center gap-2 overflow-hidden rounded-l-xl border border-[#F0C978]/45 bg-[#D9B86A] px-4 py-3 text-[11px] font-black uppercase tracking-[.12em] text-black shadow-[0_12px_35px_rgba(217,184,106,.28)] transition hover:bg-[#F0C978] hover:pr-5"><span className="h-2 w-2 rounded-full bg-black/70"></span><span>Book Demo</span></button>

      {open && (
        <div className="fixed inset-0 z-[999] overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-xl items-center py-8">
            <form onSubmit={submit} className="w-full rounded-[2rem] border border-[#D9B86A]/30 bg-[#080604] p-6 text-[#F7EFE0] shadow-2xl">
              <div className="flex justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[.28em] text-[#D9B86A]">CafeLuxe demo</p><h2 className="mt-2 font-serif text-3xl text-[#E7D3A1]">Request a Demo</h2></div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[#D9B86A]/25 px-3 py-1 text-sm font-bold text-[#D8CFBE]">Close</button>
              </div>

              <div className="mt-6 grid gap-4">
                <input name="name" required minLength={2} maxLength={40} pattern="[A-Za-z ]+" placeholder="Your name" className="rounded-xl border border-[#D9B86A]/20 bg-black/40 px-4 py-3 outline-none" />
                <input name="business" required minLength={2} maxLength={80} placeholder="Restaurant / business name" className="rounded-xl border border-[#D9B86A]/20 bg-black/40 px-4 py-3 outline-none" />
                <input name="phone" required inputMode="numeric" minLength={10} maxLength={10} pattern="[6-9][0-9]{9}" placeholder="10 digit mobile number" className="rounded-xl border border-[#D9B86A]/20 bg-black/40 px-4 py-3 outline-none" />
                <input name="city" required minLength={2} maxLength={40} pattern="[A-Za-z ]+" placeholder="City" className="rounded-xl border border-[#D9B86A]/20 bg-black/40 px-4 py-3 outline-none" />
                <select value={requirement} onChange={(e) => setRequirement(e.target.value)} className="rounded-xl border border-[#D9B86A]/20 bg-black/40 px-4 py-3 outline-none">
                  <option>QR Ordering + POS Demo</option><option>Staff App Demo</option><option>Restaurant Website + QR System</option><option>Custom Requirement</option>
                </select>
                {requirement === "Custom Requirement" && <input name="customRequirement" required minLength={5} maxLength={160} placeholder="Enter custom requirement" className="rounded-xl border border-[#D9B86A]/20 bg-black/40 px-4 py-3 outline-none" />}
                <textarea name="message" rows={3} maxLength={300} placeholder="Additional message optional, max 300 characters" className="rounded-xl border border-[#D9B86A]/20 bg-black/40 px-4 py-3 outline-none" />
                <label className="flex gap-3 text-sm leading-6 text-[#D8CFBE]"><input name="consent" value="yes" type="checkbox" required className="mt-1 accent-[#D9B86A]" />I agree that CafeLuxe may contact me on WhatsApp/phone.</label>
              </div>

              {status && <p className="mt-4 text-sm text-[#D9B86A]">{status}</p>}
              <button type="submit" className="mt-6 w-full rounded-xl bg-[#D9B86A] px-6 py-4 font-black text-black">Submit Demo Request</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}