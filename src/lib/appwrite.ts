const COLLECTION_IDS = {
  users: "users",
  tables: "tables",
  categories: "categories",
  menuItems: "menu_items",
  addonGroups: "addon_groups",
  addonOptions: "addon_options",
  itemAddonMap: "item_addon_map",
  offers: "offers",
  orders: "orders",
  payments: "payments",
  tableSessions: "table_sessions",
  printJobs: "print_jobs",
  reports: "reports",
  settings: "settings",
  notifications: "notifications",
};

const SAFE_CLIENT_CREATE_COLLECTIONS = new Set([
  COLLECTION_IDS.orders,
  COLLECTION_IDS.payments,
  COLLECTION_IDS.tableSessions,
  COLLECTION_IDS.printJobs,
]);
const SAFE_CLIENT_UPDATE_COLLECTIONS = new Set([
  COLLECTION_IDS.orders,
  COLLECTION_IDS.tableSessions,
]);

const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

class ProxyAppwriteError extends Error {
  code: number;
  type: string;
  response: unknown;

  constructor(message: string, code: number, type: string, response: unknown) {
    super(message);
    this.name = "ProxyAppwriteError";
    this.code = code;
    this.type = type;
    this.response = response;
  }
}

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
  let payload: Record<string, unknown> = {};
  try {
    const data = (await response.json()) as unknown;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      payload = data as Record<string, unknown>;
    }
  } catch {
    payload = {};
  }

  const message =
    typeof payload.message === "string"
      ? payload.message
      : typeof payload.error === "string"
        ? payload.error
        : `Proxy request failed (${response.status})`;
  const code =
    typeof payload.code === "number" && Number.isFinite(payload.code)
      ? payload.code
      : response.status;
  const type = typeof payload.type === "string" ? payload.type : "";
  const errorResponse = Object.hasOwn(payload, "response") ? payload.response : payload;

  return new ProxyAppwriteError(message, code, type, errorResponse);
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
    throw await readProxyError(response);
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
    throw await readProxyError(response);
  }

  return response.json() as Promise<AppwriteDocument>;
}

async function proxyUpdateDocument(
  collectionId: string,
  documentId: string,
  documentData: Record<string, unknown>,
  timeoutMs: number,
  scope?: UpdateScope,
) {
  const body: Record<string, unknown> = { collectionId, documentId, documentData };
  if (scope?.clientId) {
    body.clientId = scope.clientId;
  }
  if (scope?.tableId) {
    body.tableId = scope.tableId;
  }
  if (scope?.lockedBy) {
    body.lockedBy = scope.lockedBy;
  }

  const response = await withTimeout(
    fetch("/api/appwrite/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
    }),
    timeoutMs,
    `Proxy update ${collectionId}`,
  );

  if (!response.ok) {
    throw await readProxyError(response);
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

type UpdateScope = {
  clientId?: string;
  tableId?: string;
  lockedBy?: string;
};

type UpdateOptions = {
  timeoutMs?: number;
  scope?: UpdateScope;
};

function escapeQueryString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function serializeQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeQueryValue(entry)).join(",")}]`;
  }

  if (typeof value === "string") {
    return `"${escapeQueryString(value)}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  return `"${escapeQueryString(String(value ?? ""))}"`;
}

