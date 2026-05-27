import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";
import { appwriteCollections, serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: unknown, max = 500) {
  return String(v ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

function amount(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const clientId = clean(body?.client_id || body?.clientId, 64);
    const billId = clean(body?.bill_id || body?.billId, 96);
    const sessionId = clean(body?.session_id || body?.sessionId, 96);
    const tableId = clean(body?.table_id || body?.tableId, 64);
    const tableNumber = clean(body?.table_number || body?.tableNumber, 80);
    const total = amount(body?.amount || body?.total_amount || body?.totalAmount);
    const orderIds = Array.isArray(body?.order_ids || body?.orderIds)
      ? (body?.order_ids || body?.orderIds).map((x: unknown) => clean(x, 64)).filter(Boolean)
      : [];

    if (!clientId || !billId || !sessionId || !tableId || !tableNumber || !total || orderIds.length === 0) {
      return NextResponse.json({ ok: false, message: "Invalid table bill payment payload." }, { status: 400 });
    }

    const requestId = `TBILLPAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const qrUrl = `https://cafeluxesite.in/mock-pay/${requestId}`;
    const upiIntentUrl = `upi://pay?pa=7665853321@superyes&pn=Nitin%20Kumawat&am=${total}&cu=INR&tn=${requestId}`;

    const client = new Client().setEndpoint(serverAppwriteConfig.endpoint).setProject(serverAppwriteConfig.projectId).setKey(serverAppwriteConfig.apiKey);
    const db = new Databases(client);

    const metadata = JSON.stringify({ kind: "table_bill", clientId, billId, sessionId, tableId, tableNumber, orderIds });

    const doc = await db.createDocument({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: "payment_requests",
      documentId: ID.unique(),
      data: {
        client_id: clientId,
        request_id: requestId,
        source: "table_bill_web",
        customer_name: tableNumber,
        amount: total,
        status: "PAYMENT_PENDING",
        items_json: metadata,
        gateway: "MOCK",
        qr_url: qrUrl,
        upi_intent_url: upiIntentUrl,
        created_at_custom: new Date().toISOString(),
      },
    });


    await db.createDocument({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: appwriteCollections.payments,
      documentId: ID.unique(),
      data: {
        client_id: clientId,
        order_id: orderIds[0] || "",
        bill_id: billId,
        session_id: sessionId,
        table_number: tableNumber,
        amount: total,
        payment_method: "UPI",
        payment_mode: "ONLINE_UPI",
        payment_status: "PENDING_VERIFICATION",
        customer_marked_paid: false,
        verified_by: "PENDING_STAFF_CONFIRMATION",
        verified_at: new Date().toISOString(),
      },
    });

    const sessions = await db.listDocuments({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: appwriteCollections.tableSessions,
      queries: [
        Query.equal("bill_id", [billId]),
        Query.equal("session_id", [sessionId]),
        Query.limit(1),
      ],
    });

    const sessionDoc = sessions.documents[0];
    if (sessionDoc) {
      await db.updateDocument({
        databaseId: serverAppwriteConfig.databaseId,
        collectionId: appwriteCollections.tableSessions,
        documentId: sessionDoc.$id,
        data: {
          status: "payment_pending",
          payment_status: "pending",
          total_amount: total,
        },
      });
    }
    return NextResponse.json({ ok: true, requestId, documentId: doc.$id, status: "PAYMENT_PENDING", gateway: "MOCK", qr_url: qrUrl, upi_intent_url: upiIntentUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}


