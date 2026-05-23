import { redirect } from "next/navigation";

import { requirePageSession } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

/** Legacy route — product creation now opens a modal on `/products`. */
export default async function NewProductPage() {
  await requirePageSession("/products/new");
  redirect("/products?wizard=1");
}
