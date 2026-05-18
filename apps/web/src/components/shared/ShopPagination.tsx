"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FILTER_PARAM_KEYS } from "@/lib/storefront/filterParams";

interface ShopPaginationProps {
  page: number;
  pageCount: number;
  /** Path of the current shop page, e.g. `/shop/phones`. */
  basePath: string;
}

/**
 * Numeric pagination that preserves all current filter params. Using
 * `next/link` instead of router.push because each page is statically
 * shareable and we want browsers to prefetch the next page on hover.
 */
export function ShopPagination({ page, pageCount, basePath }: ShopPaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  if (pageCount <= 1) {
    return null;
  }

  const buildHref = (target: number): string => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (target <= 1) {
      params.delete(FILTER_PARAM_KEYS.page);
    } else {
      params.set(FILTER_PARAM_KEYS.page, String(target));
    }
    const queryString = params.toString();
    const path = pathname || basePath;
    return queryString ? `${path}?${queryString}` : path;
  };

  const pageEntries = buildPageList(page, pageCount);

  return (
    <nav className="flex items-center justify-center gap-1 pt-4" aria-label="Pagination">
      <PageLink
        href={buildHref(page - 1)}
        label="Previous"
        disabled={page <= 1}
      />
      {pageEntries.map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`e${index}`} className="px-2 text-sm text-[var(--color-ink-400)]">
            …
          </span>
        ) : (
          <PageLink
            key={entry}
            href={buildHref(entry)}
            label={String(entry)}
            isActive={entry === page}
          />
        ),
      )}
      <PageLink
        href={buildHref(page + 1)}
        label="Next"
        disabled={page >= pageCount}
      />
    </nav>
  );
}

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  // Always show first + last; up to 2 neighbours around current.
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [];
  const leftBound = Math.max(2, current - 1);
  const rightBound = Math.min(total - 1, current + 1);
  pages.push(1);
  if (leftBound > 2) {
    pages.push("ellipsis");
  }
  for (let i = leftBound; i <= rightBound; i += 1) {
    pages.push(i);
  }
  if (rightBound < total - 1) {
    pages.push("ellipsis");
  }
  pages.push(total);
  return pages;
}

interface PageLinkProps {
  href: string;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
}

function PageLink({ href, label, isActive = false, disabled = false }: PageLinkProps) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="tap inline-flex h-8 select-none items-center rounded-[var(--radius-md)] px-2.5 text-[13px] font-medium text-[var(--color-ink-300)] md:h-9 md:px-3 md:text-sm"
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      scroll
      className={
        isActive
          ? "tap inline-flex h-8 items-center rounded-[var(--radius-md)] bg-[var(--color-accent-100)] px-2.5 text-[13px] font-semibold text-[var(--color-accent-800)] transition-colors md:h-9 md:px-3 md:text-sm"
          : "tap inline-flex h-8 items-center rounded-[var(--radius-md)] px-2.5 text-[13px] font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-surface-muted)] md:h-9 md:px-3 md:text-sm"
      }
    >
      {label}
    </Link>
  );
}
