"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type Props = {
  restaurantName: string;
  tableNo: string;
  qrPath: string;
  logoUrl?: string;
};

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function BrandedQrCard({ restaurantName, tableNo, qrPath, logoUrl = "" }: Props) {
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}${qrPath}`;
      const canvas = document.createElement("canvas");

      await QRCode.toCanvas(canvas, url, {
        width: 520,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const box = 146;
      const x = (canvas.width - box) / 2;
      const y = (canvas.height - box) / 2;

      ctx.fillStyle = "#ffffff";
      drawRoundRect(ctx, x, y, box, box, 26);
      ctx.fill();

      if (logoUrl) {
        try {
          const logo = await loadImage(logoUrl);
          ctx.save();
          drawRoundRect(ctx, x + 7, y + 7, box - 14, box - 14, 22);
          ctx.clip();
          ctx.drawImage(logo, x + 7, y + 7, box - 14, box - 14);
          ctx.restore();
        } catch {
          ctx.fillStyle = "#86B9B0";
          drawRoundRect(ctx, x + 7, y + 7, box - 14, box - 14, 22);
          ctx.fill();
          ctx.fillStyle = "#041421";
          ctx.font = "bold 34px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("CL", canvas.width / 2, canvas.height / 2);
        }
      } else {
        ctx.fillStyle = "#86B9B0";
        drawRoundRect(ctx, x + 7, y + 7, box - 14, box - 14, 22);
        ctx.fill();
        ctx.fillStyle = "#041421";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CL", canvas.width / 2, canvas.height / 2);
      }

      if (!cancelled) setQrSrc(canvas.toDataURL("image/png"));
    }

    buildQr().catch(() => setQrSrc(""));
    return () => { cancelled = true; };
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

