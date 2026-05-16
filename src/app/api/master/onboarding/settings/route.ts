import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Query } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "cafeluxe_master_auth";

function clean(value: string | undefined) {
  const text = String(value ?? "").trim();
  const quoted = (text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"));
  return quoted ? text.slice(1, -1).trim() : text;
}

const endpoint = clean(process.env.APPWRITE_ENDPOINT);
const projectId = clean(process.env.APPWRITE_PROJECT_ID);
const apiKey = clean(process.env.APPWRITE_API_KEY);
const databaseId = clean(process.env.APPWRITE_DATABASE_ID) || "trustfirst-main-db";
const settingsCollectionId = clean(process.env.APPWRITE_SETTINGS_COLLECTION_ID) || "settings";

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function safeText(value: unknown, max = 300) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "ok") {
    return json("Master login required.", 401);
  }

  if (!endpoint || !projectId || !apiKey) {
    return json("Server Appwrite config missing.", 500);
  }

  const body = await request.json().catch(() => null);
  const clientId = safeText(body?.clientId, 64);
  const logoUrl = safeText(body?.logoUrl, 500);

  if (!clientId || !logoUrl) {
    return json("clientId and logoUrl are required.", 400);
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const existing = await databases.listDocuments({
    databaseId,
    collectionId: settingsCollectionId,
    queries: [
      Query.equal("client_id", [clientId]),
      Query.equal("key", ["logo_url"]),
      Query.limit(1),
    ],
  });

  const current = existing.documents[0];

  const saved = current
    ? await databases.updateDocument({
        databaseId,
        collectionId: settingsCollectionId,
        documentId: current.$id,
        data: { value: logoUrl },
      })
    : await databases.createDocument({
        databaseId,
        collectionId: settingsCollectionId,
        documentId: ID.unique(),
        data: { client_id: clientId, key: "logo_url", value: logoUrl },
      });

  return NextResponse.json({ ok: true, setting: saved });
}
