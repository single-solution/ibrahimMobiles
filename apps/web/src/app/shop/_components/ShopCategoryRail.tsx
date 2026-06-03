import Link from "next/link";

import { classNames } from "@store/shared";

import { Icon } from "@/components/shared/Icon";
import type { CategoryMeta } from "@/lib/core/queries";

interface ShopCategoryRailProps {
  activeSlug: string;
  categories: CategoryMeta[];
}

/**
 * Horizontal category switcher for `/shop/[category]`. Scales from a few
 * categories to many without pushing the product grid far down the page.
 */
export function ShopCategoryRail({ activeSlug, categories }: ShopCategoryRailProps) {
  const activeCategory = categories.find((category) => category.slug === activeSlug);

  return (
    <div>
      {activeCategory ? (
        <h1 className="sr-only">{activeCategory.label}</h1>
      ) : null}

      <nav
        aria-label="Shop categories"
        className="reveal-stagger -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none snap-x snap-mandatory md:mx-0 md:flex-wrap md:gap-3 md:overflow-visible md:px-0 md:pb-0"
      >
        {categories.map((category) => (
          <CategoryRailPill
            key={category.slug}
            category={category}
            isActive={category.slug === activeSlug}
          />
        ))}
      </nav>
    </div>
  );
}

function CategoryRailPill({
  category,
  isActive,
}: {
  category: CategoryMeta;
  isActive: boolean;
}) {
  const isAvailable = category.isActive;
  const className = classNames(
    "tap inline-flex w-full items-center gap-2 rounded-[var(--radius-full)] px-3.5 py-2 text-[13px] font-semibold tracking-tight transition-[background-color,color] duration-[var(--motion-fast)] md:px-4 md:py-2.5 md:text-[14px]",
    isActive
      ? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
      : isAvailable
        ? "bg-[var(--color-surface)] text-[var(--color-ink-900)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-canvas-deep)]"
        : "cursor-not-allowed bg-[var(--color-canvas-deep)]/50 text-[var(--color-ink-500)] opacity-80",
  );

  const inner = (
    <>
      <Icon
        node={category.iconNode}
        size={16}
        strokeWidth={2.2}
        className="shrink-0"
      />
      <span className="whitespace-nowrap">{category.label}</span>
      {!isAvailable && (
        <span className="rounded-full bg-[var(--color-ink-100)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-500)]">
          Soon
        </span>
      )}
    </>
  );

  const pill = !isAvailable ? (
    <span aria-disabled className={className}>
      {inner}
    </span>
  ) : (
    <Link
      href={`/shop/${category.slug}`}
      scroll={false}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {inner}
    </Link>
  );

  // Reveal lives on the wrapper so the pill keeps its own interaction
  // transitions (`.tap`, hover border) — `.reveal` is unlayered and would
  // otherwise clobber the pill's `transition-*` utilities.
  return <div className="reveal flex shrink-0 snap-start">{pill}</div>;
}

interface ShopCategoryHubGridProps {
  categories: CategoryMeta[];
}

/** Full category chooser for `/shop` when multiple categories exist. */
export function ShopCategoryHubGrid({ categories }: ShopCategoryHubGridProps) {
  return (
    <div className="reveal-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {categories.map((category) => (
        <div key={category.slug} className="reveal h-full">
          <CategoryHubCard category={category} />
        </div>
      ))}
    </div>
  );
}

function CategoryHubCard({ category }: { category: CategoryMeta }) {
  const isAvailable = category.isActive;
  const inner = (
    <div
      className={classNames(
        /* Concentric: inner icon well --radius-md (8) + p-5/p-6
           (20/24) → outer 28/32 ≈ --radius-3xl (32). */
        "flex h-full min-h-[7.5rem] flex-col items-start justify-between gap-4 rounded-[var(--radius-3xl)] border p-5 transition-[border-color,box-shadow,transform] duration-[var(--motion-fast)] md:min-h-[8.5rem] md:p-6",
        isAvailable
          ? "border-[var(--color-ink-100)] bg-[var(--color-surface)] hover:-translate-y-0.5 hover:border-[var(--color-accent-300)]/50 hover:shadow-[var(--shadow-md)]"
          : "cursor-not-allowed border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 opacity-75",
      )}
    >
      <span className="grid size-12 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent-400)]/30 bg-gradient-to-br from-[var(--color-accent-50)] to-[var(--color-accent-100)]/60 text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]">
        <Icon node={category.iconNode} size={22} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 w-full space-y-1">
        <p className="font-semibold tracking-tight text-[var(--color-ink-900)] md:text-[17px]">
          {category.label}
        </p>
        {!isAvailable && (
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-500)]">
            Coming soon
          </span>
        )}
      </div>
    </div>
  );

  if (!isAvailable) {
    return <div aria-disabled>{inner}</div>;
  }

  return (
    <Link href={`/shop/${category.slug}`} className="group block h-full focus:outline-none">
      {inner}
    </Link>
  );
}
