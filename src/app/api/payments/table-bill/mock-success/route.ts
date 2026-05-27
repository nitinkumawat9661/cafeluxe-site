import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query, ID } from "node-appwrite";
import { appwriteCollections, serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: unknown, max = 500) {
  return String(v ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const requestId = clean(body?.request_id || body?.requestId, 96);
    const secret = clean(body?.secret, 120);

    if (!requestId) return NextResponse.json({ ok: false, message: "request_id required" }, { status: 400 });
    if (secret !== "local_test_123") return NextResponse.json({ ok: false, message: "invalid secret" }, { status: 403 });

    const client = new Client().setEndpoint(serverAppwriteConfig.endpoint).setProject(serverAppwriteConfig.projectId).setKey(serverAppwriteConfig.apiKey);
    const db = new Databases(client);

    const found = await db.listDocuments({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: "payment_requests",
      queries: [Query.equal("request_id", [requestId]), Query.limit(1)],
    });

    const req = found.documents[0] as any;
    if (!req) return NextResponse.json({ ok: false, message: "payment request not found" }, { status: 404 });

    const meta = JSON.parse(String(req.items_json || "{}"));
    if (meta.kind !== "table_bill") return NextResponse.json({ ok: false, message: "not a table bill request" }, { status: 400 });

    const now = new Date().toISOString();
    const orderIds: string[] = Array.isArray(meta.orderIds) ? meta.orderIds : [];

    await db.updateDocument({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: "payment_requests",
      documentId: req.$id,
      data: { status: "PAYMENT_SUCCESS", gateway_payment_id: `MOCK-TBILL-${Date.now()}`, paid_at_custom: now },
    });

    for (const orderId of orderIds) {
      await db.updateDocument({
        databaseId: serverAppwriteConfig.databaseId,
        collectionId: appwriteCollections.orders,
        documentId: orderId,
        data: { payment_status: "COMPLETED", payment_method: "UPI" },
      });
    }

    await db.createDocument({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: appwriteCollections.payments,
      documentId: ID.unique(),
      data: {
        client_id: meta.clientId,
        order_id: orderIds[0] || "",
        bill_id: meta.billId,
        session_id: meta.sessionId,
        table_number: meta.tableNumber,
        amount: Number(req.amount || 0),
        payment_method: "UPI",
        payment_mode: "MOCK_UPI",
        payment_status: "COMPLETED",
        customer_marked_paid: true,
        verified_by: "mock_gateway",
        verified_at: now,
      },
    });

    return NextResponse.json({ ok: true, requestId, status: "TABLE_BILL_PAID", paidOrderCount: orderIds.length, billId: meta.billId });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
