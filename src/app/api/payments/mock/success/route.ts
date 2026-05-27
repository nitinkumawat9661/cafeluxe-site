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
    const secret = clean(body?.secret, 120);

    if (!requestId) return NextResponse.json({ ok: false, message: "request_id required" }, { status: 400 });
    if (secret !== "local_test_123") return NextResponse.json({ ok: false, message: "invalid secret" }, { status: 403 });

    const client = new Client()
      .setEndpoint(serverAppwriteConfig.endpoint)
      .setProject(serverAppwriteConfig.projectId)
      .setKey(serverAppwriteConfig.apiKey);

    const db = new Databases(client);

    const found = await db.listDocuments({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: "payment_requests",
      queries: [Query.equal("request_id", [requestId]), Query.limit(1)],
    });

    const req = found.documents[0];
    if (!req) return NextResponse.json({ ok: false, message: "payment request not found" }, { status: 404 });

    await db.updateDocument({
      databaseId: serverAppwriteConfig.databaseId,
      collectionId: "payment_requests",
      documentId: req.$id,
      data: {
        status: "PAYMENT_SUCCESS",
        gateway_payment_id: `MOCK-${Date.now()}`,
        paid_at_custom: new Date().toISOString(),
      },
    });

    const r=req as any;
    const now=new Date().toISOString();
    const clientId=clean(r.client_id,64);
    const customerName=clean(r.customer_name,80)||"Takeaway";
    const amount=Number(r.amount||0);
    const itemsJson=clean(r.items_json,24000);
    const billId=`TAKEAWAY-${Date.now()}`;
    const sessionId=`TAKEAWAY-SESSION-${Date.now()}`;
    const tableId="takeaway";
    const tableNumber=`TAKEAWAY - ${customerName.toUpperCase()}`;

    const orderDoc=await db.createDocument({
      databaseId:serverAppwriteConfig.databaseId,
      collectionId:appwriteCollections.orders,
      documentId:ID.unique(),
      data:{client_id:clientId,table_id:tableId,table_number:tableNumber,order_number:billId,session_id:sessionId,bill_id:billId,order_round:1,is_add_more:false,status:"PLACED",payment_status:"COMPLETED",payment_method:"UPI",kot_status:"pending",subtotal:amount,total_amount:amount,items_json:itemsJson,created_at_custom:now}
    });

    await db.createDocument({
      databaseId:serverAppwriteConfig.databaseId,
      collectionId:appwriteCollections.printJobs,
      documentId:ID.unique(),
      data:{client_id:clientId,table_id:tableId,table_number:tableNumber,session_id:sessionId,bill_id:billId,order_id:orderDoc.$id,order_number:billId,label:`TAKEAWAY KOT ${customerName.toUpperCase()}`,job_type:"KOT",printer_type:"KITCHEN",status:"pending",items_json:itemsJson,total_amount:amount,created_at_custom:now}
    });

    return NextResponse.json({ok:true,requestId,status:"ORDER_CREATED",orderId:orderDoc.$id,billId});
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}


