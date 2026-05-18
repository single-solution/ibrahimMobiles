import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { OfferCard } from "@/components/shared/OfferCard";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStorefrontOffersCached } from "@/lib/storefront/cached";
import { getStorefrontProductsOnOffer } from "@/lib/storefront";
import { formatRelativeDate, logger, type Offer, type Product } from "@store/shared";

/**
 * Safe wrappers around the two reads this page consumes.
 *
 * Build-time resilience: when Mongo is unreachable during prerender,
 * the page should still emit a valid (empty) deals layout rather than
 * crash the entire build. ISR (`revalidate: 60`) means the first
 * request after deploy retries the reads and populates the cache,
 * so degradation is brief.
 */
async function loadOffers(): Promise<Offer[]> {
  try {
    return await getStorefrontOffersCached();
  } catch (error) {
    logger.error(
      { error },
      "deals: offers load failed, falling back to empty list this render",
    );
    return [];
  }
}

async function loadProductsOnSale(limit: number): Promise<Product[]> {
  try {
    return await getStorefrontProductsOnOffer(limit);
  } catch (error) {
    logger.error(
      { error },
      "deals: products-on-sale load failed, falling back to empty list this render",
    );
    return [];
  }
}

export const metadata: Metadata = {
  title: "Today's deals",
  description: "Live offers, weekly drops and bank-transfer discounts on pre-owned phones.",
};

// Offers + discounted-products list refresh on a slow cadence; a 60-second
// ISR window keeps the page near-real-time without serving a fresh Mongo
// aggregation on every visit.
export const revalidate = 60;

const PRODUCTS_ON_OFFER_LIMIT = 24;
const MOBILE_PRODUCT_SKELETON_COUNT = 6;
const DESKTOP_PRODUCT_SKELETON_COUNT = 8;
const OFFER_SKELETON_COUNT = 2;

const ACCENT_BG: Record<string, string> = {
  emerald: "#0f766e",
  amber: "#ea580c",
  rose: "#e11d48",
  sky: "#0f172a",
};

/**
 * Deals page.
 *
 * Render strategy:
 *   The page intro (hero eyebrow + headline + subtitle) is fully
 *   static — it renders synchronously on first byte. The two data
 *   blocks (live offers list and the on-sale products grid) each
 *   sit behind their own `<Suspense>` boundary, so they stream in
 *   independently and one slow query never blocks the other.
 */
export default function DealsPage() {
  return (
    <>
      {/* Mobile only — native */}
      <div className="app-page pb-6 pt-3 md:hidden">
        <section className="app-section flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]">
            <Sparkles size={11} />
            Live offers
          </span>
          <h1 className="mt-3 text-[26px] font-semibold leading-[1.05] tracking-tight text-[var(--color-ink-900)]">
            Today&apos;s deals
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-snug text-[var(--color-ink-600)]">
            Weekly drops, bundle deals and a flat 5% off on full bank transfer.
          </p>
        </section>

        <Suspense fallback={<MobileOffersFallback />}>
          <MobileOffers />
        </Suspense>

        <section className="app-section">
          <Suspense fallback={<MobileProductsFallback />}>
            <MobileProductsOnSale />
          </Suspense>
        </section>
      </div>

      {/* Desktop — single layout */}
      <div className="mx-auto hidden max-w-[1440px] px-6 py-12 md:block">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            <Sparkles size={12} />
            Live offers
          </p>
          <h1 className="text-5xl font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)]">
            Today&apos;s deals
          </h1>
          <p className="max-w-2xl text-base text-[var(--color-ink-600)]">
            Weekly drops, bundle deals and a flat 5% off on full bank transfer.
          </p>
        </header>

        <Suspense fallback={<DesktopOffersFallback />}>
          <DesktopOffers />
        </Suspense>

        <section className="mt-20 space-y-6">
          <Suspense fallback={<DesktopProductsSectionFallback />}>
            <DesktopProductsSection />
          </Suspense>
        </section>
      </div>
    </>
  );
}

/* ─────────────────────── Mobile data slots ─────────────────────── */

