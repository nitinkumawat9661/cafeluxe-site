import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: HEADERS });
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001F\u007F<>]/g, "").trim().slice(0, maxLength)
    : "";
}

function readAmount(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.round(Math.max(0, parsed) * 100) / 100 : 0;
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")?.split(",")[0]?.trim() || "";
  if (origin && origin !== "null" && origin !== request.nextUrl.origin) return false;
  const referer = request.headers.get("referer")?.split(",")[0]?.trim() || "";
  if (!referer) return true;
  try {
    return new URL(referer).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return json({ ok: false, message: "Online payment request blocked by origin protection." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: "Invalid online payment request." }, 400);
  }

  const clientId = clean(body.client_id, 64);
  const tableId = clean(body.table_id, 64);
  const orderId = clean(body.order_id, 96);
  const orderNumber = clean(body.order_number, 96);
  const payableAmount = readAmount(body.amount);

  if (!clientId || !tableId || !orderId || !orderNumber || payableAmount <= 0) {
    return json({ ok: false, message: "Missing online payment details." }, 400);
  }

  if (process.env.ONLINE_PAYMENT_ENABLED !== "true") {
    return json({
      ok: false,
      code: "ONLINE_PAYMENT_NOT_ENABLED",
      message: "Online payment gateway route is ready, but live gateway is not enabled on this server yet.",
    }, 503);
  }

  return json({
    ok: false,
    code: "GATEWAY_ADAPTER_PENDING",
    message: "Gateway credentials are enabled. Connect the current provider adapter before accepting live customer payments.",
    payment: { clientId, tableId, orderId, orderNumber, amount: payableAmount },
  }, 501);
}
