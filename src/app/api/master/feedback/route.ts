import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, Query } from "node-appwrite";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const endpoint = serverAppwriteConfig.endpoint;
const projectId = serverAppwriteConfig.projectId;
const apiKey = serverAppwriteConfig.apiKey;
const databaseId = serverAppwriteConfig.databaseId || "trustfirst-main-db";

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
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }


  const clientId = safeString(request.nextUrl.searchParams.get("clientId")) || "trustfirst_demo";
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const result = await databases.listDocuments({
    databaseId,
    collectionId: "notifications",
    queries: [Query.equal("client_id", [clientId]), Query.orderDesc("$createdAt"), Query.limit(50)],
  });

  const feedback = result.documents
    .map((doc) => ({ doc, payload: parsePayload(doc.payload) }))
    .filter(({ doc, payload }) => /feedback|review|rating|complaint|suggestion|praise/i.test(`${doc.type} ${payload.type ?? ""}`))
    .map(({ doc, payload }) => ({
      id: doc.$id,
      type: safeString(payload.type) || safeString(doc.type) || "Feedback",
      text: safeString(payload.text || payload.message || payload.title) || "Feedback received",
      rating: Number(payload.rating || 0),
      tableNo: safeString(payload.tableNo || payload.table_no),
      source: safeString(payload.source),
      customerName: safeString(payload.customerName || payload.name),
      title: safeString(payload.title),
      status: doc.read ? "Reviewed" : "New",
      createdAt: doc.$createdAt,
    }));

  const rated = feedback.filter((item) => item.rating > 0);
  const averageRating = rated.length ? rated.reduce((sum, item) => sum + item.rating, 0) / rated.length : 0;

  return NextResponse.json({ feedback, averageRating, total: feedback.length });
}
