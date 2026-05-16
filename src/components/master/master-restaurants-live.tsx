"use client";

import { useEffect, useState } from "react";

type Restaurant = {
  name: string;
  clientId: string;
  plan: string;
  status: string;
  tables: number;
  qrPath: string;
};

const fallbackRestaurants: Restaurant[] = [
  {
    name: "Nanu Da Dhaba",
    clientId: "trustfirst_demo",
    plan: "Demo",
    status: "Active",
    tables: 12,
    qrPath: "/c/trustfirst_demo/t/06",
  },
];

export default function MasterRestaurantsLive() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(fallbackRestaurants);

  useEffect(() => {
    fetch("/api/master/restaurants", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.restaurants) && data.restaurants.length > 0) {
          setRestaurants(data.restaurants);
        }
      })
      .catch(() => setRestaurants(fallbackRestaurants));
  }, []);

  return (
    <div className="mt-5 overflow-visible rounded-3xl border border-white/10">
      {restaurants.map((restaurant) => (
        <div key={restaurant.clientId} className="grid gap-4 border-b border-white/10 bg-black/10 p-4 last:border-b-0 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1fr] lg:items-center">
          <div>
            <p className="font-semibold">{restaurant.name}</p>
            <p className="text-sm text-white/55">Client ID: {restaurant.clientId}</p>
          </div>
          <p className="text-sm text-white/70">Tables: {restaurant.tables}</p>
          <span className="w-fit rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-200">{restaurant.status}</span>
          <span className="w-fit rounded-full bg-yellow-400/15 px-3 py-1 text-sm text-yellow-100">{restaurant.plan}</span>
          <a href={restaurant.qrPath} className="rounded-xl border border-white/10 px-3 py-2 text-center text-sm text-white/80">Open QR</a>
        </div>
      ))}
    </div>
  );
}
