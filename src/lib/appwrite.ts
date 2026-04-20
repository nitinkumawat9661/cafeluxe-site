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
      await account.get();
      return;
    } catch {
      try {
        await account.createAnonymousSession();
      } catch (sessionError) {
        const message =
          sessionError && typeof sessionError === "object" && "message" in sessionError
            ? String(sessionError.message).toLowerCase()
            : "";
        const canIgnore = message.includes("already") && message.includes("session");
        if (!canIgnore) {
          throw sessionError;
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
};

export async function fetchAllDocuments(collectionId: string, options?: ListOptions) {
  await ensureSessionIfPossible();
  const databases = getDatabases();
  const documents: AppwriteDocument[] = [];
  let cursorAfter: string | null = null;
  const pageSize = options?.pageSize ?? 100;
  const maxDocs = options?.maxDocs ?? 2000;
  const baseQueries = options?.queries ?? [];

  for (;;) {
    const queries = [...baseQueries, Query.limit(pageSize)];
    if (cursorAfter) {
      queries.push(Query.cursorAfter(cursorAfter));
    }

    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      collectionId,
      queries,
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
  }

  return documents;
}

export async function createDocument(
  collectionId: string,
  documentData: Record<string, unknown>,
) {
  await ensureSessionIfPossible();
  const databases = getDatabases();

  return databases.createDocument(
    APPWRITE_DATABASE_ID,
    collectionId,
    ID.unique(),
    documentData,
  );
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
