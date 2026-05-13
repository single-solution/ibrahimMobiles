import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { NewProductForm } from "@/components/admin/NewProductForm";
import { brands } from "@/data/brands";

export default function NewProductPage() {
  return (
    <AdminShell>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)]"
      >
        <ChevronLeft size={12} />
        Back to products
      </Link>

      <div className="mt-4">
        <PageTitle eyebrow="New product" title="Add a model" />
      </div>

      <div className="mt-8">
        <NewProductForm brands={brands} />
      </div>
    </AdminShell>
  );
}
