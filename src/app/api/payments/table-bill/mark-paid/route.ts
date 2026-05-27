import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";
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
    if (!requestId) return NextResponse.json({ ok: false, message: "request_id required" }, { status: 400 });

    const db = new Databases(new Client().setEndpoint(serverAppwriteConfig.endpoint).setProject(serverAppwriteConfig.projectId).setKey(serverAppwriteConfig.apiKey));

    const found = await db.listDocuments({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: "payment_requests",
      queries: [Query.equal("request_id", [requestId]), Query.limit(1)],
    });

    const req = found.documents[0] as any;
    if (!req) return NextResponse.json({ ok: false, message: "payment request not found" }, { status: 404 });

    const meta = JSON.parse(String(req.items_json || "{}"));
    if (meta.kind !== "table_bill") return NextResponse.json({ ok: false, message: "not a table bill request" }, { status: 400 });

    const existing = await db.listDocuments({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: appwriteCollections.payments,
      queries: [
        Query.equal("bill_id", [meta.billId]),
        Query.equal("payment_status", ["COMPLETED", "PENDING_VERIFICATION"]),
        Query.limit(1),
      ],
    });

    if (!existing.documents.length) {
      await db.createDocument({
        databaseId: serverAppwriteConfig.databaseId,
        collectionId: appwriteCollections.payments,
        documentId: ID.unique(),
        data: {
          client_id: meta.clientId,
          order_id: Array.isArray(meta.orderIds) ? meta.orderIds[0] || "" : "",
          bill_id: meta.billId,
          session_id: meta.sessionId,
          table_number: meta.tableNumber,
          amount: Number(req.amount || 0),
          payment_method: "UPI",
          payment_mode: "ONLINE_UPI",
          payment_status: "PENDING_VERIFICATION",
          customer_marked_paid: true,
          verified_by: "PENDING_STAFF_CONFIRMATION",
          verified_at: new Date().toISOString(),
        },
      });
    }

    const sessions = await db.listDocuments({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: appwriteCollections.tableSessions,
      queries: [Query.equal("bill_id", [meta.billId]), Query.equal("session_id", [meta.sessionId]), Query.limit(1)],
    });

    if (sessions.documents[0]) {
      await db.updateDocument({
        databaseId: serverAppwriteConfig.databaseId,
        collectionId: appwriteCollections.tableSessions,
        documentId: sessions.documents[0].$id,
        data: { status: "payment_pending", payment_status: "pending", total_amount: Number(req.amount || 0) },
      });
    }

    return NextResponse.json({ ok: true, status: "PENDING_STAFF_CONFIRMATION" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