async function MobileOffers() {
  const offers = await loadOffers();
  if (offers.length === 0) {
    return null;
  }
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Active offers</span>
      </div>
      <ul className="app-list">
        {offers.map((offer) => (
          <li key={offer.id} id={offer.slug}>
            <Link href={`/deals#${offer.slug}`} className="app-list-row">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold uppercase text-white"
                style={{ backgroundColor: ACCENT_BG[offer.accentColor] }}
              >
                {offer.discountLabel.split(" ")[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                  {offer.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-500)]">
                  <Clock size={11} />
                  {formatRelativeDate(offer.expiresAt)}
                </p>
              </div>
              <ArrowRight size={13} className="shrink-0 text-[var(--color-ink-400)]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function MobileProductsOnSale() {
  const offeredProducts = await loadProductsOnSale(PRODUCTS_ON_OFFER_LIMIT);
  return (
    <>
      <div className="app-section-eyebrow">
        <span>Phones on sale</span>
        <span className="lowercase tracking-normal text-[var(--color-ink-500)]">
          {offeredProducts.length} phones
        </span>
      </div>
      {offeredProducts.length === 0 ? (
        <DealsEmpty />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
          {offeredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────── Desktop data slots ─────────────────────── */

async function DesktopOffers() {
  const offers = await loadOffers();
  if (offers.length === 0) {
    return null;
  }
  return (
    <section className="mt-16 grid grid-cols-2 gap-4">
      {offers.map((offer) => (
        <div key={offer.id} id={offer.slug}>
          <OfferCard offer={offer} size="lg" />
        </div>
      ))}
    </section>
  );
}

async function DesktopProductsSection() {
  // Single fetch — header (count) and grid both need the same list.
  const offeredProducts = await loadProductsOnSale(PRODUCTS_ON_OFFER_LIMIT);
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
            Phones on sale
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-500)]">
            {offeredProducts.length} device{offeredProducts.length === 1 ? "" : "s"} with an active offer.
          </p>
        </div>
      </div>
      {offeredProducts.length === 0 ? (
        <DealsEmpty />
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {offeredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}

function DealsEmpty() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 p-10 text-center text-[13px] text-[var(--color-ink-500)]">
      No active deals right now — fresh ones every Friday.
    </div>
  );
}

/* ─────────────────────── Suspense fallbacks ─────────────────────── */

function MobileOffersFallback() {
  return (
    <section className="app-section">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton shape="text" className="h-3 w-32" />
      </div>
      <ul className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        {Array.from({ length: OFFER_SKELETON_COUNT }).map((_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 border-b border-[var(--color-ink-100)] p-3 last:border-b-0"
          >
            <Skeleton shape="circle" className="size-9 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton shape="text" className="h-3.5 w-3/4" />
              <Skeleton shape="text" className="h-3 w-1/3" />
            </div>
            <Skeleton shape="circle" className="size-4" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobileProductsFallback() {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Skeleton shape="text" className="h-3 w-28" />
        <Skeleton shape="text" className="h-3 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {Array.from({ length: MOBILE_PRODUCT_SKELETON_COUNT }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </>
  );
}

function DesktopOffersFallback() {
  return (
    <section className="mt-16 grid grid-cols-2 gap-4">
      {Array.from({ length: OFFER_SKELETON_COUNT }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6"
        >
          <Skeleton shape="pill" className="h-6 w-24" />
          <Skeleton shape="text" className="h-6 w-3/4" />
          <Skeleton shape="text" className="h-3 w-full" />
          <Skeleton shape="text" className="h-3 w-2/3" />
          <div className="mt-auto flex items-center justify-between gap-3">
            <Skeleton shape="text" className="h-3 w-32" />
            <Skeleton shape="pill" className="h-10 w-32" />
          </div>
        </div>
      ))}
    </section>
  );
}

function DesktopProductsSectionFallback() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton shape="text" className="h-10 w-64" />
        <Skeleton shape="text" className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-4 gap-5">
        {Array.from({ length: DESKTOP_PRODUCT_SKELETON_COUNT }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </>
  );
}
