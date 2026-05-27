import { NextRequest, NextResponse } from "next/server";
import { assertPhonePeConfigured, phonePeConfig } from "@/lib/server/phonepe-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const requestId = String(body?.request_id || body?.requestId || "").trim();
    const amount = Number(body?.amount || 0);

    if (!requestId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { ok: false, message: "request_id and valid amount are required." },
        { status: 400 }
      );
    }

    assertPhonePeConfigured();

    return NextResponse.json(
      {
        ok: false,
        message: "PhonePe real initiate implementation pending credentials.",
        mode: phonePeConfig.environment,
      },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
