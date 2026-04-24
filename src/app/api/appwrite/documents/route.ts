import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT ?? "";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "";
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY ?? "";

const TABLES_COLLECTION_ID = "tables";
const CATEGORIES_COLLECTION_ID = "categories";
const MENU_ITEMS_COLLECTION_ID = "menu_items";
const SETTINGS_COLLECTION_ID = "settings";
const ORDERS_COLLECTION_ID = "orders";
const PAYMENTS_COLLECTION_ID = "payments";

const READ_ALLOWED_COLLECTIONS = new Set([
  TABLES_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID,
  MENU_ITEMS_COLLECTION_ID,
  SETTINGS_COLLECTION_ID,
  ORDERS_COLLECTION_ID,
]);
const CREATE_ALLOWED_COLLECTIONS = new Set([ORDERS_COLLECTION_ID, PAYMENTS_COLLECTION_ID]);

const SAFE_ORDER_PAYMENT_SWITCH_FIELDS = new Set([
  "payment_method",
  "payment_status",
]);

const ALLOWED_PAYMENT_METHODS = new Set(["UPI", "COUNTER"]);
const ALLOWED_PENDING_PAYMENT_STATUSES = new Set(["UNPAID", "PENDING"]);

const MAX_BODY_SIZE_BYTES = 48 * 1024;
const MAX_QUERY_COUNT = 10;
const MAX_QUERY_LENGTH = 240;

function buildAppwriteHeaders(useApiKey = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": APPWRITE_PROJECT_ID ?? "",
  };

  if (useApiKey && APPWRITE_API_KEY) {
    headers["X-Appwrite-Key"] = APPWRITE_API_KEY;
  }

  return headers;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
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

function normalizeCollectionId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function normalizeDocumentId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeIdentifier(value: unknown, maxLength: number) {
  const cleaned = sanitizeText(value, maxLength);
  if (!cleaned) {
    return "";
  }
  if (!/^[a-zA-Z0-9@._:/-]+$/.test(cleaned)) {
    return "";
  }
  return cleaned;
}

function sanitizeEnum(value: unknown, allowedValues: Set<string>) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toUpperCase();
  return allowedValues.has(normalized) ? normalized : "";
}

function sanitizeAmount(value: unknown, min: number, max: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const rounded = Math.round(parsed * 100) / 100;
  if (rounded < min || rounded > max) {
    return null;
  }
  return rounded;
}

function sanitizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function sanitizeIsoTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function isSameOriginRequest(request: NextRequest) {
  const expectedOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin) {
    return false;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== expectedOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

function hasAcceptableContentType(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().includes("application/json");
}

function isBodyTooLarge(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_BODY_SIZE_BYTES;
}

async function parseJsonBody(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    return body;
  } catch {
    return null;
  }
}

function sanitizeQueryList(values: string[]) {
  if (values.length > MAX_QUERY_COUNT) {
    return null;
  }

  const sanitized: string[] = [];
  for (const value of values) {
    const query = value.trim();
    if (!query || query.length > MAX_QUERY_LENGTH) {
      return null;
    }
    if (!/^[\x20-\x7E]+$/.test(query)) {
      return null;
    }
    sanitized.push(query);
  }

  return sanitized;
}

function extractUpstreamMessage(payload: Record<string, unknown>) {
  if (typeof payload.message === "string") {
    return payload.message;
  }
  if (typeof payload.error === "string") {
    return payload.error;
  }
  return "";
}

