import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_REQUESTS_COLLECTION_ID = "payment_requests";

function clean(value: unknown, max = 500) {
  return String(value ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const clientId = clean(body?.client_id || body?.clientId, 64);
    const customerName = clean(body?.customer_name || body?.customerName, 120);
    const source = clean(body?.source || "manual_takeaway_app", 40);
    const amount = toAmount(body?.amount);
    const itemsJson = clean(typeof body?.items_json === "string" ? body.items_json : JSON.stringify(body?.items ?? []), 10000);

    if (!clientId || !customerName || !amount || !itemsJson || itemsJson === "[]") {
      return NextResponse.json({ ok: false, message: "Invalid payment request payload." }, { status: 400 });
    }

    const requestId = `PAYREQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const qrUrl = `https://cafeluxesite.in/mock-pay/${requestId}`;
    const upiIntentUrl = `upi://pay?pa=7665853321@superyes&pn=Nitin%20Kumawat&am=${amount}&cu=INR&tn=${requestId}`;

    const client = new Client().setEndpoint(serverAppwriteConfig.endpoint).setProject(serverAppwriteConfig.projectId).setKey(serverAppwriteConfig.apiKey);
    const databases = new Databases(client);

    const doc = await databases.createDocument({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: PAYMENT_REQUESTS_COLLECTION_ID,
      documentId: ID.unique(),
      data: {
        client_id: clientId,
        request_id: requestId,
        source,
        customer_name: customerName,
        amount,
        status: "PAYMENT_PENDING",
        items_json: itemsJson,
        gateway: "MOCK",
        qr_url: qrUrl,
        upi_intent_url: upiIntentUrl,
        created_at_custom: new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true, requestId, documentId: doc.$id, status: "PAYMENT_PENDING", gateway: "MOCK", qr_url: qrUrl, upi_intent_url: upiIntentUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}