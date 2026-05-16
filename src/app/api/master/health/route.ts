import { NextRequest, NextResponse } from "next/server";
import { isMasterAuthenticated, masterUnauthorized } from "@/lib/master-auth";
import { Client, Databases, Query } from "node-appwrite";

export const dynamic = "force-dynamic";

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "trustfirst-main-db";

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function ageLabel(value: unknown) {
  const date = new Date(safeString(value));
  if (Number.isNaN(date.getTime())) return "No recent data";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day ago`;
}

async function safeList(databases: Databases, collectionId: string, queries: string[]) {
  try {
    return await databases.listDocuments(databaseId, collectionId, queries);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!isMasterAuthenticated(request)) {
    return masterUnauthorized();
  }


  const clientId = safeString(request.nextUrl.searchParams.get("clientId"));
  if (!clientId) return NextResponse.json({ message: "clientId is required" }, { status: 400 });

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const orders = await safeList(databases, "orders", [
    Query.equal("client_id", [clientId]),
    Query.orderDesc("$createdAt"),
    Query.limit(1),
  ]);

  const printJobs = await safeList(databases, "print_jobs", [
    Query.equal("client_id", [clientId]),
    Query.orderDesc("$createdAt"),
    Query.limit(10),
  ]);

  const latestOrder = orders?.documents?.[0] ?? null;
  const jobs = printJobs?.documents ?? [];
  const latestJob = jobs[0] ?? null;
  const failedJobs = jobs.filter((job) => safeString(job.status).toLowerCase().includes("fail")).length;

  return NextResponse.json({
    websiteOrdering: {
      status: latestOrder ? "Enabled" : "Unknown",
      detail: latestOrder ? `Last order: ${ageLabel(latestOrder.$createdAt)}` : "No order found",
    },
    printer: {
      status: latestJob ? (failedJobs ? "Warning" : "Active") : "Unknown",
      detail: latestJob ? `Last print job: ${ageLabel(latestJob.$createdAt)}` : "No print job found",
    },
    app: {
      status: latestOrder ? "Active" : "Unknown",
      detail: latestOrder ? `Last sync signal: ${ageLabel(latestOrder.$createdAt)}` : "No sync signal found",
    },
  });
}
