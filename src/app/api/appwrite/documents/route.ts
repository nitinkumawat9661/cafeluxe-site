import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeEnvValue(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  const quoteWrapped =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const angleWrapped = trimmed.startsWith("<") && trimmed.endsWith(">");

  const unwrapped = quoteWrapped || angleWrapped ? trimmed.slice(1, -1).trim() : trimmed;
  return unwrapped;
}

const RAW_APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT ?? "";
const RAW_APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "";
const RAW_APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "";
const RAW_WEB_ADMIN_APPROVAL_PIN = process.env.WEB_ADMIN_APPROVAL_PIN ?? "";

const APPWRITE_ENDPOINT = normalizeEnvValue(RAW_APPWRITE_ENDPOINT);
const APPWRITE_PROJECT_ID = normalizeEnvValue(RAW_APPWRITE_PROJECT_ID);
const APPWRITE_DATABASE_ID = normalizeEnvValue(RAW_APPWRITE_DATABASE_ID);
const APPWRITE_API_KEY = normalizeEnvValue(process.env.APPWRITE_API_KEY);
const WEB_ADMIN_APPROVAL_PIN = normalizeEnvValue(RAW_WEB_ADMIN_APPROVAL_PIN);

const TABLES_COLLECTION_ID = "tables";
const CATEGORIES_COLLECTION_ID = "categories";
const MENU_ITEMS_COLLECTION_ID = "menu_items";
const ADDON_GROUPS_COLLECTION_ID = "addon_groups";
const ADDON_OPTIONS_COLLECTION_ID = "addon_options";
const ITEM_ADDON_MAP_COLLECTION_ID = "item_addon_map";
const OFFERS_COLLECTION_ID = "offers";
const SETTINGS_COLLECTION_ID = "settings";
const ORDERS_COLLECTION_ID = "orders";
const PAYMENTS_COLLECTION_ID = "payments";

const READ_ALLOWED_COLLECTIONS = new Set([
  TABLES_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID,
  MENU_ITEMS_COLLECTION_ID,
  ADDON_GROUPS_COLLECTION_ID,
  ADDON_OPTIONS_COLLECTION_ID,
  ITEM_ADDON_MAP_COLLECTION_ID,
  OFFERS_COLLECTION_ID,
  SETTINGS_COLLECTION_ID,
  ORDERS_COLLECTION_ID,
]);
const CREATE_ALLOWED_COLLECTIONS = new Set([ORDERS_COLLECTION_ID, PAYMENTS_COLLECTION_ID]);
const DELETE_ALLOWED_COLLECTIONS = new Set([ORDERS_COLLECTION_ID]);

const SAFE_ORDER_PAYMENT_SWITCH_FIELDS = new Set([
  "payment_method",
  "payment_status",
]);
const SAFE_ORDER_UTR_SUBMISSION_FIELDS = new Set([
  "payment_method",
  "payment_status",
  "utr_number",
]);
const SAFE_ORDER_ADMIN_APPROVAL_FIELDS = new Set(["payment_status"]);

const ALLOWED_PAYMENT_METHODS = new Set(["UPI", "COUNTER"]);
const ALLOWED_PENDING_PAYMENT_STATUSES = new Set([
  "UNPAID",
  "PENDING",
  "PENDING_VERIFICATION",
]);
const ALLOWED_SETTLED_PAYMENT_STATUSES = new Set(["PAID", "SETTLED", "COMPLETED"]);
const ALLOWED_CLOSED_ORDER_STATUSES = new Set(["CLOSED", "COMPLETED", "BILLED", "SETTLED"]);
const SETTLED_ORDER_DELETE_MIN_AGE_MS = 60 * 60 * 1000;

const MAX_BODY_SIZE_BYTES = 48 * 1024;
const MAX_QUERY_COUNT = 10;
const MAX_QUERY_LENGTH = 1200;
const MAX_ORDER_ITEMS_SNAPSHOT_CHARS = 24_000;
const MAX_KITCHEN_NOTE_LENGTH = 500;
const MAX_UTR_LENGTH = 12;
const RESPONSE_SECURITY_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};

