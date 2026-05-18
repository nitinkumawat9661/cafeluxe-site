import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, Query } from "node-appwrite";
import { serverAppwriteConfig } from "@/lib/server/appwrite-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = serverAppwriteConfig.endpoint;
const projectId = serverAppwriteConfig.projectId;
const apiKey = serverAppwriteConfig.apiKey;
const databaseId = serverAppwriteConfig.databaseId || "trustfirst-main-db";

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

async function safeList(databases: Databases, collectionId: string, queries: string[]) {
  try {
    return await databases.listDocuments({ databaseId, collectionId, queries });
  } catch {
    return null;
  }
}

function ageMinutes(value: unknown) {
  const time = new Date(safeString(value)).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

export async function GET(request: NextRequest) {
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }


  const clientId = safeString(request.nextUrl.searchParams.get("clientId")) || "trustfirst_demo";
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const [orders, printJobs, notifications] = await Promise.all([
    safeList(databases, "orders", [Query.equal("client_id", [clientId]), Query.orderDesc("$createdAt"), Query.limit(1)]),
    safeList(databases, "print_jobs", [Query.equal("client_id", [clientId]), Query.orderDesc("$createdAt"), Query.limit(10)]),
    safeList(databases, "notifications", [Query.equal("client_id", [clientId]), Query.equal("read", [false]), Query.limit(10)]),
  ]);

  const alerts = [];
  const latestOrder = orders?.documents?.[0];
  const orderAge = ageMinutes(latestOrder?.$createdAt);
  const jobs = printJobs?.documents ?? [];
  const failedJobs = jobs.filter((job) => safeString(job.status).toLowerCase().includes("fail")).length;

  if (failedJobs) alerts.push({ level: "Critical", title: "Printer job failures detected", source: "print_jobs", status: "Open" });
  if (orderAge !== null && orderAge > 60) alerts.push({ level: "Warning", title: "Order sync may be delayed", source: "orders", status: `${orderAge} min ago` });
  if ((notifications?.documents?.length ?? 0) > 0) alerts.push({ level: "Info", title: "Unread client notifications", source: "notifications", status: `${notifications?.documents.length} unread` });

  if (!alerts.length) alerts.push({ level: "Info", title: "System Healthy", source: "Master Dashboard", status: "Solved" });

  return NextResponse.json({ alerts });
}
