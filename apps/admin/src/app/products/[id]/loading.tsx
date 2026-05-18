import { AdminShell } from "@/components/AdminShell";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

const PRODUCT_EDITOR_SECTIONS = 4;
const FIELDS_PER_SECTION = 4;
const VARIANT_ROW_COUNT = 3;

/**
 * Exact-match skeleton for `app/products/[id]/page.tsx`:
 *
 *   ← Back-to-products link (tiny)
 *   ↳ PageTitle  (brand eyebrow / model title / "N variants · ID")
 *   ↳ ProductEditor — the heavyweight client form:
 *       • Basic info FormSection
 *       • Imagery FormSection
 *       • Highlights FormSection
 *       • Variants section (one card per variant + "add variant" CTA)
 *   ↳ SaveBar (sticky)
 */
export default function ProductEditLoading() {
  return (
    <SkeletonScreen label="Loading product editor">
      <AdminShell>
        <Skeleton shape="text" className="h-3 w-32" />

        <header className="mt-4 space-y-2">
          <Skeleton shape="text" className="h-2.5 w-20" />
          <Skeleton shape="text" className="h-8 w-72" />
          <Skeleton shape="text" className="h-3 w-56" />
        </header>

        <div className="mt-8 space-y-1 pt-3">
          {Array.from({ length: PRODUCT_EDITOR_SECTIONS }).map((_, index) => (
            <FormSectionSkeleton key={index} fieldCount={FIELDS_PER_SECTION} />
          ))}

          {/* Variants block — list of variant rows with edit/delete affordances */}
          <section className="grid gap-6 border-b border-[var(--color-ink-100)] py-6 md:grid-cols-[260px_1fr]">
            <div className="space-y-2">
              <Skeleton shape="text" className="h-4 w-20" />
              <Skeleton shape="text" className="h-3 w-full" />
              <Skeleton shape="text" className="h-3 w-3/4" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: VARIANT_ROW_COUNT }).map((_, index) => (
                <VariantRowSkeleton key={index} />
              ))}
              <Skeleton shape="pill" className="h-9 w-32" />
            </div>
          </section>
        </div>

        <SaveBarSkeleton />
      </AdminShell>
    </SkeletonScreen>
  );
}

function FormSectionSkeleton({ fieldCount }: { fieldCount: number }) {
  return (
    <section className="grid gap-6 border-b border-[var(--color-ink-100)] py-6 md:grid-cols-[260px_1fr]">
      <div className="space-y-2">
        <Skeleton shape="text" className="h-4 w-24" />
        <Skeleton shape="text" className="h-3 w-full" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: fieldCount }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton shape="text" className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function VariantRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3">
      <Skeleton className="size-10 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton shape="text" className="h-3.5 w-40" />
        <Skeleton shape="text" className="h-3 w-56" />
      </div>
      <Skeleton shape="text" className="h-3.5 w-20 shrink-0" />
      <Skeleton shape="pill" className="h-8 w-8 shrink-0" />
      <Skeleton shape="pill" className="h-8 w-8 shrink-0" />
    </div>
  );
}

function SaveBarSkeleton() {
  return (
    <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur md:px-6">
      <Skeleton shape="text" className="h-3 w-64" />
      <div className="flex gap-2">
        <Skeleton shape="pill" className="h-9 w-24" />
        <Skeleton shape="pill" className="h-9 w-28" />
      </div>
    </div>
  );
}
