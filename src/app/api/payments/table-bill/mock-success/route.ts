import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Customer-side payment confirmation is disabled. Payment must be verified by staff app or payment gateway webhook.",
    },
    { status: 403 }
  );
}