const ALLOWED_QUERY_METHODS = new Set([
  "equal",
  "notEqual",
  "lessThan",
  "lessThanEqual",
  "greaterThan",
  "greaterThanEqual",
  "search",
  "contains",
  "startsWith",
  "endsWith",
  "isNull",
  "isNotNull",
  "between",
  "orderAsc",
  "orderDesc",
  "limit",
  "offset",
  "cursorAfter",
  "cursorBefore",
  "select",
]);

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

function noStoreJson(payload: Record<string, unknown>, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: RESPONSE_SECURITY_HEADERS,
  });
}

function jsonError(message: string, status: number) {
  return noStoreJson({ message }, status);
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

function normalizeIdentityToken(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeEnum(value: unknown, allowedValues: Set<string>) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toUpperCase();
  return allowedValues.has(normalized) ? normalized : "";
}

function sanitizeUtrNumber(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const digitsOnly = value.replace(/\D/g, "").trim();
  if (!/^\d{12}$/.test(digitsOnly)) {
    return "";
  }
  return digitsOnly.slice(0, MAX_UTR_LENGTH);
}

function sanitizeAdminPin(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 128);
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

function toTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Date.parse(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeJsonSnapshotString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  let parsed: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      return "";
    }
  }

  if (!parsed || (typeof parsed !== "object" && !Array.isArray(parsed))) {
    return "";
  }

  try {
    const serialized = JSON.stringify(parsed);
    if (!serialized || serialized.length > MAX_ORDER_ITEMS_SNAPSHOT_CHARS) {
      return "";
    }
    return serialized;
  } catch {
    return "";
  }
}

function sanitizeJsonSnapshotStructured(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  let parsed: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }

  if (!parsed || (typeof parsed !== "object" && !Array.isArray(parsed))) {
    return null;
  }

  try {
    const serialized = JSON.stringify(parsed);
    if (!serialized || serialized.length > MAX_ORDER_ITEMS_SNAPSHOT_CHARS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null) {
  if (!value) {
    return "";
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean) ?? "";
}

function getRequestProtocol(request: NextRequest) {
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto")).toLowerCase();
  if (forwardedProto === "http" || forwardedProto === "https") {
    return forwardedProto;
  }

  const nextUrlProto = request.nextUrl.protocol.replace(":", "").toLowerCase();
  if (nextUrlProto === "http" || nextUrlProto === "https") {
    return nextUrlProto;
  }

  return "https";
}

function appendOriginFromHost(
  trustedOrigins: Set<string>,
  hostHeader: string | null,
  protocol: string,
) {
  if (!hostHeader) {
    return;
  }

  for (const rawHost of hostHeader.split(",")) {
    const host = rawHost.trim();
    if (!host) {
      continue;
    }

    try {
      trustedOrigins.add(new URL(`${protocol}://${host}`).origin);
    } catch {
      // Ignore malformed host header fragments.
    }
  }
}

function getTrustedOrigins(request: NextRequest) {
  const trustedOrigins = new Set<string>();
  trustedOrigins.add(request.nextUrl.origin);

  const protocol = getRequestProtocol(request);
  appendOriginFromHost(trustedOrigins, request.headers.get("host"), protocol);
  appendOriginFromHost(trustedOrigins, request.headers.get("x-forwarded-host"), protocol);
  appendOriginFromHost(trustedOrigins, request.headers.get("x-original-host"), protocol);

  return trustedOrigins;
}

function isTrustedOrigin(rawOrigin: string, trustedOrigins: Set<string>) {
  try {
    return trustedOrigins.has(new URL(rawOrigin).origin);
  } catch {
    return false;
  }
}

function getWriteOriginValidationError(request: NextRequest) {
  const secFetchSite = firstHeaderValue(request.headers.get("sec-fetch-site")).toLowerCase();
  if (secFetchSite === "cross-site") {
    return "Cross-site browser context is blocked for this write endpoint.";
  }

  const trustedOrigins = getTrustedOrigins(request);

  const origin = firstHeaderValue(request.headers.get("origin"));
  if (origin && origin !== "null" && !isTrustedOrigin(origin, trustedOrigins)) {
    return "Origin mismatch for write endpoint.";
  }

  const referer = firstHeaderValue(request.headers.get("referer"));
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!trustedOrigins.has(refererOrigin)) {
        return "Referer mismatch for write endpoint.";
      }
    } catch {
      return "Invalid referer header on write request.";
    }
  }

  return "";
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

    const normalized = normalizeQueryString(query);
    if (!normalized) {
      return null;
    }

    sanitized.push(normalized);
  }

  return sanitized;
}

