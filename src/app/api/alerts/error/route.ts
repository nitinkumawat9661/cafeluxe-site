import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "trustfirst-main-db";

function clean(value: unknown, max = 600) {
  return String(value ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  if (!token || !chatId) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  return res.ok;
}

export async function POST(request: NextRequest) {
  if (!endpoint || !projectId || !apiKey) {
    return NextResponse.json({ message: "Server config missing." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const clientId = clean(body?.clientId, 80) || "unknown_client";
  const tableNo = clean(body?.tableNo, 30);
  const message = clean(body?.message, 700);
  const source = clean(body?.source, 120) || "customer_app";
  const page = clean(body?.page, 250);
  const severity = clean(body?.severity, 30) || "error";
  const userAgent = clean(body?.userAgent || request.headers.get("user-agent"), 250);
  const stack = clean(body?.stack, 900);

  if (!message) {
    return NextResponse.json({ message: "message is required." }, { status: 400 });
  }

  const payload = {
    type: "client_issue",
    severity,
    title: `${severity.toUpperCase()} from ${clientId}${tableNo ? ` / Table ${tableNo}` : ""}`,
    message,
    source,
    page,
    tableNo,
    userAgent,
    stack,
    createdAt: new Date().toISOString(),
  };

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const doc = await databases.createDocument({
    databaseId,
    collectionId: "notifications",
    documentId: ID.unique(),
    data: {
      client_id: clientId,
      type: "client_issue",
      target_role: "master",
      payload: JSON.stringify(payload),
      read: false,
    },
  });

  const telegramText = [
    "🚨 CafeLuxe Client Issue",
    `Client: ${clientId}`,
    tableNo ? `Table: ${tableNo}` : "",
    `Severity: ${severity}`,
    page ? `Page: ${page}` : "",
    `Source: ${source}`,
    `Error: ${message}`,
  ].filter(Boolean).join("\n");

  const telegramSent = await sendTelegram(telegramText).catch(() => false);

  return NextResponse.json({ ok: true, id: doc.$id, telegramSent });
}