"use client";

import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  title: string;
  source: string;
  priority: string;
  status: string;
  createdAt: string;
};

export default function MasterSupportLive({ clientId }: { clientId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function loadTickets() {
    const res = await fetch(`/api/master/support?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" });
    const data = res.ok ? await res.json() : { tickets: [] };
    setTickets(Array.isArray(data.tickets) ? data.tickets : []);
  }

  useEffect(() => {
    loadTickets().catch(() => setTickets([])).finally(() => setLoading(false));
  }, [clientId]);

  async function updateTicket(ticket: Ticket) {
    const action = ticket.status === "Resolved" ? "reopen" : "resolve";
    setBusyId(ticket.id);
    setMessage("");

    try {
      const res = await fetch("/api/master/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, ticketId: ticket.id, action }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Failed to update ticket");

      await loadTickets();
      setMessage(action === "resolve" ? "Ticket marked as resolved." : "Ticket reopened.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update ticket");
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return <p className="mt-5 text-sm text-white/60">Loading live support tickets...</p>;
  }

  if (tickets.length === 0) {
    return (
      <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-5">
        <p className="text-sm text-[#86B9B0]">No open tickets</p>
        <h3 className="mt-2 text-xl font-semibold">Support desk is clear</h3>
        <p className="mt-2 text-sm text-white/60">No Appwrite notifications found for this client yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-4 lg:grid-cols-3">
        {tickets.map((ticket) => {
          const isResolved = ticket.status === "Resolved";
          return (
            <article key={ticket.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-[#86B9B0]">{ticket.source}</p>
              <h3 className="mt-2 text-lg font-semibold">{ticket.title}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-orange-400/15 px-3 py-1 text-sm text-orange-100">{ticket.priority}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">{ticket.status}</span>
              </div>
              <button
                onClick={() => updateTicket(ticket)}
                disabled={busyId === ticket.id}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                {busyId === ticket.id ? "Updating..." : isResolved ? "Reopen Ticket" : "Resolve Ticket"}
              </button>
            </article>
          );
        })}
      </div>

      {message ? <p className="text-sm text-white/65">{message}</p> : null}
    </div>
  );
}
