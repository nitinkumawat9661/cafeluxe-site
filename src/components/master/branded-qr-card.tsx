"use client";

import { useEffect, useState } from "react";
import { buildBrandedQrDataUrl } from "@/lib/qr-branding";

type Props = {
  restaurantName: string;
  tableNo: string;
  qrPath: string;
  logoUrl?: string;
};

export default function BrandedQrCard({ restaurantName, tableNo, qrPath, logoUrl = "" }: Props) {
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    buildBrandedQrDataUrl(qrPath, logoUrl)
      .then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrSrc("");
      });

    return () => {
      cancelled = true;
    };
  }, [qrPath, logoUrl]);

  function downloadQr() {
    if (!qrSrc) return;
    const link = document.createElement("a");
    link.href = qrSrc;
    link.download = `cafeluxe-table-${tableNo}-qr.png`;
    link.click();
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-black/10 p-4">
      <div className="rounded-2xl bg-white p-4 text-center text-[#041421]">
        <p className="text-sm font-bold">{restaurantName}</p>
        <p className="text-xs">Table {tableNo}</p>
        {qrSrc ? <img src={qrSrc} alt={`Table ${tableNo} QR`} className="mx-auto mt-3 h-44 w-44" /> : null}
      </div>

      <p className="mt-3 break-all text-xs text-white/55">{qrPath}</p>
      <button onClick={downloadQr} className="mt-3 w-full rounded-xl bg-[#86B9B0] px-3 py-2 text-sm font-semibold text-[#041421]">
        Download PNG
      </button>
    </article>
  );
}
