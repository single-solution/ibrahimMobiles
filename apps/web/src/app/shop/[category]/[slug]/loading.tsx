"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { useCategory } from "@/lib/storefront/storefrontReferenceContext";

/**
 * Product detail fallback. The URL contract is
 * `/shop/<category>/<slug>` — the category slug is in the route, and the
 * storefront reference context already holds every category's label.
 * That means the desktop breadcrumb (Home › Shop › Category) paints live
 * the moment the link is clicked; only the gallery, variant selector,
 * grade showcase, and brand rail are skeletoned.
 */
const RELATED_SKELETON_COUNT = 4;
const DESKTOP_THUMB_COUNT = 4;
const MOBILE_THUMB_COUNT = 6;

export default function ProductDetailLoading() {
  const params = useParams<{ category: string; slug: string }>();
  const categorySlug = params?.category ?? "";
  const category = useCategory(categorySlug);
  const categoryLabel = category?.label;

  return (
    <SkeletonScreen label="Loading product">
      {/* Mobile only */}
      <div className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-2 md:hidden">
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5">
          {Array.from({ length: MOBILE_THUMB_COUNT }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-14 shrink-0" />
          ))}
        </div>

        <div className="app-page">
          <div className="app-section">
            <MobileVariantSelectorSkeleton />
          </div>
          <MobileGradeShowcaseSkeleton />
          <RelatedRailSkeleton />
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[1440px] px-6 pb-12 pt-8 md:block">
        <LiveBreadcrumbs
          categorySlug={categorySlug}
          categoryLabel={categoryLabel}
        />

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-12">
          <DesktopPhotoGallerySkeleton />
          <DesktopVariantSelectorSkeleton />
        </div>

        <DesktopGradeShowcaseSkeleton />

        <section className="cv-auto mt-20">
          <div className="flex items-end justify-between gap-3">
            <Skeleton shape="text" className="h-8 w-72" />
            <Skeleton shape="text" className="h-3 w-28" />
          </div>
          <div className="mt-6 grid grid-cols-4 gap-5">
            {Array.from({ length: RELATED_SKELETON_COUNT }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </div>
    </SkeletonScreen>
  );
}

interface LiveBreadcrumbsProps {
  categorySlug: string;
  categoryLabel: string | undefined;
}

function LiveBreadcrumbs({ categorySlug, categoryLabel }: LiveBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[12px] text-[var(--color-ink-500)]"
    >
      <Link href="/" className="hover:text-[var(--color-ink-800)]">
        Home
      </Link>
      <ChevronRight size={12} className="text-[var(--color-ink-300)]" />
      <Link href="/shop" className="hover:text-[var(--color-ink-800)]">
        Shop
      </Link>
      {categorySlug && (
        <>
          <ChevronRight size={12} className="text-[var(--color-ink-300)]" />
          {categoryLabel ? (
            <Link
              href={`/shop/${categorySlug}`}
              className="hover:text-[var(--color-ink-800)]"
            >
              {categoryLabel}
            </Link>
          ) : (
            <Skeleton shape="text" className="h-3 w-20" />
          )}
        </>
      )}
      <ChevronRight size={12} className="text-[var(--color-ink-300)]" />
      <Skeleton shape="text" className="h-3 w-36" />
    </nav>
  );
}

function DesktopPhotoGallerySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-square w-full rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: DESKTOP_THUMB_COUNT }).map((_, index) => (
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}

function MobileVariantSelectorSkeleton() {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Skeleton shape="text" className="h-2.5 w-16" />
        <Skeleton shape="text" className="h-7 w-3/4" />
      </div>
      <div className="space-y-1">
        <Skeleton shape="text" className="h-8 w-36" />
        <Skeleton shape="text" className="h-3 w-full" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24" />
        ))}
      </div>
    </div>
  );
}

function DesktopVariantSelectorSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton shape="text" className="h-2.5 w-20" />
        <Skeleton shape="text" className="h-10 w-3/4" />
      </div>
      <div className="space-y-1.5">
        <Skeleton shape="text" className="h-9 w-44" />
        <Skeleton shape="text" className="h-3 w-full" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28" />
        ))}
      </div>
      <Skeleton shape="pill" className="h-12 w-full" />
    </div>
  );
}

function MobileGradeShowcaseSkeleton() {
  return (
    <section className="app-section cv-auto">
      <div className="mb-4 space-y-1.5">
        <Skeleton shape="text" className="h-3 w-24" />
        <Skeleton shape="text" className="h-6 w-2/3" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3"
          >
            <Skeleton shape="pill" className="h-6 w-16 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton shape="text" className="h-3.5 w-1/2" />
              <Skeleton shape="text" className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopGradeShowcaseSkeleton() {
  return (
    <section className="cv-auto mt-20 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/40 p-8">
      <div className="mb-6 space-y-2">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-8 w-1/3" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
          >
            <Skeleton shape="pill" className="h-6 w-24" />
            <Skeleton shape="text" className="h-3 w-full" />
            <Skeleton shape="text" className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedRailSkeleton() {
  return (
    <section className="app-section cv-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-3 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {Array.from({ length: RELATED_SKELETON_COUNT }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
