"use client";

import { useEffect, useState } from "react";
import { appwriteConfig, fetchAllDocuments, Query } from "@/lib/appwrite";
import { formatInr, parseMenuItems, type MenuItem } from "@/lib/menu";

export default function MasterMenuLive({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [message, setMessage] = useState("Loading menu...");

  useEffect(() => {
    let alive = true;

    fetchAllDocuments(appwriteConfig.collections.menuItems, {
      pageSize: 100,
      maxDocs: 300,
      queries: [Query.equal("client_id", [clientId])],
    })
      .then((docs) => {
        if (!alive) return;
        setItems(parseMenuItems(docs, clientId).sort((a, b) => a.name.localeCompare(b.name)));
        setMessage("");
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : "Unable to load menu.");
      });

    return () => {
      alive = false;
    };
  }, [clientId]);

  return (
    <div className="mt-5 grid gap-3">
      {message ? <p className="text-sm text-white/60">{message}</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/10 p-4">
            {item.image ? <img src={item.image} alt={item.name} className="mb-3 h-36 w-full rounded-2xl object-cover" /> : null}
            <h3 className="font-semibold">{item.name}</h3>
            <p className="mt-2 text-sm font-semibold text-[#86B9B0]">{formatInr(item.price)}</p>
          </article>
        ))}
      </div>
      {!message && items.length === 0 ? <p className="text-sm text-white/60">No menu items found for this client.</p> : null}
    </div>
  );
}