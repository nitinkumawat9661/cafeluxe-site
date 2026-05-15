import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "cafeluxe_master_auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin ?? "").trim();
  const expectedPin = String(process.env.MASTER_ADMIN_PIN ?? "").trim();

  if (!expectedPin || pin !== expectedPin) {
    return NextResponse.json({ message: "Invalid master PIN." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/master",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
