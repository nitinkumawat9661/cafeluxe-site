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

function settingValue(docs: Record<string, any>[], key: string, fallback: string) {
  return safeString(docs.find((doc) => safeString(doc.key) === key)?.value) || fallback;
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
    collectionId: "settings",
    queries: [Query.equal("client_id", [clientId]), Query.limit(100)],
  });

  const docs = result.documents as Record<string, any>[];

  return NextResponse.json({
    plan: settingValue(docs, "plan", "Demo"),
    orderingStatus: settingValue(docs, "ordering_status", "Enabled"),
    paymentStatus: settingValue(docs, "payment_status", "Pending"),
    expiresAt: settingValue(docs, "plan_expires_at", "Not set"),
  });
}
