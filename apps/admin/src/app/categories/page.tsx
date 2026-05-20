import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";

import { requirePageSession } from "@/lib/server/requirePageSession";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requirePageSession("/categories");

  return (
    <AdminShell>
      <PageTitle
        eyebrow="Catalog"
        title="Categories"
        description="Brands, grades, and attributes per category — being rebuilt in Phase 3 of the simplification refactor."
      />
      <section className="mt-8">
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-6 py-10 text-center">
          <p className="mx-auto max-w-prose text-sm leading-relaxed text-[var(--color-ink-600)]">
            The new card-grid workspace will mount here in Phase 3. Each card
            will host the category&rsquo;s brands (inline chips), grades, and
            attributes — see <code>PLAN.md</code> § 3 Flow A.
          </p>
        </div>
      </section>
    </AdminShell>
  );
}
