import { cookies } from "next/headers";
import MasterDashboard from "@/components/master/master-dashboard";
import MasterLogin from "@/components/master/master-login";

export const metadata = {
  title: "CafeLuxe Master Dashboard",
  description: "Master admin dashboard for CafeLuxe restaurant management.",
};

export default async function MasterPage() {
  const cookieStore = await cookies();
  const isUnlocked = cookieStore.get("cafeluxe_master_auth")?.value === "ok";

  if (!isUnlocked) {
    return <MasterLogin />;
  }

  return <MasterDashboard />;
}
