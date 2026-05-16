"use client";

import { useEffect, useState } from "react";
import BrandedQrCard from "@/components/master/branded-qr-card";

type QrTable = {
  tableNo: string;
  tableCode: string;
  qrPath: string;
};

type QrData = {
  restaurantName: string;
  logoUrl: string;
  tables: QrTable[];
};

const fallbackData: QrData = {
  restaurantName: "Nanu Da Dhaba",
  logoUrl: "",
  tables: ["01", "02", "03", "06"].map((tableNo) => ({
    tableNo,
    tableCode: tableNo,
    qrPath: `/c/trustfirst_demo/t/${tableNo}`,
  })),
};

export default function MasterQrLive({ clientId }: { clientId: string }) {
  const [data, setData] = useState<QrData>(fallbackData);

  useEffect(() => {
    fetch(`/api/master/qr-tables?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((nextData) => {
        if (Array.isArray(nextData?.tables) && nextData.tables.length > 0) {
          setData(nextData);
        }
      })
      .catch(() => setData(fallbackData));
  }, [clientId]);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      {data.tables.map((table) => (
        <BrandedQrCard
          key={table.tableCode || table.tableNo}
          restaurantName={data.restaurantName}
          tableNo={table.tableNo}
          qrPath={table.qrPath}
          logoUrl={data.logoUrl}
        />
      ))}
    </div>
  );
}
