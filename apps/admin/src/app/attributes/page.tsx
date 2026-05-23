import { redirect } from "next/navigation";

export default function AdminAttributesPage() {
  redirect("/categories?tab=attributes");
}
