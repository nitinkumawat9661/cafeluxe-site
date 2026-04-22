import { NextRequest, NextResponse } from "next/server";

const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "trustfirst-core";
const APPWRITE_DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "trustfirst-main-db";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY ?? "";
const ORDERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ORDERS ?? "orders";
const SAFE_ORDER_PAYMENT_SWITCH_FIELDS = new Set([
  "payment_method",
  "payment_status",
  "updated_at_custom",
]);

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

function isSafeOrderPaymentSwitchPatch(
  collectionId: string,
  documentData: Record<string, unknown>,
) {
  if (collectionId !== ORDERS_COLLECTION_ID) {
    return false;
  }

  const keys = Object.keys(documentData);
  if (keys.length === 0) {
    return false;
  }

  if (keys.some((key) => !SAFE_ORDER_PAYMENT_SWITCH_FIELDS.has(key))) {
    return false;
  }

  const paymentMethod =
    typeof documentData.payment_method === "string"
      ? documentData.payment_method.trim().toUpperCase()
      : "";
  if (paymentMethod && paymentMethod !== "UPI" && paymentMethod !== "COUNTER") {
    return false;
  }

  const paymentStatus =
    typeof documentData.payment_status === "string"
      ? documentData.payment_status.trim().toUpperCase()
      : "";
  if (
    paymentStatus &&
    ![
      "UNPAID",
      "PENDING",
      "PAID",
      "FAILED",
      "REFUNDED",
      "PARTIAL",
      "PROCESSING",
    ].includes(paymentStatus)
  ) {
    return false;
  }

  return true;
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

export async function GET(request: NextRequest) {
  const collectionId = request.nextUrl.searchParams.get("collectionId")?.trim();
  if (!collectionId) {
    return NextResponse.json(
      { message: "collectionId is required." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams();
  const allQueries = [
    ...request.nextUrl.searchParams.getAll("queries"),
    ...request.nextUrl.searchParams.getAll("queries[]"),
  ];
  for (const query of allQueries) {
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
  return NextResponse.json(payload, { status: upstreamResponse.status });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    collectionId?: string;
    documentData?: Record<string, unknown>;
  };
  const collectionId = body.collectionId?.trim();
  const documentData = body.documentData;

  if (!collectionId || !documentData || typeof documentData !== "object") {
    return NextResponse.json(
      { message: "collectionId and documentData are required." },
      { status: 400 },
    );
  }

  const upstreamUrl = `${APPWRITE_ENDPOINT}/databases/${encodeURIComponent(
    APPWRITE_DATABASE_ID,
  )}/collections/${encodeURIComponent(collectionId)}/documents`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "POST",
    headers: buildAppwriteHeaders(),
    body: JSON.stringify({
      documentId: "unique()",
      data: documentData,
    }),
    cache: "no-store",
  });

  const payload = await parseResponse(upstreamResponse);
  return NextResponse.json(payload, { status: upstreamResponse.status });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    collectionId?: string;
    documentId?: string;
    documentData?: Record<string, unknown>;
  };
  const collectionId = body.collectionId?.trim();
  const documentId = body.documentId?.trim();
  const documentData = body.documentData;

  if (!collectionId || !documentId || !documentData || typeof documentData !== "object") {
    return NextResponse.json(
      { message: "collectionId, documentId and documentData are required." },
      { status: 400 },
    );
  }

  const upstreamUrl = `${APPWRITE_ENDPOINT}/databases/${encodeURIComponent(
    APPWRITE_DATABASE_ID,
  )}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(
    documentId,
  )}`;

  const canUsePrivilegedPatch =
    !!APPWRITE_API_KEY &&
    isSafeOrderPaymentSwitchPatch(collectionId, documentData);

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "PATCH",
    headers: buildAppwriteHeaders(canUsePrivilegedPatch),
    body: JSON.stringify({
      data: documentData,
    }),
    cache: "no-store",
  });

  const payload = await parseResponse(upstreamResponse);
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
