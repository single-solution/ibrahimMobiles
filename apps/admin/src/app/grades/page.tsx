import { redirect } from "next/navigation";

export default function AdminGradesPage() {
  redirect("/categories?tab=grades");
}
