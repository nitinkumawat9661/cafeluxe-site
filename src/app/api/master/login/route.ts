import { NextRequest, NextResponse } from "next/server";
import { setMasterAuthCookie, verifyMasterPin } from "@/lib/master-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin ?? "").trim();

  if (!verifyMasterPin(pin)) {
    return NextResponse.json({ message: "Invalid master PIN." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setMasterAuthCookie(response);

  return response;
}
