import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";

import { requirePageSession } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

/**
 * Admin "add a new product" form — stub.
 *
 * The single-page progressive create flow (category → brand → variants
 * with the per-category attribute schema) lands in Phase 4 of PLAN.md
 * (see PHASE 4, "Product creation page"). The database side is ready;
 * this page renders the entry point so the sidebar nav and "+ New
 * product" buttons throughout the admin still resolve without 404ing
 * during the migration window.
 */
export default async function NewProductPage() {
  await requirePageSession("/products/new");

  return (
    <AdminShell>
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)]"
      >
        <ChevronLeft size={12} />
        Back to products
      </Link>

      <div className="mt-4">
        <PageTitle eyebrow="New product" title="Add a model" />
      </div>

      <section className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] p-8 text-sm text-[var(--color-ink-500)]">
        <p className="font-semibold text-[var(--color-ink-700)]">
          The product creation flow is being rebuilt (Phase 4).
        </p>
        <p className="mt-2 max-w-prose">
          The new single-page form will adapt to the selected category — only
          that category&rsquo;s brands, grades, and attributes will appear,
          and the variant builder will use the universal{" "}
          <code>StoredImage</code> upload pipeline.
        </p>
      </section>
    </AdminShell>
  );
}
