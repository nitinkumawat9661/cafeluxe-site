import { NextRequest, NextResponse } from "next/server";
import { phonePeConfig } from "@/lib/server/phonepe-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBasicAuth(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [username, ...rest] = decoded.split(":");
    return { username, password: rest.join(":") };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = getBasicAuth(request);

  if (phonePeConfig.webhookUsername || phonePeConfig.webhookPassword) {
    if (
      !auth ||
      auth.username !== phonePeConfig.webhookUsername ||
      auth.password !== phonePeConfig.webhookPassword
    ) {
      return NextResponse.json({ ok: false, message: "Unauthorized webhook." }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);

  return NextResponse.json({
    ok: true,
    message: "PhonePe webhook received. Real verification pending credentials.",
    received: !!body,
  });
}
