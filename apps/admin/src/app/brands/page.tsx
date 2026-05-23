import { redirect } from "next/navigation";

export default function AdminBrandsPage() {
  redirect("/categories?tab=brands");
}
