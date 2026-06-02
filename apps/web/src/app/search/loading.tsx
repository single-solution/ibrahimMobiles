"use client";

import { useSearchParams } from "next/navigation";

import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { SkeletonScreen } from "@/components/ui/Skeleton";

/**
 * Search fallback. The query lives in `?q=`, so the heading paints live
 * the moment the link is clicked — no skeleton stand-in for text we
 * already know. Only the results grid is skeletoned.
 */
const SEARCH_RESULT_CARDS = 8;

function normaliseQuery(value: string | string[] | undefined | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 100);
}

export default function SearchLoading() {
  const searchParams = useSearchParams();
  const query = normaliseQuery(
    searchParams?.get("q") ?? searchParams?.get("query"),
  );

  return (
    <SkeletonScreen
      label="Loading search"
      className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-10 lg:px-8"
    >
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-700)]">
          Search
        </p>
        <h1 className="mt-2 font-headline text-page-title font-semibold text-[var(--color-ink-900)]">
          {query ? `Results for "${query}"` : "Search the shop"}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-500)]">
          Use the header search for instant suggestions, or open any result
          below to continue shopping.
        </p>
      </div>
      <div className="cv-auto-lg mt-8 min-h-[60vh]">
        <ProductGridSkeleton
          count={SEARCH_RESULT_CARDS}
          className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4"
        />
      </div>
    </SkeletonScreen>
  );
}