function parseNormalizedQuery(query: string) {
  try {
    const parsed = JSON.parse(query) as {
      method?: string;
      attribute?: string;
      values?: unknown;
    };
    const method = typeof parsed.method === "string" ? parsed.method.trim() : "";
    const attribute = typeof parsed.attribute === "string" ? parsed.attribute.trim() : "";
    const values = Array.isArray(parsed.values)
      ? parsed.values
      : "values" in parsed
        ? [parsed.values]
        : [];
    return { method, attribute, values };
  } catch {
    return null;
  }
}

function hasScopedOrderReadFilters(queries: string[]) {
  let hasClientFilter = false;
  let hasTableFilter = false;

  for (const query of queries) {
    const parsed = parseNormalizedQuery(query);
    if (!parsed || parsed.method !== "equal") {
      continue;
    }
    if (parsed.attribute === "client_id" && parsed.values.length > 0) {
      hasClientFilter = true;
    }
    if (parsed.attribute === "table_id" && parsed.values.length > 0) {
      hasTableFilter = true;
    }
  }

  return hasClientFilter && hasTableFilter;
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
  const rawMessage = sanitizeUpstreamMessage(extractUpstreamMessage(payload));
  const message = rawMessage.toLowerCase();

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
    return rawMessage || "Upstream service unavailable.";
  }
  return rawMessage || `Request failed (${status}).`;
}

function sanitizeUpstreamMessage(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function parseJsonLikeLiteral(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const singleQuoted =
      trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2;
    if (singleQuoted) {
      return trimmed.slice(1, -1);
    }

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    if (trimmed === "true") {
      return true;
    }

    if (trimmed === "false") {
      return false;
    }

    if (trimmed === "null") {
      return null;
    }

    return trimmed;
  }
}

