import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, ID, Query } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function clean(value: string | undefined) {
  const text = String(value ?? "").trim();
  const quoted = (text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"));
  return quoted ? text.slice(1, -1).trim() : text;
}

const endpoint = clean(process.env.APPWRITE_ENDPOINT);
const projectId = clean(process.env.APPWRITE_PROJECT_ID);
const apiKey = clean(process.env.APPWRITE_API_KEY);
const databaseId = clean(process.env.APPWRITE_DATABASE_ID) || "trustfirst-main-db";
const settingsCollectionId = clean(process.env.APPWRITE_SETTINGS_COLLECTION_ID) || "settings";
const tablesCollectionId = clean(process.env.APPWRITE_TABLES_COLLECTION_ID) || "tables";

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function safeText(value: unknown, max = 80) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function tableCode(index: number) {
  return String(index).padStart(2, "0");
}

export async function POST(request: NextRequest) {
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }
  if (!endpoint || !projectId || !apiKey) return json("Server Appwrite config missing.", 500);

  const body = await request.json().catch(() => null);
  const restaurantName = safeText(body?.restaurantName);
  const clientId = safeText(body?.clientId, 64).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const plan = safeText(body?.plan || "Demo", 40);
  const tableCount = Math.min(200, Math.max(1, Number(body?.tableCount || 0)));

  if (!restaurantName || !clientId || !tableCount) return json("restaurantName, clientId, and tableCount are required.", 400);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const existingTables = await databases.listDocuments({
    databaseId,
    collectionId: tablesCollectionId,
    queries: [Query.equal("client_id", [clientId]), Query.limit(1)],
  });

  if (existingTables.total > 0) return json("Client ID already exists.", 409);

  const settings = [
    ["restaurant_name", restaurantName],
    ["plan", plan],
  ];

  for (const [key, value] of settings) {
    await databases.createDocument({
      databaseId,
      collectionId: settingsCollectionId,
      documentId: ID.unique(),
      data: { client_id: clientId, key, value },
    });
  }

  for (let i = 1; i <= tableCount; i++) {
    const code = tableCode(i);
    await databases.createDocument({
      databaseId,
      collectionId: tablesCollectionId,
      documentId: ID.unique(),
      data: { client_id: clientId, table_no: code, table_code: code, active: true },
    });
  }

  return NextResponse.json({ ok: true, clientId, restaurantName, plan, tableCount });
}
