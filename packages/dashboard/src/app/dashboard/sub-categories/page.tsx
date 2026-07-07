import { redirect } from "next/navigation";
import { dashboardAppRoutes } from "@/lib/routes";

export default function SubCategoriesPage() {
  redirect(dashboardAppRoutes.categories);
}
