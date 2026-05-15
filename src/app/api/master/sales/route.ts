import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "trustfirst-main-db";

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function amount(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function istDateKey(value: unknown) {
  const date = new Date(safeString(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function GET(request: NextRequest) {
  const clientId = safeString(request.nextUrl.searchParams.get("clientId"));
  if (!clientId) {
    return NextResponse.json({ message: "clientId is required" }, { status: 400 });
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const response = await databases.listDocuments(databaseId, "orders", [
    Query.equal("client_id", [clientId]),
    Query.orderDesc("$createdAt"),
    Query.limit(300),
  ]);

  const todayKey = istDateKey(new Date().toISOString());
  let todaySales = 0;
  let todayOrders = 0;
  const itemRank: Record<string, { name: string; qty: number }> = {};
  const payments: Record<string, number> = {};

  for (const doc of response.documents) {
    const createdAt = doc.created_at_custom || doc.created_at || doc.$createdAt;
    if (istDateKey(createdAt) !== todayKey) continue;

    todayOrders += 1;
    todaySales += amount(doc.total_amount ?? doc.total ?? doc.grand_total);
    const method = safeString(doc.payment_method ?? doc.paymentMethod) || "COUNTER";
    payments[method] = (payments[method] ?? 0) + 1;

    for (const item of parseItems(doc.items_json ?? doc.order_items ?? doc.items)) {
      const id = safeString(item.item_id ?? item.itemId ?? item.id);
      if (!id) continue;
      const name = safeString(item.item_name ?? item.name ?? item.itemName) || id;
      const qty = amount(item.quantity ?? item.qty);
      itemRank[id] = itemRank[id] || { name, qty: 0 };
      itemRank[id].qty += qty;
    }
  }

  const mostSold = Object.values(itemRank).sort((a, b) => b.qty - a.qty)[0] || null;

  return NextResponse.json({
    todaySales,
    todayOrders,
    mostSoldItem: mostSold,
    paymentBreakdown: payments,
  });
}
