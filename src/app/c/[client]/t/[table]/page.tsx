import type { Metadata } from "next";

import QrOrderingExperience from "@/components/qr-ordering-experience";

type RouteParams = Promise<{
  client: string;
  table: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { client, table } = await params;
  const prettyClient = client
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: `${prettyClient} - Table ${table}`,
    description: "Scan, browse menu, and place your order instantly.",
  };
}

export default async function TableOrderingPage({
  params,
}: {
  params: RouteParams;
}) {
  const { client, table } = await params;

  return (
    <QrOrderingExperience
      key={`${client}__${table}`}
      client={decodeURIComponent(client)}
      table={decodeURIComponent(table)}
    />
  );
}
