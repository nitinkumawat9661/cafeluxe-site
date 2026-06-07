import QRCode from "qrcode";

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

export async function buildBrandedQrDataUrl(qrPath: string, logoUrl = "/logo/cafe_luxe_logo.png") {
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const configuredOrigin =
    process.env.NEXT_PUBLIC_ORDER_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    fallbackOrigin;

  const cleanOrigin = configuredOrigin.replace(/\/$/, "");
  const url = qrPath.startsWith("http")
    ? qrPath
    : `${cleanOrigin}${qrPath.startsWith("/") ? qrPath : `/${qrPath}`}`;

  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, { width: 520, margin: 2, errorCorrectionLevel: "H" });

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const box = 146;
  const x = (canvas.width - box) / 2;
  const y = (canvas.height - box) / 2;

  ctx.fillStyle = "#ffffff";
  drawRoundRect(ctx, x, y, box, box, 26);
  ctx.fill();

  try {
    const logo = await loadImage(logoUrl || "/logo/cafe_luxe_logo.png");
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

  return canvas.toDataURL("image/png");
}