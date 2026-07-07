import { redirect } from "next/navigation";
import { dashboardAppRoutes } from "@/lib/routes";

export default function BrandsPage() {
  redirect(dashboardAppRoutes.categories);
}
