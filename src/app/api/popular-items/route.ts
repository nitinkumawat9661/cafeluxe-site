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

type PopularItemsPayload = { rank: Record<string, number>; degraded?: boolean };

const POPULAR_ITEMS_CACHE_TTL_MS = 5 * 60 * 1000;
const popularItemsCache = new Map<string, { expiresAt: number; payload: PopularItemsPayload }>();

function jsonWithCache(payload: PopularItemsPayload) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
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

  const now = Date.now();
  const cached = popularItemsCache.get(clientId);
  if (cached && cached.expiresAt > now) {
    return jsonWithCache(cached.payload);
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);
  let response;
  try {
    response = await databases.listDocuments(databaseId, "orders", [
      Query.equal("client_id", [clientId]),
      Query.limit(300),
      Query.orderDesc("$createdAt"),
    ]);
  } catch {
    const payload: PopularItemsPayload = { rank: {}, degraded: true };
    popularItemsCache.set(clientId, {
      expiresAt: Date.now() + POPULAR_ITEMS_CACHE_TTL_MS,
      payload,
    });

    return jsonWithCache(payload);
  }

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

  const payload = { rank };
  popularItemsCache.set(clientId, {
    expiresAt: Date.now() + POPULAR_ITEMS_CACHE_TTL_MS,
    payload,
  });

  return jsonWithCache(payload);
}
