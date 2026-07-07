import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { dashboardAppRoutes } from "@/lib/routes";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(dashboardAppRoutes.login);

  return (
    <div id="dashboard-shell">
      <div id="dashboard-sidebar">
        <Sidebar />
      </div>
      <main id="dashboard-content" className="p-8">
        {children}
      </main>
    </div>
  );
}
