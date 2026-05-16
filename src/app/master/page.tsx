import { cookies } from "next/headers";
import { isMasterSessionTokenValid, MASTER_COOKIE_NAME } from "@/lib/master-auth";
import MasterDashboard from "@/components/master/master-dashboard";
import MasterLogin from "@/components/master/master-login";

export const metadata = {
  title: "CafeLuxe Master Dashboard",
  description: "Master admin dashboard for CafeLuxe restaurant management.",
};

export default async function MasterPage() {
  const cookieStore = await cookies();
  const isUnlocked = isMasterSessionTokenValid(cookieStore.get(MASTER_COOKIE_NAME)?.value ?? "");

  if (!isUnlocked) {
    return <MasterLogin />;
  }

  return <MasterDashboard />;
}
