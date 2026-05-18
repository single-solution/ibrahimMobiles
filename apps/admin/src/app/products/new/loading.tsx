import { AdminShell } from "@/components/AdminShell";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

const BASIC_INFO_FIELDS = 4;
const IMAGERY_FIELDS = 2;
const HIGHLIGHT_FIELDS = 1;
const SWITCH_ROWS = 2;

/**
 * Exact-match skeleton for `app/products/new/page.tsx`:
 *
 *   ← Back-to-products link (tiny)
 *   ↳ PageTitle  ("New product" / "Add a model")
 *   ↳ form with FormSection blocks:
 *       1. Basic info — 4 fields in a 2×2 grid + 2 switch rows
 *       2. Imagery   — 1 text field + 1 textarea (gallery URLs)
 *       3. Highlights — 1 textarea
 *   ↳ SaveBar (sticky, bottom) — discard + save buttons
 */
export default function NewProductLoading() {
  return (
    <SkeletonScreen label="Loading new product form">
      <AdminShell>
        <Skeleton shape="text" className="h-3 w-32" />

        <header className="mt-4 space-y-2">
          <Skeleton shape="text" className="h-2.5 w-24" />
          <Skeleton shape="text" className="h-8 w-44" />
        </header>

        <div className="mt-8 space-y-1 pt-3">
          <FormSectionSkeleton
            titleWidthClass="w-24"
            fieldCount={BASIC_INFO_FIELDS}
            switchCount={SWITCH_ROWS}
          />
          <FormSectionSkeleton
            titleWidthClass="w-20"
            fieldCount={IMAGERY_FIELDS}
            includeTextarea
          />
          <FormSectionSkeleton
            titleWidthClass="w-24"
            fieldCount={HIGHLIGHT_FIELDS}
            includeTextarea
          />
        </div>

        <SaveBarSkeleton />
      </AdminShell>
    </SkeletonScreen>
  );
}

interface FormSectionSkeletonProps {
  titleWidthClass: string;
  fieldCount: number;
  switchCount?: number;
  includeTextarea?: boolean;
}

function FormSectionSkeleton({
  titleWidthClass,
  fieldCount,
  switchCount = 0,
  includeTextarea = false,
}: FormSectionSkeletonProps) {
  return (
    <section className="grid gap-6 border-b border-[var(--color-ink-100)] py-6 md:grid-cols-[260px_1fr]">
      <div className="space-y-2">
        <Skeleton shape="text" className={`h-4 ${titleWidthClass}`} />
        <Skeleton shape="text" className="h-3 w-full" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: fieldCount }).map((_, index) => (
            <FieldSkeleton key={index} />
          ))}
        </div>
        {includeTextarea && (
          <div className="space-y-1.5">
            <Skeleton shape="text" className="h-3 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {Array.from({ length: switchCount }).map((_, index) => (
          <SwitchSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton shape="text" className="h-3 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SwitchSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton shape="text" className="h-3.5 w-48" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>
      <Skeleton shape="pill" className="h-6 w-11 shrink-0" />
    </div>
  );
}

function SaveBarSkeleton() {
  return (
    <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur md:px-6">
      <Skeleton shape="text" className="h-3 w-64" />
      <div className="flex gap-2">
        <Skeleton shape="pill" className="h-9 w-24" />
        <Skeleton shape="pill" className="h-9 w-36" />
      </div>
    </div>
  );
}
