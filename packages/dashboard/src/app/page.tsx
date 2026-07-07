import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import DashboardPage from "@/app/dashboard/page";
import { dashboardAppRoutes } from "@/lib/routes";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(dashboardAppRoutes.login);

  return (
    <div id="dashboard-shell">
      <div id="dashboard-sidebar">
        <Sidebar />
      </div>
      <main id="dashboard-content" className="p-8">
        <DashboardPage />
      </main>
    </div>
  );
}
