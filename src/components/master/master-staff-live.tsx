"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  role: string;
  name: string;
  status: string;
  permissions: string;
};

function title(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Staff";
}

export default function MasterStaffLive({ clientId }: { clientId: string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/master/staff?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { staff: [] }))
      .then((data) => setStaff(Array.isArray(data.staff) ? data.staff : []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="mt-5 text-sm text-white/60">Loading live staff...</p>;

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      {staff.map((item) => (
        <article key={item.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm text-white/55">Role</p>
          <h3 className="mt-2 text-xl font-semibold">{title(item.role)}</h3>
          <p className="mt-1 text-sm text-white/50">{item.name}</p>
          <span className="mt-3 inline-flex rounded-full bg-[#86B9B0]/15 px-3 py-1 text-sm text-[#D0D6D6]">
            {item.status}
          </span>
          <p className="mt-3 text-sm text-white/60">{item.permissions}</p>
        </article>
      ))}
    </div>
  );
}
