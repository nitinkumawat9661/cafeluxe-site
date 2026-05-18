import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, Query } from "node-appwrite";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "trustfirst-main-db";
const notificationsCollectionId = "notifications";

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function parsePayload(value: unknown) {
  try {
    return JSON.parse(safeString(value));
  } catch {
    return {};
  }
}

function databasesClient() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET(request: NextRequest) {
  if (!isMasterAuthenticated(request)) return masterUnauthorized();

  const clientId = safeString(request.nextUrl.searchParams.get("clientId")) || "trustfirst_demo";
  const databases = databasesClient();

  const result = await databases.listDocuments({
    databaseId,
    collectionId: notificationsCollectionId,
    queries: [Query.equal("client_id", [clientId]), Query.orderDesc("$createdAt"), Query.limit(100)],
  });

  const ticketTypes = new Set(["support", "ticket", "restaurant_issue", "client_issue"]);

  const tickets = result.documents.filter((doc) => ticketTypes.has(safeString(doc.type))).map((doc) => {
    const payload = parsePayload(doc.payload);
    return {
      id: doc.$id,
      title: safeString(payload.title) || safeString(doc.type) || "Support notification",
      source: safeString(payload.source) || safeString(doc.target_role) || "System",
      priority: safeString(payload.priority) || "Normal",
      status: doc.read ? "Resolved" : "Open",
      createdAt: doc.$createdAt,
    };
  });

  return NextResponse.json({ tickets });
}

export async function POST(request: NextRequest) {
  if (!isMasterAuthenticated(request)) return masterUnauthorized();

  const body = await request.json().catch(() => null);
  const clientId = safeString(body?.clientId) || "trustfirst_demo";
  const ticketId = safeString(body?.ticketId);
  const action = safeString(body?.action).toLowerCase();

  if (!ticketId) return json("ticketId is required.", 400);
  if (!["resolve", "reopen"].includes(action)) return json("Unsupported support action.", 400);

  const databases = databasesClient();
  const current = await databases.getDocument({ databaseId, collectionId: notificationsCollectionId, documentId: ticketId });

  if (safeString(current.client_id) !== clientId) return json("Ticket does not belong to this client.", 403);

  await databases.updateDocument({
    databaseId,
    collectionId: notificationsCollectionId,
    documentId: ticketId,
    data: { read: action === "resolve" },
  });

  return NextResponse.json({ ok: true, ticketId, status: action === "resolve" ? "Resolved" : "Open" });
}
