import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT ?? "";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY ?? "";
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID ?? "";
const DEFAULT_BUCKET_ID = "restaurant-assets";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function ensureServerConfig() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
    return jsonError(
      "Server Appwrite configuration is missing (APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID).",
      500,
    );
  }

  if (!APPWRITE_API_KEY) {
    return jsonError("Server Appwrite API key is missing (APPWRITE_API_KEY).", 500);
  }

  return null;
}

function normalizeId(value: string | null) {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{5,127}$/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function sanitizeUpstreamMessage(status: number, bodyText: string) {
  const message = bodyText.toLowerCase();

  if (message.includes("not authorized") || message.includes("unauthorized")) {
    return "Not authorized to access this asset.";
  }
  if (message.includes("not found") || status === 404) {
    return "Asset not found.";
  }
  if (status >= 500) {
    return "Asset service is currently unavailable.";
  }

  return "Unable to load asset.";
}

export async function GET(request: NextRequest) {
  const configError = ensureServerConfig();
  if (configError) {
    return configError;
  }

  const fileId = normalizeId(request.nextUrl.searchParams.get("fileId"));
  if (!fileId) {
    return jsonError("Invalid fileId.", 400);
  }

  const requestedBucketId = normalizeId(request.nextUrl.searchParams.get("bucketId"));
  const configuredBucketId = normalizeId(APPWRITE_BUCKET_ID);
  const effectiveBucketId = requestedBucketId || configuredBucketId || DEFAULT_BUCKET_ID;

  const allowedBucketIds = new Set<string>();
  if (configuredBucketId) {
    allowedBucketIds.add(configuredBucketId);
  }
  allowedBucketIds.add(DEFAULT_BUCKET_ID);

  if (requestedBucketId && !allowedBucketIds.has(requestedBucketId)) {
    return jsonError("Bucket is not allowed.", 403);
  }

  const upstreamUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${encodeURIComponent(
    effectiveBucketId,
  )}/files/${encodeURIComponent(fileId)}/view`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
      "X-Appwrite-Key": APPWRITE_API_KEY,
    },
    cache: "no-store",
  });

  if (!upstreamResponse.ok) {
    const bodyText = await upstreamResponse.text();
    return jsonError(
      sanitizeUpstreamMessage(upstreamResponse.status, bodyText),
      upstreamResponse.status,
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("Content-Type", contentType);
  } else {
    responseHeaders.set("Content-Type", "application/octet-stream");
  }

  // Keep this route strictly request-scoped so each fileId resolves to its own image
  // without intermediary caching layers reusing a stale binary across items.
  responseHeaders.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  responseHeaders.set("CDN-Cache-Control", "no-store");
  responseHeaders.set("Netlify-CDN-Cache-Control", "no-store");
  responseHeaders.set("Surrogate-Control", "no-store");
  responseHeaders.set("Pragma", "no-cache");
  responseHeaders.set("Expires", "0");
  responseHeaders.set("Vary", "Accept, Origin");

  const body = await upstreamResponse.arrayBuffer();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
