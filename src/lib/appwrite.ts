import { ID, Query } from "appwrite";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "";
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "";
const APPWRITE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ?? "";

const COLLECTION_IDS = {
  users: "users",
  tables: "tables",
  categories: "categories",
  menuItems: "menu_items",
  orders: "orders",
  payments: "payments",
  reports: "reports",
  settings: "settings",
  notifications: "notifications",
};

const SAFE_CLIENT_CREATE_COLLECTIONS = new Set([
  COLLECTION_IDS.orders,
  COLLECTION_IDS.payments,
]);
const SAFE_CLIENT_UPDATE_COLLECTIONS = new Set([COLLECTION_IDS.orders]);

const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  label = "Appwrite proxy request",
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function readProxyError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data?.message || data?.error || `Proxy request failed (${response.status})`;
  } catch {
    return `Proxy request failed (${response.status})`;
  }
}

async function proxyListDocuments(
  collectionId: string,
  queries: string[],
  timeoutMs: number,
) {
  const params = new URLSearchParams();
  params.set("collectionId", collectionId);
  for (const query of queries) {
    params.append("queries", query);
  }

  const response = await withTimeout(
    fetch(`/api/appwrite/documents?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    }),
    timeoutMs,
    `Proxy list ${collectionId}`,
  );

  if (!response.ok) {
    throw new Error(await readProxyError(response));
  }

  return response.json() as Promise<{
    total: number;
    documents: AppwriteDocument[];
  }>;
}

async function proxyCreateDocument(
  collectionId: string,
  documentData: Record<string, unknown>,
  timeoutMs: number,
) {
  const response = await withTimeout(
    fetch("/api/appwrite/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId, documentData }),
      cache: "no-store",
      credentials: "same-origin",
    }),
    timeoutMs,
    `Proxy create ${collectionId}`,
  );

  if (!response.ok) {
    throw new Error(await readProxyError(response));
  }

  return response.json() as Promise<AppwriteDocument>;
}

async function proxyUpdateDocument(
  collectionId: string,
  documentId: string,
  documentData: Record<string, unknown>,
  timeoutMs: number,
) {
  const response = await withTimeout(
    fetch("/api/appwrite/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId, documentId, documentData }),
      cache: "no-store",
      credentials: "same-origin",
    }),
    timeoutMs,
    `Proxy update ${collectionId}`,
  );

  if (!response.ok) {
    throw new Error(await readProxyError(response));
  }

  return response.json() as Promise<AppwriteDocument>;
}

function isIndexOrQueryFailure(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "object" && error && "message" in error
        ? String(error.message).toLowerCase()
        : String(error).toLowerCase();
  return (
    message.includes("index") ||
    message.includes("attribute") ||
    message.includes("query") ||
    message.includes("invalid query")
  );
}

export type AppwriteDocument = {
  $id: string;
  [key: string]: unknown;
};

type ListOptions = {
  pageSize?: number;
  maxDocs?: number;
  queries?: string[];
  timeoutMs?: number;
};

export async function fetchAllDocuments(collectionId: string, options?: ListOptions) {
  const documents: AppwriteDocument[] = [];
  let cursorAfter: string | null = null;
  const pageSize = options?.pageSize ?? 100;
  const maxDocs = options?.maxDocs ?? 2000;
  const baseQueries = options?.queries ?? [];
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  for (;;) {
    const queries = [...baseQueries, Query.limit(pageSize)];
    if (cursorAfter) {
      queries.push(Query.cursorAfter(cursorAfter));
    }

    try {
      const response = await proxyListDocuments(collectionId, queries, timeoutMs);
      const currentDocs = response.documents as AppwriteDocument[];
      documents.push(...currentDocs);

      if (currentDocs.length < pageSize) {
        break;
      }

      const lastDoc = currentDocs.at(-1);
      if (!lastDoc?.$id) {
        break;
      }

      cursorAfter = lastDoc.$id;
      if (documents.length >= maxDocs) {
        break;
      }
    } catch (error) {
      const canUseBroadFallback =
        collectionId !== COLLECTION_IDS.orders &&
        collectionId !== COLLECTION_IDS.payments;
      if (baseQueries.length > 0 && canUseBroadFallback && isIndexOrQueryFailure(error)) {
        return fetchAllDocuments(collectionId, { ...options, queries: [] });
      }
      throw error;
    }
  }

  return documents;
}

export async function createDocument(
  collectionId: string,
  documentData: Record<string, unknown>,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  if (!SAFE_CLIENT_CREATE_COLLECTIONS.has(collectionId)) {
    throw new Error("Collection create is not allowed from client flow.");
  }
  return proxyCreateDocument(collectionId, documentData, timeoutMs);
}

export async function createDocumentWithFallback(
  collectionId: string,
  payloadCandidates: Record<string, unknown>[],
) {
  let latestError: unknown = null;

  for (const payload of payloadCandidates) {
    try {
      return await createDocument(collectionId, payload);
    } catch (error) {
      latestError = error;
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message).toLowerCase()
          : "";

      const shouldTryNextPayload =
        /unknown attribute|invalid document structure|attribute not found|invalid type|missing required attribute/i.test(
          message,
        );

      if (!shouldTryNextPayload) {
        throw error;
      }
    }
  }

  throw latestError ?? new Error("Unable to create document");
}

export async function updateDocument(
  collectionId: string,
  documentId: string,
  documentData: Record<string, unknown>,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  if (!SAFE_CLIENT_UPDATE_COLLECTIONS.has(collectionId)) {
    throw new Error("Collection update is not allowed from client flow.");
  }
  return proxyUpdateDocument(collectionId, documentId, documentData, timeoutMs);
}

export async function updateDocumentWithFallback(
  collectionId: string,
  documentId: string,
  payloadCandidates: Record<string, unknown>[],
) {
  let latestError: unknown = null;

  for (const payload of payloadCandidates) {
    try {
      return await updateDocument(collectionId, documentId, payload);
    } catch (error) {
      latestError = error;
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message).toLowerCase()
          : "";

      const shouldTryNextPayload =
        /unknown attribute|invalid document structure|attribute not found|invalid type|missing required attribute/i.test(
          message,
        );

      if (!shouldTryNextPayload) {
        throw error;
      }
    }
  }

  throw latestError ?? new Error("Unable to update document");
}

function extractFileId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const directMatch = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]{5,})$/);
  if (directMatch) {
    return directMatch[1];
  }

  const filePathMatch = trimmed.match(/\/files\/([^/]+)\//i);
  if (filePathMatch) {
    return decodeURIComponent(filePathMatch[1]);
  }

  const queryMatch = trimmed.match(/[?&]fileId=([^&]+)/i);
  if (queryMatch) {
    return decodeURIComponent(queryMatch[1]);
  }

  return "";
}

export function buildBucketFileViewUrl(fileId: string, bucketId = APPWRITE_BUCKET_ID) {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !bucketId) {
    return "";
  }

  const encodedFileId = encodeURIComponent(fileId);
  const encodedBucketId = encodeURIComponent(bucketId);
  const encodedProjectId = encodeURIComponent(APPWRITE_PROJECT_ID);

  return `${APPWRITE_ENDPOINT}/storage/buckets/${encodedBucketId}/files/${encodedFileId}/view?project=${encodedProjectId}`;
}

export function resolveAssetUrl(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
      return trimmed;
    }
    const fileId = extractFileId(trimmed);
    return fileId ? buildBucketFileViewUrl(fileId) : "";
  }

  if (typeof value === "object" && value) {
    const objectValue = value as Record<string, unknown>;
    if (typeof objectValue.$id === "string") {
      return buildBucketFileViewUrl(objectValue.$id);
    }
    if (typeof objectValue.fileId === "string") {
      return buildBucketFileViewUrl(objectValue.fileId);
    }
    if (typeof objectValue.id === "string") {
      return buildBucketFileViewUrl(objectValue.id);
    }
  }

  return "";
}

export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: APPWRITE_DATABASE_ID,
  bucketId: APPWRITE_BUCKET_ID,
  collections: COLLECTION_IDS,
};

export { ID, Query };
