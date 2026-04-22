import { NextRequest, NextResponse } from "next/server";

const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "trustfirst-core";
const APPWRITE_DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "trustfirst-main-db";

function buildAppwriteHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Appwrite-Project": APPWRITE_PROJECT_ID,
  };
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

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "PATCH",
    headers: buildAppwriteHeaders(),
    body: JSON.stringify({
      data: documentData,
    }),
    cache: "no-store",
  });

  const payload = await parseResponse(upstreamResponse);
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
