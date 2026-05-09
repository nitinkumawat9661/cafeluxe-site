import { NextResponse } from "next/server";
import { Client, Databases, Query as ServerQuery } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT?.trim() ?? "";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID?.trim() ?? "";
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID?.trim() ?? "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY?.trim() ?? "";
const TABLES_COLLECTION_ID = "tables";
const TABLE_SESSIONS_COLLECTION_ID = "table_sessions";
const ACTIVE_SESSION_STATUSES = ["active", "payment_pending"];

function noStoreJson(payload: Record<string, unknown>, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Netlify-CDN-Cache-Control": "no-store",
      Pragma: "no-cache",
      Expires: "0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function jsonError(message: string, status: number) {
  return noStoreJson({ message, code: status }, status);
}

function ensureServerConfig() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_DATABASE_ID) {
    return jsonError(
      "Server Appwrite configuration is missing (APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_DATABASE_ID).",
      500,
    );
  }
  if (!APPWRITE_API_KEY) {
    return jsonError("Server Appwrite API key is missing (APPWRITE_API_KEY).", 500);
  }
  return null;
}

function createServerClient() {
  return new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
}

async function parseJsonResponse(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function listAllDocuments(
  databases: Databases,
  collectionId: string,
  queries: Array<ReturnType<typeof ServerQuery.equal> | ReturnType<typeof ServerQuery.limit> | ReturnType<typeof ServerQuery.offset>> = [],
) {
  const documents: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments({
      databaseId: APPWRITE_DATABASE_ID,
      collectionId,
      queries: [...queries, ServerQuery.limit(100), ServerQuery.offset(offset)],
    });

    const pageDocs = (response.documents as unknown) as Record<string, unknown>[];
    documents.push(...pageDocs);

    if (pageDocs.length < 100) {
      break;
    }

    offset += 100;
  }

  return documents;
}

export async function POST() {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  const client = createServerClient();
  const databases = new Databases(client);

  try {
    const activeSessionResponse = await databases.listDocuments({
      databaseId: APPWRITE_DATABASE_ID,
      collectionId: TABLE_SESSIONS_COLLECTION_ID,
      queries: [ServerQuery.equal("status", ACTIVE_SESSION_STATUSES), ServerQuery.limit(1)],
    });

    const activeSessions = (activeSessionResponse.documents as unknown) as Record<string, unknown>[];
    if (activeSessions.length > 0) {
      return jsonError(
        "Some tables have running bills. Close them before disabling all tables.",
        409,
      );
    }
  } catch (error) {
    return jsonError("Unable to verify table session status.", 502);
  }

  let tableDocs: Record<string, unknown>[];
  try {
    tableDocs = await listAllDocuments(databases, TABLES_COLLECTION_ID);
  } catch (error) {
    return jsonError("Unable to read tables collection.", 502);
  }

  const updatedTableIds: string[] = [];

  for (const doc of tableDocs) {
    const documentId = typeof doc.$id === "string" ? doc.$id : "";
    if (!documentId) {
      continue;
    }

    const payload: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(doc, "is_active") ||
      Object.prototype.hasOwnProperty.call(doc, "isActive") ||
      Object.prototype.hasOwnProperty.call(doc, "active") ||
      Object.prototype.hasOwnProperty.call(doc, "enabled")) {
      payload.is_active = false;
    } else {
      payload.is_active = false;
    }

    if (Object.prototype.hasOwnProperty.call(doc, "status")) {
      payload.status = "inactive";
    }
    if (Object.prototype.hasOwnProperty.call(doc, "table_status")) {
      payload.table_status = "inactive";
    }
    if (Object.prototype.hasOwnProperty.call(doc, "tableStatus")) {
      payload.tableStatus = "inactive";
    }

    try {
      await databases.updateDocument({
        databaseId: APPWRITE_DATABASE_ID,
        collectionId: TABLES_COLLECTION_ID,
        documentId,
        data: payload,
      });
      updatedTableIds.push(documentId);
    } catch (error) {
      console.warn("Unable to update table document during disable-all operation.", { documentId, error });
    }
  }

  return noStoreJson({ updated_table_ids: updatedTableIds, updated_table_count: updatedTableIds.length }, 200);
}
