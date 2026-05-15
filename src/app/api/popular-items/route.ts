import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "trustfirst-main-db";

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function parseItems(raw: unknown) {
  if (!raw) return [];
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

export async function GET(request: NextRequest) {
  const clientId = safeString(request.nextUrl.searchParams.get("clientId"));
  if (!clientId) {
    return NextResponse.json({ message: "clientId is required" }, { status: 400 });
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const response = await databases.listDocuments(databaseId, "orders", [
    Query.equal("client_id", [clientId]),
    Query.limit(300),
    Query.orderDesc("$createdAt"),
  ]);

  const rank: Record<string, number> = {};

  for (const doc of response.documents) {
    const items = parseItems(
      doc.items_json ?? doc.order_items ?? doc.items ?? doc.orderItems ?? doc.cart_items,
    );

    for (const item of items) {
      const itemId = safeString(item.item_id ?? item.itemId ?? item.id);
      const qty = Number(item.quantity ?? item.qty ?? 0);
      if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
      rank[itemId] = (rank[itemId] ?? 0) + qty;
    }
  }

  return NextResponse.json({ rank });
}
