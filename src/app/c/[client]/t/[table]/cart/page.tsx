import type { Metadata } from "next";

import CustomerMenuFlow from "@/components/customer-menu-flow";

type RouteParams = Promise<{
  client: string;
  table: string;
}>;

function safeDecodeParam(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function sanitizeRouteParam(value: string, maxLength: number) {
  const decoded = safeDecodeParam(value);
  if (!decoded || decoded.length > maxLength || !/^[a-zA-Z0-9_-]+$/.test(decoded)) {
    return "";
  }
  return decoded;
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { client, table } = await params;
  const safeClient = sanitizeRouteParam(client, 64) || "Restaurant";
  const safeTable = sanitizeRouteParam(table, 32) || "Table";
  const prettyClient = safeClient
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: `${prettyClient} - Table ${safeTable}`,
    description: "Review your selected menu items.",
    robots: { index: false, follow: false },
  };
}

export default async function TableCartPage({ params }: { params: RouteParams }) {
  const { client, table } = await params;
  const safeClient = sanitizeRouteParam(client, 64) || safeDecodeParam(client);
  const safeTable = sanitizeRouteParam(table, 32) || safeDecodeParam(table);

  return <CustomerMenuFlow key={`${safeClient}__${safeTable}`} client={safeClient} table={safeTable} />;
}