function sanitizeUpstreamErrorMessage(status: number, payload: Record<string, unknown>) {
  const message = extractUpstreamMessage(payload).toLowerCase();

  if (
    message.includes("unknown attribute") ||
    message.includes("invalid document structure") ||
    message.includes("attribute not found") ||
    message.includes("invalid type")
  ) {
    return "Invalid document structure.";
  }
  if (message.includes("missing required attribute")) {
    return "Missing required attribute.";
  }
  if (
    message.includes("user_unauthorized") ||
    message.includes("not authorized") ||
    message.includes("missing scope") ||
    status === 401 ||
    status === 403
  ) {
    return "Not authorized.";
  }
  if (message.includes("not found") || status === 404) {
    return "Document not found.";
  }
  if (status >= 500) {
    return "Upstream service unavailable.";
  }
  return "Request failed.";
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function sanitizeOrderCreatePayload(documentData: Record<string, unknown>) {
  const clientId = sanitizeIdentifier(documentData.client_id, 64);
  const tableId = sanitizeIdentifier(documentData.table_id, 64);
  const orderNumber = sanitizeIdentifier(documentData.order_number, 96);
  const subtotal = sanitizeAmount(documentData.subtotal, 0, 1_000_000);
  const totalAmount = sanitizeAmount(documentData.total_amount, 0, 1_000_000);

  if (!clientId || !tableId || !orderNumber || subtotal === null || totalAmount === null) {
    return null;
  }

  const paymentMethod =
    sanitizeEnum(documentData.payment_method, ALLOWED_PAYMENT_METHODS) || "COUNTER";
  const createdAtCustom =
    sanitizeIsoTimestamp(documentData.created_at_custom) || new Date().toISOString();

  return {
    client_id: clientId,
    table_id: tableId,
    order_number: orderNumber,
    status: "PLACED",
    payment_status: "UNPAID",
    payment_method: paymentMethod,
    subtotal,
    total_amount: totalAmount,
    created_at_custom: createdAtCustom,
  } satisfies Record<string, unknown>;
}

function sanitizePaymentCreatePayload(documentData: Record<string, unknown>) {
  const clientId = sanitizeIdentifier(documentData.client_id, 64);
  const orderId = sanitizeIdentifier(documentData.order_id, 64);
  const amount = sanitizeAmount(documentData.amount, 0.01, 1_000_000);
  if (!clientId || !orderId || amount === null) {
    return null;
  }

  const paymentMethod =
    sanitizeEnum(documentData.payment_method, ALLOWED_PAYMENT_METHODS) || "UPI";
  const paymentStatus =
    sanitizeEnum(documentData.payment_status, ALLOWED_PENDING_PAYMENT_STATUSES) || "PENDING";
  const customerMarkedPaid = sanitizeBoolean(documentData.customer_marked_paid) ?? false;
  const verifiedBy =
    sanitizeIdentifier(documentData.verified_by, 64) || "PENDING_CASHIER_CONFIRMATION";

  return {
    client_id: clientId,
    order_id: orderId,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    customer_marked_paid: customerMarkedPaid,
    verified_by: verifiedBy,
    amount,
  } satisfies Record<string, unknown>;
}

function sanitizeOrderPaymentSwitchPatch(documentData: Record<string, unknown>) {
  const keys = Object.keys(documentData);
  if (keys.length === 0) {
    return null;
  }
  if (keys.some((key) => !SAFE_ORDER_PAYMENT_SWITCH_FIELDS.has(key))) {
    return null;
  }

  const paymentMethod = sanitizeEnum(documentData.payment_method, ALLOWED_PAYMENT_METHODS);
  if (!paymentMethod) {
    return null;
  }

  const paymentStatus =
    sanitizeEnum(documentData.payment_status, ALLOWED_PENDING_PAYMENT_STATUSES) || "UNPAID";

  return {
    payment_method: paymentMethod,
    payment_status: paymentStatus,
  } satisfies Record<string, unknown>;
}

function sanitizeCreatePayload(
  collectionId: string,
  documentData: Record<string, unknown>,
) {
  if (collectionId === ORDERS_COLLECTION_ID) {
    return sanitizeOrderCreatePayload(documentData);
  }
  if (collectionId === PAYMENTS_COLLECTION_ID) {
    return sanitizePaymentCreatePayload(documentData);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  const collectionId = normalizeCollectionId(request.nextUrl.searchParams.get("collectionId"));
  if (!collectionId || !READ_ALLOWED_COLLECTIONS.has(collectionId)) {
    return jsonError("Collection is not allowed.", 403);
  }

  const rawQueries = [
    ...request.nextUrl.searchParams.getAll("queries"),
    ...request.nextUrl.searchParams.getAll("queries[]"),
  ];
  const queries = sanitizeQueryList(rawQueries);
  if (!queries) {
    return jsonError("Invalid query parameters.", 400);
  }

  if (
    collectionId === ORDERS_COLLECTION_ID &&
    (queries.length === 0 ||
      !queries.some((query) => query.includes("client_id")) ||
      !queries.some((query) => query.includes("table_id")))
  ) {
    return jsonError("Order read requires client and table filters.", 400);
  }

  const params = new URLSearchParams();
  for (const query of queries) {
    params.append("queries[]", query);
  }

  const upstreamUrl = `${APPWRITE_ENDPOINT}/databases/${encodeURIComponent(
    APPWRITE_DATABASE_ID,
  )}/collections/${encodeURIComponent(collectionId)}/documents${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "GET",
    headers: buildAppwriteHeaders(true),
    cache: "no-store",
  });

  const payload = await parseResponse(upstreamResponse);
  if (!upstreamResponse.ok) {
    return jsonError(
      sanitizeUpstreamErrorMessage(upstreamResponse.status, payload),
      upstreamResponse.status,
    );
  }

  return NextResponse.json(payload, { status: upstreamResponse.status });
}

export async function POST(request: NextRequest) {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  if (!isSameOriginRequest(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403);
  }
  if (!hasAcceptableContentType(request)) {
    return jsonError("Unsupported content type.", 415);
  }
  if (isBodyTooLarge(request)) {
    return jsonError("Payload too large.", 413);
  }

  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON body.", 400);
  }

  const source = body as Record<string, unknown>;
  const collectionId = normalizeCollectionId(source.collectionId);
  const documentData =
    source.documentData && typeof source.documentData === "object"
      ? (source.documentData as Record<string, unknown>)
      : null;

  if (!collectionId || !documentData || !CREATE_ALLOWED_COLLECTIONS.has(collectionId)) {
    return jsonError("Collection write is not allowed.", 403);
  }

  const sanitizedData = sanitizeCreatePayload(collectionId, documentData);
  if (!sanitizedData) {
    return jsonError("Invalid document payload.", 400);
  }

  const upstreamUrl = `${APPWRITE_ENDPOINT}/databases/${encodeURIComponent(
    APPWRITE_DATABASE_ID,
  )}/collections/${encodeURIComponent(collectionId)}/documents`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "POST",
    headers: buildAppwriteHeaders(true),
    body: JSON.stringify({
      documentId: "unique()",
      data: sanitizedData,
    }),
    cache: "no-store",
  });

  const payload = await parseResponse(upstreamResponse);
  if (!upstreamResponse.ok) {
    return jsonError(
      sanitizeUpstreamErrorMessage(upstreamResponse.status, payload),
      upstreamResponse.status,
    );
  }

  return NextResponse.json(payload, { status: upstreamResponse.status });
}

export async function PATCH(request: NextRequest) {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  if (!isSameOriginRequest(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403);
  }
  if (!hasAcceptableContentType(request)) {
    return jsonError("Unsupported content type.", 415);
  }
  if (isBodyTooLarge(request)) {
    return jsonError("Payload too large.", 413);
  }

  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON body.", 400);
  }

  const source = body as Record<string, unknown>;
  const collectionId = normalizeCollectionId(source.collectionId);
  const documentId = normalizeDocumentId(source.documentId);
  const documentData =
    source.documentData && typeof source.documentData === "object"
      ? (source.documentData as Record<string, unknown>)
      : null;

  if (
    !collectionId ||
    collectionId !== ORDERS_COLLECTION_ID ||
    !documentId ||
    !documentData
  ) {
    return jsonError("Document update is not allowed.", 403);
  }

  const sanitizedData = sanitizeOrderPaymentSwitchPatch(documentData);
  if (!sanitizedData) {
    return jsonError("Invalid update payload.", 400);
  }

  const upstreamUrl = `${APPWRITE_ENDPOINT}/databases/${encodeURIComponent(
    APPWRITE_DATABASE_ID,
  )}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(
    documentId,
  )}`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "PATCH",
    headers: buildAppwriteHeaders(true),
    body: JSON.stringify({
      data: sanitizedData,
    }),
    cache: "no-store",
  });

  const payload = await parseResponse(upstreamResponse);
  if (!upstreamResponse.ok) {
    return jsonError(
      sanitizeUpstreamErrorMessage(upstreamResponse.status, payload),
      upstreamResponse.status,
    );
  }

  return NextResponse.json(payload, { status: upstreamResponse.status });
}
