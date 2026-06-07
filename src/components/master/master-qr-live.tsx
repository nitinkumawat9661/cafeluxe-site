"use client";

import { useEffect, useState } from "react";
import { defaultClientId } from "@/lib/tenant";
import BrandedQrCard from "@/components/master/branded-qr-card";
import { buildBrandedQrDataUrl } from "@/lib/qr-branding";

type QrTable = { tableNo: string; tableCode: string; qrPath: string };
type QrData = { restaurantName: string; logoUrl: string; tables: QrTable[] };

const fallbackData: QrData = {
  restaurantName: "Nanu Da Dhaba",
  logoUrl: "/logo/cafe_luxe_logo.png",
  tables: ["01", "02", "03", "06"].map((tableNo) => ({
    tableNo,
    tableCode: tableNo,
    qrPath: `/c/${defaultClientId}/t/${tableNo}`,
  })),
};

export default function MasterQrLive({ clientId }: { clientId: string }) {
  const [data, setData] = useState<QrData>(fallbackData);
  const [downloading, setDownloading] = useState(false);

  const activeClientId = clientId || defaultClientId;
  const logoUrl = data.logoUrl || "/logo/cafe_luxe_logo.png";
  const tables = data.tables.map((table) => ({
    ...table,
    qrPath: `/c/${encodeURIComponent(activeClientId)}/t/${encodeURIComponent(table.tableNo)}`,
  }));

  useEffect(() => {
    fetch(`/api/master/qr-tables?clientId=${encodeURIComponent(activeClientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((nextData) => {
        if (Array.isArray(nextData?.tables) && nextData.tables.length > 0) setData(nextData);
      })
      .catch(() => setData(fallbackData));
  }, [activeClientId]);

  async function downloadAll() {
    setDownloading(true);
    for (const table of tables) {
      const src = await buildBrandedQrDataUrl(table.qrPath, logoUrl);
      if (!src) continue;
      const link = document.createElement("a");
      link.href = src;
      link.download = `${activeClientId}-table-${table.tableNo}-qr.png`;
      link.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setDownloading(false);
  }

  return (
    <>
      <button onClick={downloadAll} disabled={downloading} className="mt-5 rounded-2xl bg-[#86B9B0] px-5 py-3 text-sm font-semibold text-[#041421] disabled:opacity-50">
        {downloading ? "Downloading..." : `Download All QR PNGs (${tables.length})`}
      </button>
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {tables.map((table) => (
          <BrandedQrCard key={table.tableCode || table.tableNo} restaurantName={data.restaurantName} tableNo={table.tableNo} qrPath={table.qrPath} logoUrl={logoUrl} />
        ))}
      </div>
    </>
  );
}