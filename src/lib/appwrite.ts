import { Account, Client, Databases, ID, Query, Storage } from "appwrite";

const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "trustfirst-core";
const APPWRITE_DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "trustfirst-main-db";
const APPWRITE_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ?? "restaurant-assets";

const COLLECTION_IDS = {
  users: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USERS ?? "users",
  tables: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TABLES ?? "tables",
  categories: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_CATEGORIES ?? "categories",
  menuItems: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_MENU_ITEMS ?? "menu_items",
  orders: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ORDERS ?? "orders",
  payments: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_PAYMENTS ?? "payments",
  reports: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_REPORTS ?? "reports",
  settings: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS ?? "settings",
  notifications:
    process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_NOTIFICATIONS ?? "notifications",
};

let databasesInstance: Databases | null = null;
let storageInstance: Storage | null = null;
let accountInstance: Account | null = null;
let sessionReadyPromise: Promise<void> | null = null;
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

function getClient() {
  return new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
}

function getDatabases() {
  if (databasesInstance) {
    return databasesInstance;
  }

  const client = getClient();

  databasesInstance = new Databases(client);
  return databasesInstance;
}

function getStorage() {
  if (storageInstance) {
    return storageInstance;
  }

  const client = getClient();

  storageInstance = new Storage(client);
  return storageInstance;
}

function getAccount() {
  if (accountInstance) {
    return accountInstance;
  }

  const client = getClient();
  accountInstance = new Account(client);
  return accountInstance;
}

function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  label = "Appwrite request",
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

function isNetworkTransportError(error: unknown) {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "object" && "message" in error
        ? String(error.message).toLowerCase()
        : String(error).toLowerCase();

  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("cors") ||
    message.includes("fetch failed") ||
    message.includes("load failed")
  );
}

function isPermissionError(error: unknown) {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "object" && "message" in error
        ? String(error.message).toLowerCase()
        : String(error).toLowerCase();

  return (
    message.includes("not authorized") ||
    message.includes("user_unauthorized") ||
    message.includes("missing scope") ||
    message.includes("permission denied") ||
    message.includes("code: 401") ||
    message.includes("401")
  );
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
    }),
    timeoutMs,
    `Proxy update ${collectionId}`,
  );

  if (!response.ok) {
    throw new Error(await readProxyError(response));
  }

  return response.json() as Promise<AppwriteDocument>;
}

async function ensureSessionIfPossible() {
  if (typeof window === "undefined") {
    return;
  }

  if (sessionReadyPromise) {
    return sessionReadyPromise;
  }

  sessionReadyPromise = (async () => {
    const account = getAccount();

    try {
      await withTimeout(account.get(), 8000, "Session check");
      return;
    } catch (error) {
      const isTimeout =
        error instanceof Error && error.message.toLowerCase().includes("session check timed out");
      if (isTimeout) {
        console.warn("Appwrite session check timed out; attempting to continue...");
        return;
      }

      try {
        await withTimeout(
          account.createAnonymousSession(),
          8000,
          "Anonymous session creation",
        );
      } catch (sessionError) {
        const message =
          sessionError && typeof sessionError === "object" && "message" in sessionError
            ? String(sessionError.message).toLowerCase()
            : "";
        const canIgnore =
          (message.includes("already") && message.includes("session")) ||
          message.includes("user_unauthorized") ||
          message.includes("not authorized") ||
          message.includes("origin") ||
          message.includes("domain") ||
          message.includes("timed out") ||
          message.includes("failed to fetch") ||
          message.includes("network") ||
          message.includes("cors");

        if (!canIgnore) {
          console.error("Appwrite anonymous session creation failed:", sessionError);
        }
      }
    }
  })();

  return sessionReadyPromise;
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
  await ensureSessionIfPossible();
  const databases = getDatabases();
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
      const response = await withTimeout(
        databases.listDocuments(APPWRITE_DATABASE_ID, collectionId, queries),
        timeoutMs,
        `List ${collectionId}`,
      );

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
      if (typeof window !== "undefined" && isNetworkTransportError(error)) {
        const proxyResponse = await proxyListDocuments(collectionId, queries, timeoutMs);
        const currentDocs = proxyResponse.documents as AppwriteDocument[];
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
        continue;
      }

      const message = error && typeof error === "object" && "message" in error ? String(error.message).toLowerCase() : "";
      const isIndexError = message.includes("index") || message.includes("attribute") || message.includes("query");

      if (isIndexError && baseQueries.length > 0) {
        console.warn(`Query failed for ${collectionId} due to missing index or attribute. Retrying without filters.`);
        // Fallback: try fetching without filters if the filtered query failed
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
  await ensureSessionIfPossible();
  const databases = getDatabases();

  try {
    return await withTimeout(
      databases.createDocument(APPWRITE_DATABASE_ID, collectionId, ID.unique(), documentData),
      timeoutMs,
      `Create ${collectionId}`,
    );
  } catch (error) {
    if (typeof window !== "undefined" && isNetworkTransportError(error)) {
      return proxyCreateDocument(collectionId, documentData, timeoutMs);
    }
    throw error;
  }
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
        /unknown attribute|invalid document structure|attribute not found|invalid type/i.test(
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
  await ensureSessionIfPossible();
  const databases = getDatabases();

  try {
    return await withTimeout(
      databases.updateDocument(APPWRITE_DATABASE_ID, collectionId, documentId, documentData),
      timeoutMs,
      `Update ${collectionId}`,
    );
  } catch (error) {
    if (
      typeof window !== "undefined" &&
      (isNetworkTransportError(error) || isPermissionError(error))
    ) {
      return proxyUpdateDocument(collectionId, documentId, documentData, timeoutMs);
    }
    throw error;
  }
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
        /unknown attribute|invalid document structure|attribute not found|invalid type/i.test(
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

export { getStorage, ID, Query };
