import { cookies } from "next/headers";
import { isMasterSessionTokenValid, MASTER_COOKIE_NAME } from "@/lib/master-auth";
import MasterLogin from "@/components/master/master-login";
import AdminOrdersClient from "@/components/admin-orders-client";

export default async function AdminOrdersPage() {
  const cookieStore = await cookies();
  const isUnlocked = isMasterSessionTokenValid(cookieStore.get(MASTER_COOKIE_NAME)?.value ?? "");

  if (!isUnlocked) {
    return <MasterLogin />;
  }

  return <AdminOrdersClient />;
}
