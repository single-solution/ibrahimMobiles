import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { PageTitle } from "@/components/PageTitle";
import { NewProductForm } from "@/components/NewProductForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { Brand, connectDB } from "@store/db";

import { requirePageSession } from "@/lib/server/requirePageSession";
import { toBrandResponse, type BrandLean } from "@/lib/serializers/brand";

export const dynamic = "force-dynamic";

const BASIC_INFO_FIELDS = 4;
const IMAGERY_FIELDS = 2;
const HIGHLIGHT_FIELDS = 1;
const SWITCH_ROWS = 2;

/**
 * Admin "add a new product" form.
 *
 * Everything that doesn't depend on data — shell, back link, title —
 * renders synchronously. The form itself needs the active-brand list,
 * so it sits inside a Suspense boundary with a form-shaped skeleton
 * fallback.
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

      <div className="mt-8">
        <Suspense fallback={<NewProductFormFallback />}>
          <NewProductFormData />
        </Suspense>
      </div>
    </AdminShell>
  );
}

async function NewProductFormData() {
  await connectDB();
  const docs = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<BrandLean[]>();
  const brands = docs.map(toBrandResponse);
  return <NewProductForm brands={brands} />;
}

function NewProductFormFallback() {
  return (
    <div className="space-y-1 pt-3">
      <FormSectionFallback
        titleWidthClass="w-24"
        fieldCount={BASIC_INFO_FIELDS}
        switchCount={SWITCH_ROWS}
      />
      <FormSectionFallback
        titleWidthClass="w-20"
        fieldCount={IMAGERY_FIELDS}
        includeTextarea
      />
      <FormSectionFallback
        titleWidthClass="w-24"
        fieldCount={HIGHLIGHT_FIELDS}
        includeTextarea
      />
      <SaveBarFallback />
    </div>
  );
}

interface FormSectionFallbackProps {
  titleWidthClass: string;
  fieldCount: number;
  switchCount?: number;
  includeTextarea?: boolean;
}

function FormSectionFallback({
  titleWidthClass,
  fieldCount,
  switchCount = 0,
  includeTextarea = false,
}: FormSectionFallbackProps) {
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
            <FieldFallback key={index} />
          ))}
        </div>
        {includeTextarea && (
          <div className="space-y-1.5">
            <Skeleton shape="text" className="h-3 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {Array.from({ length: switchCount }).map((_, index) => (
          <SwitchFallback key={index} />
        ))}
      </div>
    </section>
  );
}

function FieldFallback() {
  return (
    <div className="space-y-1.5">
      <Skeleton shape="text" className="h-3 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SwitchFallback() {
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

function SaveBarFallback() {
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
