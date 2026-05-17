import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "trustfirst-main-db";

function text(value: unknown, max = 500) {
  return String(value ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: NextRequest) {
  if (!endpoint || !projectId || !apiKey) return json("Server Appwrite config missing.", 500);

  const body = await request.json().catch(() => null);
  const clientId = text(body?.clientId, 64);
  const tableNo = text(body?.tableNo, 20);
  const name = text(body?.name, 80) || "Guest";
  const message = text(body?.message, 500);
  const orderId = text(body?.orderId, 80);
  const rating = Math.max(1, Math.min(5, Number(body?.rating || 0)));

  if (!clientId) return json("clientId is required.", 400);
  if (!tableNo) return json("tableNo is required.", 400);
  if (!rating) return json("rating is required.", 400);
  if (message.length < 3) return json("Feedback message is too short.", 400);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const payload = {
    type: "feedback",
    title: `${rating}/5 feedback from Table ${tableNo}`,
    text: message,
    message,
    rating,
    customerName: name,
    source: `Table ${tableNo}`,
    tableNo,
    orderId,
    submittedAt: new Date().toISOString(),
  };

  const doc = await databases.createDocument({
    databaseId,
    collectionId: "notifications",
    documentId: ID.unique(),
    data: {
      client_id: clientId,
      type: "feedback",
      target_role: "master",
      payload: JSON.stringify(payload),
      read: false,
    },
  });

  return NextResponse.json({ ok: true, id: doc.$id });
}