const QueryBuilder = {
  equal(attribute: string, values: unknown[] | unknown) {
    const normalizedValues = Array.isArray(values) ? values : [values];
    return `equal(${serializeQueryValue(attribute)},${serializeQueryValue(normalizedValues)})`;
  },
  orderDesc(attribute: string) {
    return `orderDesc(${serializeQueryValue(attribute)})`;
  },
  limit(value: number) {
    const normalized = Number.isFinite(value) ? Math.floor(value) : 0;
    const safe = Math.min(500, Math.max(1, normalized));
    return `limit(${safe})`;
  },
  cursorAfter(documentId: string) {
    return `cursorAfter(${serializeQueryValue(documentId)})`;
  },
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
        collectionId !== COLLECTION_IDS.payments &&
        collectionId !== COLLECTION_IDS.tableSessions &&
        collectionId !== COLLECTION_IDS.printJobs &&
        collectionId !== COLLECTION_IDS.notifications;
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
      if (!isSchemaRetryableError(error)) {
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
  scope?: UpdateScope,
) {
  if (!SAFE_CLIENT_UPDATE_COLLECTIONS.has(collectionId)) {
    throw new Error("Collection update is not allowed from client flow.");
  }
  return proxyUpdateDocument(collectionId, documentId, documentData, timeoutMs, scope);
}

export async function updateDocumentWithFallback(
  collectionId: string,
  documentId: string,
  payloadCandidates: Record<string, unknown>[],
  options?: UpdateOptions,
) {
  let latestError: unknown = null;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  for (const payload of payloadCandidates) {
    try {
      return await updateDocument(collectionId, documentId, payload, timeoutMs, options?.scope);
    } catch (error) {
      latestError = error;
      if (!isSchemaRetryableError(error)) {
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

function isSchemaRetryableError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : "";

  return /unknown attribute|invalid document structure|attribute not found|invalid type|missing required attribute/i.test(
    message,
  );
}

function normalizeStorageId(value: string) {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{5,127}$/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

type AssetReference = {
  fileId: string;
  bucketId: string;
};

function extractAssetReference(value: string): AssetReference | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const bucketPathMatch = trimmed.match(/\/storage\/buckets\/([^/]+)\/files\/([^/?#]+)/i);
  if (bucketPathMatch) {
    const bucketId = normalizeStorageId(decodeURIComponent(bucketPathMatch[1]));
    const fileId = normalizeStorageId(decodeURIComponent(bucketPathMatch[2]));
    if (bucketId && fileId) {
      return { fileId, bucketId };
    }
  }

  try {
    const parsed = new URL(trimmed, "https://cafeluxe.local");
    const fileId = normalizeStorageId(parsed.searchParams.get("fileId") ?? "");
    const bucketId = normalizeStorageId(parsed.searchParams.get("bucketId") ?? "");
    if (fileId) {
      return { fileId, bucketId };
    }
  } catch {
    // Ignore URL parsing issues and continue with other extraction paths.
  }

  const directFileId = normalizeStorageId(extractFileId(trimmed));
  if (directFileId) {
    return { fileId: directFileId, bucketId: "" };
  }

  return null;
}

export function buildBucketFileViewUrl(fileId: string, bucketId = "") {
  const normalizedFileId = normalizeStorageId(fileId);
  const normalizedBucketId = normalizeStorageId(bucketId);
  if (!normalizedFileId) {
    return "";
  }

  const params = new URLSearchParams();
  params.set("fileId", normalizedFileId);
  if (normalizedBucketId) {
    params.set("bucketId", normalizedBucketId);
  }

  return `/api/appwrite/assets?${params.toString()}`;
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

    if (trimmed.startsWith("data:")) {
      return trimmed;
    }

    const extracted = extractAssetReference(trimmed);
    if (extracted?.fileId) {
      return buildBucketFileViewUrl(extracted.fileId, extracted.bucketId);
    }

    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("/")) {
      return trimmed;
    }

    return "";
  }

  if (typeof value === "object" && value) {
    const objectValue = value as Record<string, unknown>;
    const objectBucketId =
      (typeof objectValue.bucketId === "string" && objectValue.bucketId) ||
      (typeof objectValue.bucket_id === "string" && objectValue.bucket_id) ||
      (typeof objectValue.bucket === "string" && objectValue.bucket) ||
      "";

    if (typeof objectValue.$id === "string") {
      return buildBucketFileViewUrl(objectValue.$id, objectBucketId);
    }
    if (typeof objectValue.fileId === "string") {
      return buildBucketFileViewUrl(objectValue.fileId, objectBucketId);
    }
    if (typeof objectValue.id === "string") {
      return buildBucketFileViewUrl(objectValue.id, objectBucketId);
    }
  }

  return "";
}

export const appwriteConfig = {
  collections: COLLECTION_IDS,
};

export const Query = QueryBuilder;
