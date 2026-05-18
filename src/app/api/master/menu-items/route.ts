import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { appwriteCollections, serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENU_ITEMS_COLLECTION_ID = appwriteCollections.menuItems || "menu_items";

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function text(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function id(value: unknown, max = 80) {
  return text(value, max).toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_");
}

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
}

function buildPayload(body: Record<string, unknown>) {
  const clientId = id(body.clientId ?? body.client_id, 64);
  const name = text(body.name, 120);
  const price = money(body.price ?? body.amount);
  if (!clientId || !name) return null;

  const payload: Record<string, unknown> = {
    client_id: clientId,
    name,
    price,
    is_available: body.isAvailable ?? body.is_available ?? true,
  };

  const description = text(body.description, 500);
  const categoryId = id(body.categoryId ?? body.category_id, 80);
  const imageFileId = id(body.imageFileId ?? body.image_file_id, 120);
  const imageBucketId = id(body.imageBucketId ?? body.image_bucket_id, 120);
  const imageUrl = text(body.imageUrl ?? body.image_url, 500);

  if (description) payload.description = description;
  if (categoryId) payload.category_id = categoryId;
  if (imageFileId) payload.image_file_id = imageFileId;
  if (imageBucketId) payload.image_bucket_id = imageBucketId;
  if (imageUrl) payload.image_url = imageUrl;

  return payload;
}

function db() {
  const { endpoint, projectId, apiKey, databaseId } = serverAppwriteConfig;
  if (!endpoint || !projectId || !apiKey || !databaseId) return null;
  return new Databases(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
}

export async function POST(request: NextRequest) {
  if (!isMasterAuthenticated(request)) return masterUnauthorized();
  const databases = db();
  if (!databases) return json("Server Appwrite config missing.", 500);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json("Invalid JSON body.", 400);

  const payload = buildPayload(body as Record<string, unknown>);
  if (!payload) return json("clientId and name are required.", 400);

  const created = await databases.createDocument({
    databaseId: serverAppwriteConfig.databaseId,
    collectionId: MENU_ITEMS_COLLECTION_ID,
    documentId: ID.unique(),
    data: payload,
  });

  return NextResponse.json(created);
}

function documentId(value: unknown) {
  return text(value, 120).replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function PATCH(request: NextRequest) {
  if (!isMasterAuthenticated(request)) return masterUnauthorized();
  const databases = db();
  if (!databases) return json("Server Appwrite config missing.", 500);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json("Invalid JSON body.", 400);

  const source = body as Record<string, unknown>;
  const targetDocumentId = documentId(source.documentId ?? source.id ?? source.$id);
  if (!targetDocumentId) return json("documentId is required.", 400);

  const payload = buildPayload(source);
  if (!payload) return json("clientId and name are required.", 400);

  const current = await databases.getDocument({
    databaseId: serverAppwriteConfig.databaseId,
    collectionId: MENU_ITEMS_COLLECTION_ID,
    documentId: targetDocumentId,
  }) as unknown as Record<string, unknown>;

  if (String(current.client_id ?? "") !== String(payload.client_id ?? "")) {
    return json("Menu item client scope mismatch.", 403);
  }

  const updated = await databases.updateDocument({
    databaseId: serverAppwriteConfig.databaseId,
    collectionId: MENU_ITEMS_COLLECTION_ID,
    documentId: targetDocumentId,
    data: payload,
  });

  return NextResponse.json(updated);
}
