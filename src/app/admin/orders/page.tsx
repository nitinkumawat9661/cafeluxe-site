import { cookies } from "next/headers";
import { isMasterSessionTokenValid, MASTER_COOKIE_NAME } from "@/lib/master-auth";
import MasterLogin from "@/components/master/master-login";
import AdminOrdersClient from "@/components/admin-orders-client";

export default async function AdminOrdersPage({ searchParams }: { searchParams?: Promise<{ clientId?: string }> }) {
  const params = await searchParams;
  const initialClientId = String(params?.clientId ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const cookieStore = await cookies();
  const isUnlocked = isMasterSessionTokenValid(cookieStore.get(MASTER_COOKIE_NAME)?.value ?? "");

  if (!isUnlocked) {
    return <MasterLogin />;
  }

  return <AdminOrdersClient initialClientId={initialClientId} />;
}

