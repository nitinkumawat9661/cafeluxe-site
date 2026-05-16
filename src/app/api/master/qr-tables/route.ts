import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, Query } from "node-appwrite";
import { parseClientSettings, parseTables } from "@/lib/menu";

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

export async function GET(request: NextRequest) {
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }


  const clientId = safeString(request.nextUrl.searchParams.get("clientId"));
  if (!clientId) {
    return NextResponse.json({ message: "clientId is required" }, { status: 400 });
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const [tables, settings] = await Promise.all([
    safeList(databases, "tables", [Query.equal("client_id", [clientId]), Query.limit(300)]),
    safeList(databases, "settings", [Query.equal("client_id", [clientId]), Query.limit(300)]),
  ]);

  const parsedSettings = parseClientSettings((settings?.documents ?? []) as any[], clientId);
  const parsedTables = parseTables((tables?.documents ?? []) as any[], clientId);

  return NextResponse.json({
    restaurantName: parsedSettings.restaurantName || "Nanu Da Dhaba",
    logoUrl: parsedSettings.logoUrl || "",
    tables: parsedTables.map((table) => ({
      tableNo: table.tableNo,
      tableCode: table.tableCode,
      qrPath: `/c/${clientId}/t/${encodeURIComponent(table.tableCode || table.tableNo)}`,
    })),
  });
}