function splitTopLevelArgs(input: string) {
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  let escapeNext = false;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (const char of input) {
    if (inQuote) {
      current += char;
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (char === quoteChar) {
        inQuote = false;
        quoteChar = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
      current += char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      current += char;
      continue;
    }
    if (char === ")" && parenDepth > 0) {
      parenDepth -= 1;
      current += char;
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === "]" && bracketDepth > 0) {
      bracketDepth -= 1;
      current += char;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      current += char;
      continue;
    }
    if (char === "}" && braceDepth > 0) {
      braceDepth -= 1;
      current += char;
      continue;
    }

    if (char === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    args.push(tail);
  }

  return args;
}

function normalizeJsonQuery(value: string) {
  if (!value.startsWith("{") || !value.endsWith("}")) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const source = parsed as Record<string, unknown>;
  const method = typeof source.method === "string" ? source.method.trim() : "";
  if (!method || !ALLOWED_QUERY_METHODS.has(method)) {
    return null;
  }

  const normalized: Record<string, unknown> = { method };
  if (typeof source.attribute === "string" && source.attribute.trim()) {
    normalized.attribute = source.attribute.trim();
  }

  if ("values" in source) {
    const values = Array.isArray(source.values) ? source.values : [source.values];
    if (values.length > 100) {
      return null;
    }
    normalized.values = values;
  }

  return JSON.stringify(normalized);
}

function normalizeLegacyQuery(value: string) {
  const methodMatch = value.match(/^([a-zA-Z][a-zA-Z0-9_]*)\(([\s\S]*)\)$/);
  if (!methodMatch) {
    return null;
  }

  const method = methodMatch[1];
  const rawArgs = methodMatch[2].trim();
  if (!ALLOWED_QUERY_METHODS.has(method)) {
    return null;
  }

  const args = splitTopLevelArgs(rawArgs);

  if (["equal", "notEqual", "search", "contains", "startsWith", "endsWith"].includes(method)) {
    if (args.length !== 2) {
      return null;
    }
    const attributeValue = parseJsonLikeLiteral(args[0]);
    const valuesValue = parseJsonLikeLiteral(args[1]);
    if (typeof attributeValue !== "string" || !attributeValue.trim()) {
      return null;
    }

    const values = Array.isArray(valuesValue) ? valuesValue : [valuesValue];
    return JSON.stringify({
      method,
      attribute: attributeValue.trim(),
      values,
    });
  }

  if (
    [
      "lessThan",
      "lessThanEqual",
      "greaterThan",
      "greaterThanEqual",
      "between",
      "orderAsc",
      "orderDesc",
    ].includes(method)
  ) {
    if (args.length !== 1 && args.length !== 2) {
      return null;
    }

    const attributeValue = parseJsonLikeLiteral(args[0]);
    if (typeof attributeValue !== "string" || !attributeValue.trim()) {
      return null;
    }

    if (args.length === 1) {
      return JSON.stringify({
        method,
        attribute: attributeValue.trim(),
      });
    }

    const valuesValue = parseJsonLikeLiteral(args[1]);
    const values = Array.isArray(valuesValue) ? valuesValue : [valuesValue];
    return JSON.stringify({
      method,
      attribute: attributeValue.trim(),
      values,
    });
  }

  if (["cursorAfter", "cursorBefore", "limit", "offset", "select", "isNull", "isNotNull"].includes(method)) {
    if (args.length !== 1) {
      return null;
    }
    const parsedValue = parseJsonLikeLiteral(args[0]);
    const values = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
    return JSON.stringify({
      method,
      values,
    });
  }

  return null;
}

function normalizeQueryString(value: string) {
  return normalizeJsonQuery(value) ?? normalizeLegacyQuery(value);
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

  const payload: Record<string, unknown> = {
    client_id: clientId,
    table_id: tableId,
    order_number: orderNumber,
    status: "PLACED",
    payment_status: "UNPAID",
    payment_method: paymentMethod,
    subtotal,
    total_amount: totalAmount,
    created_at_custom: createdAtCustom,
  };

  if (Object.hasOwn(documentData, "items_json")) {
    const snapshot = sanitizeJsonSnapshotString(documentData.items_json);
    if (snapshot) {
      payload.items_json = snapshot;
    }
  }

  if (Object.hasOwn(documentData, "order_items")) {
    const snapshot = sanitizeJsonSnapshotString(documentData.order_items);
    if (snapshot) {
      payload.order_items = snapshot;
    }
  }

  if (Object.hasOwn(documentData, "items")) {
    const snapshot = sanitizeJsonSnapshotStructured(documentData.items);
    if (snapshot) {
      payload.items = snapshot;
    }
  }

  if (Object.hasOwn(documentData, "kitchen_instructions")) {
    const note = sanitizeText(documentData.kitchen_instructions, MAX_KITCHEN_NOTE_LENGTH);
    if (note) {
      payload.kitchen_instructions = note;
    }
  }

  if (Object.hasOwn(documentData, "instructions")) {
    const note = sanitizeText(documentData.instructions, MAX_KITCHEN_NOTE_LENGTH);
    if (note) {
      payload.instructions = note;
    }
  }

  if (Object.hasOwn(documentData, "notes")) {
    const note = sanitizeText(documentData.notes, MAX_KITCHEN_NOTE_LENGTH);
    if (note) {
      payload.notes = note;
    }
  }

  return payload;
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

function sanitizeOrderUtrSubmissionPatch(documentData: Record<string, unknown>) {
  const keys = Object.keys(documentData);
  if (keys.length === 0) {
    return null;
  }
  if (keys.some((key) => !SAFE_ORDER_UTR_SUBMISSION_FIELDS.has(key))) {
    return null;
  }

  const paymentMethod = sanitizeEnum(documentData.payment_method, ALLOWED_PAYMENT_METHODS);
  const paymentStatus = sanitizeEnum(documentData.payment_status, ALLOWED_PENDING_PAYMENT_STATUSES);
  const utrNumber = sanitizeUtrNumber(documentData.utr_number);

  if (paymentMethod !== "UPI" || paymentStatus !== "PENDING_VERIFICATION" || !utrNumber) {
    return null;
  }

  return {
    payment_method: "UPI",
    payment_status: "PENDING_VERIFICATION",
    utr_number: utrNumber,
  } satisfies Record<string, unknown>;
}

function sanitizeOrderAdminApprovalPatch(documentData: Record<string, unknown>) {
  const keys = Object.keys(documentData);
  if (keys.length === 0) {
    return null;
  }
  if (keys.some((key) => !SAFE_ORDER_ADMIN_APPROVAL_FIELDS.has(key))) {
    return null;
  }

  const paymentStatus = sanitizeEnum(documentData.payment_status, ALLOWED_SETTLED_PAYMENT_STATUSES);
  if (paymentStatus !== "COMPLETED") {
    return null;
  }

  return {
    payment_status: "COMPLETED",
  } satisfies Record<string, unknown>;
}

function sanitizePatchScope(source: Record<string, unknown>) {
  const clientId = sanitizeIdentifier(source.clientId ?? source.client_id, 64);
  const tableId = sanitizeIdentifier(source.tableId ?? source.table_id, 64);
  if (!clientId || !tableId) {
    return null;
  }
  return { clientId, tableId };
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

function sanitizeOrderDeletePayload(source: Record<string, unknown>) {
  const collectionId = normalizeCollectionId(source.collectionId);
  const documentId = normalizeDocumentId(source.documentId);
  const clientId = sanitizeIdentifier(source.clientId, 64);
  const tableId = sanitizeIdentifier(source.tableId, 64);

  if (!collectionId || !documentId || !clientId || !tableId) {
    return null;
  }

  if (!DELETE_ALLOWED_COLLECTIONS.has(collectionId)) {
    return null;
  }

  return { collectionId, documentId, clientId, tableId };
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

  if (collectionId === ORDERS_COLLECTION_ID && !hasScopedOrderReadFilters(queries)) {
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

  return noStoreJson(payload, upstreamResponse.status);
}

export async function POST(request: NextRequest) {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  const writeOriginError = getWriteOriginValidationError(request);
  if (writeOriginError) {
    return jsonError(writeOriginError, 403);
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

  return noStoreJson(payload, upstreamResponse.status);
}

export async function PATCH(request: NextRequest) {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  const writeOriginError = getWriteOriginValidationError(request);
  if (writeOriginError) {
    return jsonError(writeOriginError, 403);
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
  const scope = sanitizePatchScope(source);
  const adminPin = sanitizeAdminPin(source.adminPin ?? source.admin_pin);
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

  let sanitizedData: Record<string, unknown> | null = null;
  let requiresScopeVerification = false;

  if (adminPin) {
    if (!WEB_ADMIN_APPROVAL_PIN || adminPin !== WEB_ADMIN_APPROVAL_PIN) {
      return jsonError("Admin approval is not authorized.", 403);
    }
    sanitizedData = sanitizeOrderAdminApprovalPatch(documentData);
  } else if (Object.hasOwn(documentData, "utr_number")) {
    if (!scope) {
      return jsonError("Order scope is required for UTR verification update.", 403);
    }
    sanitizedData = sanitizeOrderUtrSubmissionPatch(documentData);
    requiresScopeVerification = true;
  } else {
    sanitizedData = sanitizeOrderPaymentSwitchPatch(documentData);
  }

  if (!sanitizedData) {
    return jsonError("Invalid update payload.", 400);
  }

  const upstreamUrl = `${APPWRITE_ENDPOINT}/databases/${encodeURIComponent(
    APPWRITE_DATABASE_ID,
  )}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(
    documentId,
  )}`;

  if (requiresScopeVerification && scope) {
    const currentDocResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: buildAppwriteHeaders(true),
      cache: "no-store",
    });
    const currentDocPayload = await parseResponse(currentDocResponse);
    if (!currentDocResponse.ok) {
      return jsonError(
        sanitizeUpstreamErrorMessage(currentDocResponse.status, currentDocPayload),
        currentDocResponse.status,
      );
    }

    const currentDoc = currentDocPayload as Record<string, unknown>;
    const docClientId = sanitizeIdentifier(currentDoc.client_id, 64);
    const docTableId = sanitizeIdentifier(currentDoc.table_id, 64);
    if (docClientId !== scope.clientId || docTableId !== scope.tableId) {
      return jsonError("Document scope mismatch for verification update.", 403);
    }
  }

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

  return noStoreJson(payload, upstreamResponse.status);
}

export async function DELETE(request: NextRequest) {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  const writeOriginError = getWriteOriginValidationError(request);
  if (writeOriginError) {
    return jsonError(writeOriginError, 403);
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

  const payload = sanitizeOrderDeletePayload(body as Record<string, unknown>);
  if (!payload) {
    return jsonError("Document delete is not allowed.", 403);
  }

  const upstreamDocumentUrl = `${APPWRITE_ENDPOINT}/databases/${encodeURIComponent(
    APPWRITE_DATABASE_ID,
  )}/collections/${encodeURIComponent(payload.collectionId)}/documents/${encodeURIComponent(
    payload.documentId,
  )}`;

  const currentDocResponse = await fetch(upstreamDocumentUrl, {
    method: "GET",
    headers: buildAppwriteHeaders(true),
    cache: "no-store",
  });
  const currentDocPayload = await parseResponse(currentDocResponse);
  if (!currentDocResponse.ok) {
    return jsonError(
      sanitizeUpstreamErrorMessage(currentDocResponse.status, currentDocPayload),
      currentDocResponse.status,
    );
  }

  const currentDoc = currentDocPayload as Record<string, unknown>;
  const docClientId = sanitizeIdentifier(currentDoc.client_id, 64);
  const docTableId = sanitizeIdentifier(currentDoc.table_id, 64);
  if (
    normalizeIdentityToken(docClientId) !== normalizeIdentityToken(payload.clientId) ||
    normalizeIdentityToken(docTableId) !== normalizeIdentityToken(payload.tableId)
  ) {
    return jsonError("Document scope mismatch for delete request.", 403);
  }

  const paymentStatus = sanitizeEnum(currentDoc.payment_status, ALLOWED_SETTLED_PAYMENT_STATUSES);
  const orderStatus = sanitizeEnum(currentDoc.status, ALLOWED_CLOSED_ORDER_STATUSES);
  if (!paymentStatus && !orderStatus) {
    return jsonError("Only paid, settled, or closed bills are eligible for deletion.", 409);
  }

  const now = Date.now();
  const anchor =
    toTimestamp(currentDoc.$updatedAt) ||
    toTimestamp(currentDoc.updated_at) ||
    toTimestamp(currentDoc.created_at_custom) ||
    toTimestamp(currentDoc.$createdAt);
  if (!anchor || now - anchor < SETTLED_ORDER_DELETE_MIN_AGE_MS) {
    return jsonError("Settled bill retention window has not elapsed yet.", 409);
  }

  const upstreamDeleteResponse = await fetch(upstreamDocumentUrl, {
    method: "DELETE",
    headers: buildAppwriteHeaders(true),
    cache: "no-store",
  });
  if (!upstreamDeleteResponse.ok) {
    const deletePayload = await parseResponse(upstreamDeleteResponse);
    return jsonError(
      sanitizeUpstreamErrorMessage(upstreamDeleteResponse.status, deletePayload),
      upstreamDeleteResponse.status,
    );
  }

  return noStoreJson(
    { ok: true, deletedDocumentId: payload.documentId },
    200,
  );
}
