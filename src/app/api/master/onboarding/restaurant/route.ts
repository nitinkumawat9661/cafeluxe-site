import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, ID, Query } from "node-appwrite";
import { appwriteCollections, serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function clean(value: string | undefined) {
  const text = String(value ?? "").trim();
  const quoted = (text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"));
  return quoted ? text.slice(1, -1).trim() : text;
}

const endpoint = serverAppwriteConfig.endpoint;
const projectId = serverAppwriteConfig.projectId;
const apiKey = serverAppwriteConfig.apiKey;
const databaseId = serverAppwriteConfig.databaseId || "trustfirst-main-db";
const settingsCollectionId = appwriteCollections.settings;
const tablesCollectionId = appwriteCollections.tables;
const usersCollectionId = "users";

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function safeText(value: unknown, max = 80) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function tableCode(index: number) {
  return String(index).padStart(2, "0");
}
function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function hashOwnerPassword(email: string, password: string) {
  const pepper = String(process.env.OWNER_PASSWORD_PEPPER || process.env.MASTER_PIN_PEPPER || process.env.APPWRITE_API_KEY || "");
  return createHash("sha256").update(`owner:${email}:${password}:${pepper}`).digest("hex");
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
  const ownerEmail = normalizeEmail(body?.ownerEmail);
  const ownerPassword = String(body?.ownerPassword ?? "").trim();

  if (!restaurantName || !clientId || !tableCount) return json("restaurantName, clientId, and tableCount are required.", 400);
  if ((ownerEmail || ownerPassword) && (!ownerEmail || ownerPassword.length < 6)) {
    return json("Valid ownerEmail and ownerPassword minimum 6 characters are required.", 400);
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const existingTables = await databases.listDocuments({
    databaseId,
    collectionId: tablesCollectionId,
    queries: [Query.equal("client_id", [clientId]), Query.limit(1)],
  });

  if (existingTables.total > 0) return json("Client ID already exists.", 409);

  if (ownerEmail) {
    const existingOwner = await databases.listDocuments({
      databaseId,
      collectionId: usersCollectionId,
      queries: [Query.equal("email", [ownerEmail]), Query.limit(1)],
    });
    if (existingOwner.total > 0) return json("Owner email already exists.", 409);
  }

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

  if (ownerEmail && ownerPassword) {
    await databases.createDocument({
      databaseId,
      collectionId: usersCollectionId,
      documentId: ID.unique(),
      data: {
        client_id: clientId,
        name: `${restaurantName} Owner`,
        email: ownerEmail,
        password_hash: hashOwnerPassword(ownerEmail, ownerPassword),
        role: "owner",
        active: true,
      },
    });
  }

  return NextResponse.json({ ok: true, clientId, restaurantName, plan, tableCount, ownerCreated: Boolean(ownerEmail) });
}
