import { NextRequest, NextResponse } from "next/server";
import { defaultClientId } from "@/lib/tenant";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, ID, Query } from "node-appwrite";
import { appwriteCollections, serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = serverAppwriteConfig.endpoint;
const projectId = serverAppwriteConfig.projectId;
const apiKey = serverAppwriteConfig.apiKey;
const databaseId = serverAppwriteConfig.databaseId || "trustfirst-main-db";
const settingsCollectionId = appwriteCollections.settings;

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function safeText(value: unknown, max = 120) {
  return safeString(value).replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

function settingValue(docs: Record<string, any>[], key: string, fallback: string) {
  return safeString(docs.find((doc) => safeString(doc.key) === key)?.value) || fallback;
}

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function databasesClient() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

async function listSettings(databases: Databases, clientId: string) {
  return databases.listDocuments({
    databaseId,
    collectionId: settingsCollectionId,
    queries: [Query.equal("client_id", [clientId]), Query.limit(100)],
  });
}

async function upsertSetting(databases: Databases, docs: Record<string, any>[], clientId: string, key: string, value: string) {
  const current = docs.find((doc) => safeString(doc.key) === key);

  if (current?.$id) {
    return databases.updateDocument({
      databaseId,
      collectionId: settingsCollectionId,
      documentId: current.$id,
      data: { value },
    });
  }

  return databases.createDocument({
    databaseId,
    collectionId: settingsCollectionId,
    documentId: ID.unique(),
    data: { client_id: clientId, key, value },
  });
}

export async function GET(request: NextRequest) {
  if (!isMasterAuthenticated(request)) return masterUnauthorized();

  const clientId = safeString(request.nextUrl.searchParams.get("clientId")) || defaultClientId;
  const databases = databasesClient();
  const result = await listSettings(databases, clientId);
  const docs = result.documents as Record<string, any>[];

  return NextResponse.json({
    plan: settingValue(docs, "plan", "Demo"),
    orderingStatus: settingValue(docs, "ordering_status", "Enabled"),
    paymentStatus: settingValue(docs, "payment_status", "Pending"),
    expiresAt: settingValue(docs, "plan_expires_at", "Not set"),
  });
}

export async function POST(request: NextRequest) {
  if (!isMasterAuthenticated(request)) return masterUnauthorized();
  if (!endpoint || !projectId || !apiKey) return json("Server Appwrite config missing.", 500);

  const body = await request.json().catch(() => null);
  const clientId = safeText(body?.clientId, 64) || defaultClientId;

  const updates = {
    plan: safeText(body?.plan, 40) || "Demo",
    ordering_status: safeText(body?.orderingStatus, 40) || "Enabled",
    payment_status: safeText(body?.paymentStatus, 40) || "Pending",
    plan_expires_at: safeText(body?.expiresAt, 80) || "Not set",
  };

  const databases = databasesClient();
  const result = await listSettings(databases, clientId);
  const docs = result.documents as Record<string, any>[];

  await Promise.all(Object.entries(updates).map(([key, value]) => upsertSetting(databases, docs, clientId, key, value)));

  return NextResponse.json({ ok: true, clientId, ...updates });
}
