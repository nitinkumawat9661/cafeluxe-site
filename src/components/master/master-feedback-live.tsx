"use client";

import { useEffect, useState } from "react";

type FeedbackItem = {
  id: string;
  type: string;
  text: string;
  rating: number;
  tableNo?: string;
  source?: string;
  customerName?: string;
  title?: string;
  status: string;
  createdAt: string;
};

type FeedbackData = {
  feedback: FeedbackItem[];
  averageRating: number;
  total: number;
};

export default function MasterFeedbackLive({ clientId }: { clientId: string }) {
  const [data, setData] = useState<FeedbackData>({ feedback: [], averageRating: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/master/feedback?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { feedback: [], averageRating: 0, total: 0 }))
      .then((next) => setData({
        feedback: Array.isArray(next.feedback) ? next.feedback : [],
        averageRating: Number(next.averageRating || 0),
        total: Number(next.total || 0),
      }))
      .catch(() => setData({ feedback: [], averageRating: 0, total: 0 }))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="mt-5 text-sm text-white/60">Loading live feedback...</p>;

  if (data.feedback.length === 0) {
    return (
      <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-5">
        <p className="text-sm text-[#86B9B0]">No feedback yet</p>
        <h3 className="mt-2 text-xl font-semibold">Customer voice is clear</h3>
        <p className="mt-2 text-sm text-white/60">No feedback notifications found for this client yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
        <p className="text-sm text-white/55">Average Rating</p>
        <h3 className="mt-2 text-2xl font-semibold text-yellow-100">{data.averageRating.toFixed(1)} / 5</h3>
        <p className="mt-2 text-sm text-white/60">From {data.total} feedback item(s).</p>
      </article>

      {data.feedback.map((item) => (
        <article key={item.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#86B9B0]/15 px-3 py-1 text-sm font-semibold text-[#86B9B0]">
              {item.tableNo ? `Table ${item.tableNo}` : item.source || item.type}
            </span>
            <span className="rounded-full bg-yellow-400/15 px-3 py-1 text-sm text-yellow-100">★ {item.rating || 0}/5</span>
          </div>
          <h3 className="mt-3 text-base font-semibold">{item.text}</h3>
          {item.customerName ? <p className="mt-2 text-sm text-white/55">By {item.customerName}</p> : null}
          <span className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">{item.status}</span>
        </article>
      ))}
    </div>
  );
}