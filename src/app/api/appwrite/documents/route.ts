import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ??
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??
  "trustfirst-core";
const APPWRITE_DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ??
  "trustfirst-main-db";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY ?? "";

const TABLES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TABLES ?? "tables";
const CATEGORIES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_CATEGORIES ?? "categories";
const MENU_ITEMS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_MENU_ITEMS ?? "menu_items";
const SETTINGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS ?? "settings";
const ORDERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ORDERS ?? "orders";
const PAYMENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_PAYMENTS ?? "payments";

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
  "updated_at_custom",
]);

const ALLOWED_PAYMENT_METHODS = new Set(["UPI", "COUNTER"]);
const ALLOWED_PENDING_PAYMENT_STATUSES = new Set(["UNPAID", "PENDING"]);

const MAX_BODY_SIZE_BYTES = 48 * 1024;
const MAX_QUERY_COUNT = 10;
const MAX_QUERY_LENGTH = 240;
const MAX_ORDER_ITEMS = 40;
const MAX_ORDER_MODIFIERS = 16;

function buildAppwriteHeaders(useApiKey = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": APPWRITE_PROJECT_ID,
  };

  if (useApiKey && APPWRITE_API_KEY) {
    headers["X-Appwrite-Key"] = APPWRITE_API_KEY;
  }

  return headers;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
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

function sanitizeQuantity(value: unknown, min: number, max: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const integer = Math.floor(parsed);
  if (integer < min || integer > max) {
    return null;
  }
  return integer;
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

function hashConvenienceIdentifier(value: string) {
  const digest = createHash("sha256").update(value).digest("hex");
  return `h_${digest.slice(0, 48)}`;
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

function sanitizeOrderItems(itemsValue: unknown) {
  if (!Array.isArray(itemsValue)) {
    return [];
  }

  const sanitizedItems: Record<string, unknown>[] = [];
  for (const entry of itemsValue.slice(0, MAX_ORDER_ITEMS)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const source = entry as Record<string, unknown>;
    const itemId = sanitizeIdentifier(source.item_id, 72);
    const quantity = sanitizeQuantity(source.quantity, 1, 25);
    const baseUnitPrice = sanitizeAmount(source.base_unit_price, 0, 1_000_000);
    const unitPrice = sanitizeAmount(source.unit_price, 0, 1_000_000);
    const modifiersTotalPerUnit = sanitizeAmount(source.modifiers_total_per_unit, 0, 1_000_000);
    const itemName = sanitizeText(source.item_name, 120);
    const itemNameHi = sanitizeText(source.item_name_hi, 120);

    if (!itemId || !quantity || unitPrice === null) {
      continue;
    }

    const modifiers: Record<string, unknown>[] = [];
    if (Array.isArray(source.modifiers)) {
      for (const modifier of source.modifiers.slice(0, MAX_ORDER_MODIFIERS)) {
        if (!modifier || typeof modifier !== "object") {
          continue;
        }
        const rawModifier = modifier as Record<string, unknown>;
        const modifierId = sanitizeIdentifier(rawModifier.id, 64);
        const modifierLabel = sanitizeText(rawModifier.label, 100);
        const modifierPrice = sanitizeAmount(rawModifier.price, 0, 1_000_000);
        if (!modifierId || !modifierLabel || modifierPrice === null) {
          continue;
        }
        modifiers.push({
          id: modifierId,
          label: modifierLabel,
          price: modifierPrice,
        });
      }
    }

    const computedLineTotal = Math.round(unitPrice * quantity * 100) / 100;
    const sanitizedItem: Record<string, unknown> = {
      item_id: itemId,
      quantity,
      unit_price: unitPrice,
      line_total: computedLineTotal,
      modifiers_total_per_unit: modifiersTotalPerUnit ?? 0,
      modifiers,
    };
    if (itemName) {
      sanitizedItem.item_name = itemName;
    }
    if (itemNameHi) {
      sanitizedItem.item_name_hi = itemNameHi;
    }
    if (baseUnitPrice !== null) {
      sanitizedItem.base_unit_price = baseUnitPrice;
    }
    sanitizedItems.push(sanitizedItem);
  }

  return sanitizedItems;
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
  const tableNo = sanitizeIdentifier(documentData.table_no, 48);
  const createdAtCustom = sanitizeIsoTimestamp(documentData.created_at_custom);
  const instructions = sanitizeText(
    documentData.kitchen_instructions ?? documentData.instructions ?? documentData.notes,
    240,
  );
  const customerBrowserId = sanitizeIdentifier(documentData.customer_browser_id, 128);
  const items = sanitizeOrderItems(documentData.items);

  const sanitized: Record<string, unknown> = {
    client_id: clientId,
    table_id: tableId,
    order_number: orderNumber,
    status: "PLACED",
    payment_status: "UNPAID",
    payment_method: paymentMethod,
    subtotal,
    total_amount: totalAmount,
  };
  if (tableNo) {
    sanitized.table_no = tableNo;
  }
  if (createdAtCustom) {
    sanitized.created_at_custom = createdAtCustom;
  }
  if (instructions) {
    sanitized.kitchen_instructions = instructions;
  }
  if (customerBrowserId) {
    sanitized.customer_browser_id = hashConvenienceIdentifier(customerBrowserId);
  }
  if (items.length > 0) {
    sanitized.items = items;
  }

  return sanitized;
}

function sanitizePaymentCreatePayload(documentData: Record<string, unknown>) {
  const orderId = sanitizeIdentifier(documentData.order_id, 64);
  const amount = sanitizeAmount(documentData.amount, 0.01, 1_000_000);
  if (!orderId || amount === null) {
    return null;
  }

  const paymentMethod =
    sanitizeEnum(documentData.payment_method, ALLOWED_PAYMENT_METHODS) || "UPI";
  const clientId = sanitizeIdentifier(documentData.client_id, 64);
  const tableId = sanitizeIdentifier(documentData.table_id, 64);
  const tableNo = sanitizeIdentifier(documentData.table_no, 48);
  const createdAt = sanitizeIsoTimestamp(documentData.created_at);

  const sanitized: Record<string, unknown> = {
    order_id: orderId,
    amount,
    payment_method: paymentMethod,
    status: "PENDING",
    payment_status: "UNPAID",
  };
  if (clientId) {
    sanitized.client_id = clientId;
  }
  if (tableId) {
    sanitized.table_id = tableId;
  }
  if (tableNo) {
    sanitized.table_no = tableNo;
  }
  if (createdAt) {
    sanitized.created_at = createdAt;
  }

  return sanitized;
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
  const updatedAtCustom =
    sanitizeIsoTimestamp(documentData.updated_at_custom) || new Date().toISOString();

  return {
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    updated_at_custom: updatedAtCustom,
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
    headers: {
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
    },
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
    headers: buildAppwriteHeaders(),
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

  const canUsePrivilegedPatch = !!APPWRITE_API_KEY;
  const upstreamResponse = await fetch(upstreamUrl, {
    method: "PATCH",
    headers: buildAppwriteHeaders(canUsePrivilegedPatch),
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
