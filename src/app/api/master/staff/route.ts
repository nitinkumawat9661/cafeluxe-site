import { NextRequest, NextResponse } from "next/server";
import { defaultClientId } from "@/lib/tenant";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, Query } from "node-appwrite";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = serverAppwriteConfig.endpoint;
const projectId = serverAppwriteConfig.projectId;
const apiKey = serverAppwriteConfig.apiKey;
const databaseId = serverAppwriteConfig.databaseId || "trustfirst-main-db";

function s(v: unknown) { return String(v ?? "").trim(); }

function permissions(role: string) {
  const r = role.toLowerCase();
  if (r.includes("admin") || r.includes("owner")) return "Full Access";
  if (r.includes("manager")) return "Menu, Records, Payments";
  if (r.includes("cashier")) return "Billing, Payments";
  if (r.includes("kitchen")) return "KOT, Order Status";
  if (r.includes("waiter")) return "Order Taking, Table Service";
  return "Limited Access";
}

export async function GET(request: NextRequest) {
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }


  const clientId = s(request.nextUrl.searchParams.get("clientId")) || defaultClientId;
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const result = await databases.listDocuments({
    databaseId,
    collectionId: "users",
    queries: [Query.equal("client_id", [clientId]), Query.limit(100)],
  });

  const staff = result.documents.map((doc) => ({
    id: doc.$id,
    role: s(doc.role) || "staff",
    name: s(doc.name || doc.username),
    status: doc.active ? "Active" : s(doc.status || "Inactive"),
    permissions: permissions(s(doc.role)),
  }));

  if (!staff.some((x) => x.role.toLowerCase().includes("waiter"))) {
    staff.push({ id: "waiter-placeholder", role: "waiter", name: "Waiter Placeholder", status: "Pending", permissions: "Order Taking, Table Service" });
  }

  return NextResponse.json({ staff });
}
