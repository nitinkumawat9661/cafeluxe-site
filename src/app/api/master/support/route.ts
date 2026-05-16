import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "cafeluxe_master_auth";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "trustfirst-main-db";

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

export async function GET(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "ok") {
    return NextResponse.json({ message: "Master login required." }, { status: 401 });
  }

  const clientId = safeString(request.nextUrl.searchParams.get("clientId")) || "trustfirst_demo";

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const result = await databases.listDocuments({
    databaseId,
    collectionId: "notifications",
    queries: [
      Query.equal("client_id", [clientId]),
      Query.orderDesc("$createdAt"),
      Query.limit(20),
    ],
  });

  const tickets = result.documents.map((doc) => {
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
