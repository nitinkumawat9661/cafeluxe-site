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

  useEffect(() => {
    fetch(`/api/master/support?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { tickets: [] }))
      .then((data) => setTickets(Array.isArray(data.tickets) ? data.tickets : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [clientId]);

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
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {tickets.map((ticket) => (
        <article key={ticket.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm text-[#86B9B0]">{ticket.source}</p>
          <h3 className="mt-2 text-lg font-semibold">{ticket.title}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-400/15 px-3 py-1 text-sm text-orange-100">{ticket.priority}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">{ticket.status}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
