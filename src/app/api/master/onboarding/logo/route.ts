import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Storage } from "node-appwrite";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";
import { InputFile } from "node-appwrite/file";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BUCKET_ID = "restaurant-assets";

function clean(value: string | undefined) {
  const text = String(value ?? "").trim();
  const quoted = (text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"));
  return quoted ? text.slice(1, -1).trim() : text;
}

const endpoint = serverAppwriteConfig.endpoint;
const projectId = serverAppwriteConfig.projectId;
const apiKey = serverAppwriteConfig.apiKey;
const bucketId = serverAppwriteConfig.bucketId || DEFAULT_BUCKET_ID;

function json(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }

  if (!endpoint || !projectId || !apiKey) {
    return json("Server Appwrite config missing.", 500);
  }

  const form = await request.formData();
  const file = form.get("logo");

  if (!(file instanceof File)) {
    return json("Logo file is required.", 400);
  }

  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
    return json("Only PNG, JPG, WEBP, or SVG logos are allowed.", 415);
  }

  if (file.size > 2 * 1024 * 1024) {
    return json("Logo must be under 2MB.", 413);
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const storage = new Storage(client);

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "logo.png";
  const fileId = `logo_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;

  const uploaded = await storage.createFile({
    bucketId,
    fileId,
    file: InputFile.fromBuffer(buffer, safeName),
  });

  return NextResponse.json({
    fileId: uploaded.$id,
    bucketId,
    logoUrl: `/api/appwrite/assets?fileId=${encodeURIComponent(uploaded.$id)}&bucketId=${encodeURIComponent(bucketId)}`,
  });
}
