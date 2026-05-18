import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, Query } from "node-appwrite";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";
import { parseClientSettings } from "@/lib/menu";

export const dynamic = "force-dynamic";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "trustfirst-main-db";

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

async function safeList(databases: Databases, collectionId: string, queries: string[]) {
  try {
    return await databases.listDocuments(databaseId, collectionId, queries);
  } catch {
    return null;
  }
}

function getClientId(doc: Record<string, any>) {
  return safeString(doc.client_id ?? doc.clientId ?? doc.client ?? doc.restaurant_id);
}

function restaurantNameFromSettings(docs: Record<string, any>[], clientId: string) {
  const parsed = parseClientSettings(docs as any[], clientId);
  const parsedName = safeString(parsed.restaurantName);
  if (parsedName && parsedName.toLowerCase() !== clientId.replace(/_/g, " ").toLowerCase()) {
    return parsedName;
  }

  const direct = docs.find((doc) => getClientId(doc) === clientId && safeString(doc.restaurantName ?? doc.name ?? doc.title));
  return safeString(direct?.restaurantName ?? direct?.name ?? direct?.title) || clientId.replace(/_/g, " ");
}


function restaurantLogoFromSettings(docs: Record<string, any>[], clientId: string) {
  const parsed = parseClientSettings(docs as any[], clientId);
  return safeString(parsed.logoUrl);
}

export async function GET(request: NextRequest) {
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }


  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const [tables, settings] = await Promise.all([
    safeList(databases, "tables", [Query.limit(300)]),
    safeList(databases, "settings", [Query.limit(300)]),
  ]);

  const tableDocs = (tables?.documents ?? []) as Record<string, any>[];
  const settingDocs = (settings?.documents ?? []) as Record<string, any>[];

  const clients = new Map<string, { clientId: string; name: string; logoUrl: string; tables: number; status: string; plan: string; qrPath: string }>();

  for (const doc of tableDocs) {
    const clientId = getClientId(doc);
    if (!clientId) continue;
    const tableNo = safeString(doc.table_no ?? doc.tableNo ?? doc.table_code ?? doc.tableCode ?? doc.code ?? "01");
    const current = clients.get(clientId) ?? {
      clientId,
      name: restaurantNameFromSettings(settingDocs, clientId),
      logoUrl: restaurantLogoFromSettings(settingDocs, clientId),
      tables: 0,
      status: "Active",
      plan: "Demo",
      qrPath: `/c/${clientId}/t/${encodeURIComponent(tableNo)}`,
    };
    current.tables += 1;
    clients.set(clientId, current);
  }

  return NextResponse.json({
    restaurants: Array.from(clients.values()).sort((a, b) => a.name.localeCompare(b.name)),
  });
}
