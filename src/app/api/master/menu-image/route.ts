import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Client, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BUCKET_ID = "restaurant-assets";
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function safeId(value: FormDataEntryValue | null, fallback = "menu") {
  return String(value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48) || fallback;
}

export async function POST(request: NextRequest) {
  if (!isMasterAuthenticated(request)) return masterUnauthorized();

  const endpoint = serverAppwriteConfig.endpoint;
  const projectId = serverAppwriteConfig.projectId;
  const apiKey = serverAppwriteConfig.apiKey;
  const bucketId = serverAppwriteConfig.bucketId || DEFAULT_BUCKET_ID;

  if (!endpoint || !projectId || !apiKey) {
    return json("Server Appwrite config missing.", 500);
  }

  const form = await request.formData();
  const file = form.get("image");
  const clientId = safeId(form.get("clientId"), "client");
  const itemId = safeId(form.get("itemId"), "item");

  if (!(file instanceof File)) return json("Menu image file is required.", 400);
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return json("Only PNG, JPG, or WEBP menu images are allowed.", 415);
  if (file.size > 4 * 1024 * 1024) return json("Menu image must be under 4MB.", 413);

  const extension = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const safeName = `${clientId}-${itemId}-${Date.now().toString(36)}.${extension}`;
  const fileId = `menu_${clientId}_${itemId}_${randomBytes(4).toString("hex")}`.slice(0, 64);
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = new Storage(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
  const uploaded = await storage.createFile({
    bucketId,
    fileId,
    file: InputFile.fromBuffer(buffer, safeName),
  });

  const imageUrl = `/api/appwrite/assets?fileId=${encodeURIComponent(uploaded.$id)}&bucketId=${encodeURIComponent(bucketId)}`;

  return NextResponse.json({
    fileId: uploaded.$id,
    bucketId,
    imageFileId: uploaded.$id,
    imageBucketId: bucketId,
    imageUrl,
  });
}