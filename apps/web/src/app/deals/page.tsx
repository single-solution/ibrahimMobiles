import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { OfferCard } from "@/components/shared/OfferCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { ShopProductFeed } from "@/components/shared/ShopProductFeed";
import { Skeleton } from "@/components/ui/Skeleton";
import { getOffersCached, getProductsPageCached } from "@/lib/core/cached";
import type { ProductPage } from "@/lib/core";
import { getSeoSettings } from "@/lib/seo/seoSettings";
import { classNames, formatRelativeDate, logger, type Offer } from "@store/shared";

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
    return await getOffersCached();
  } catch (error) {
    logger.error(
      { error },
      "deals: offers load failed, falling back to empty list this render",
    );
    return [];
  }
}

async function loadDealsPage(): Promise<ProductPage> {
  try {
    return await getProductsPageCached({
      isFeatured: true,
      page: 1,
      limit: PRODUCTS_ON_OFFER_LIMIT,
    });
  } catch (error) {
    logger.error(
      { error },
      "deals: products-on-sale load failed, falling back to empty list this render",
    );
    return { products: [], total: 0, page: 1, pageSize: PRODUCTS_ON_OFFER_LIMIT, pageCount: 1 };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  const title = `Today's deals · ${seo.seoStoreName || seo.siteName}`;
  const description =
    seo.defaultDescription ||
    "Live offers, weekly drops and bank-transfer discounts.";
  return {
    title,
    description,
    alternates: { canonical: `${seo.siteUrl}/deals` },
    openGraph: {
      title,
      description,
      url: `${seo.siteUrl}/deals`,
      type: "website",
      images: seo.defaultOgImageUrl ? [seo.defaultOgImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: seo.defaultOgImageUrl ? [seo.defaultOgImageUrl] : undefined,
    },
  };
}

// Offers + discounted-products list refresh on a slow cadence; a 60-second
// ISR window keeps the page near-real-time without serving a fresh Mongo
// aggregation on every visit.
export const revalidate = 60;

const PRODUCTS_ON_OFFER_LIMIT = 24;
const MOBILE_PRODUCT_SKELETON_COUNT = 6;
const DESKTOP_PRODUCT_SKELETON_COUNT = 8;
const OFFER_SKELETON_COUNT = 2;


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
        <section className="reveal app-section flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]">
            <Sparkles size={11} />
            Live offers
          </span>
          <h1 className="mt-3 text-[26px] font-semibold leading-[1.05] tracking-tight text-[var(--color-ink-900)]">
            Today&apos;s deals
          </h1>
          <p className="mt-2.5 max-w-prose text-[13.5px] leading-snug text-[var(--color-ink-600)]">
            Weekly drops, bundle deals and a flat 5% off on full bank transfer.
          </p>
        </section>

        <Suspense fallback={<MobileOffersFallback />}>
          <MobileOffers />
        </Suspense>

        <section className="app-section cv-auto-lg">
          <Suspense fallback={<MobileProductsFallback />}>
            <MobileProductsOnSale />
          </Suspense>
        </section>
      </div>

      {/* Desktop — single layout */}
      <div className="mx-auto hidden w-full max-w-[1440px] px-4 pb-24 pt-6 md:block md:px-6 md:pb-16 md:pt-10 lg:px-8">
        <header className="reveal space-y-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            <Sparkles size={12} />
            Live offers
          </p>
          <h1 className="text-5xl font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)]">
            Today&apos;s deals
          </h1>
          <p className="max-w-prose text-base text-[var(--color-ink-600)]">
            Weekly drops, bundle deals and a flat 5% off on full bank transfer.
          </p>
        </header>

        <Suspense fallback={<DesktopOffersFallback />}>
          <DesktopOffers />
        </Suspense>

        <section className="cv-auto-lg mt-20 space-y-6">
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
    <section className="app-section cv-auto">
      <div className="app-section-eyebrow">
        <span>Active offers</span>
      </div>
      <ul className="reveal-stagger app-list">
        {offers.map((offer) => {
          const discountValue = offer.discountLabel.split(" ")[0];
          return (
          <li key={offer.id} id={offer.slug} className="reveal">
            <Link href={`/deals#${offer.slug}`} className="tap app-list-row">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold uppercase whitespace-nowrap"
                style={{
                  /* Soft tint over the brand canvas so a row of mixed
                     offer hues still reads as one harmonious palette. */
                  backgroundColor: `color-mix(in srgb, ${offer.color} 18%, var(--color-canvas))`,
                  color: `color-mix(in srgb, ${offer.color} 65%, var(--color-ink-900))`,
                }}
              >
                {discountValue}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">
                  {offer.title}
                </p>
                {offer.expiresAt ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-500)]">
                    <Clock size={11} />
                    {formatRelativeDate(offer.expiresAt)}
                  </p>
                ) : null}
              </div>
              <ArrowRight size={13} className="shrink-0 text-[var(--color-ink-400)]" />
            </Link>
          </li>
          );
        })}
      </ul>
    </section>
  );
}

async function MobileProductsOnSale() {
  const page = await loadDealsPage();
  return (
    <>
      <div className="reveal app-section-eyebrow">
        <span>Products on sale</span>
        <span className="lowercase tracking-normal text-[var(--color-ink-500)]">
          {page.total} items
        </span>
      </div>
      {page.products.length === 0 ? (
        <DealsEmpty />
      ) : (
        <ShopProductFeed
          initialPage={page}
          categoryLabel="deals"
          apiParams={{ featured: "1" }}
          gridClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4"
        />
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
    <section
      className={classNames(
        "reveal-stagger cv-auto mt-16",
        offers.length === 1 ? "block" : "columns-2 gap-5",
      )}
    >
      {offers.map((offer) => (
        <div key={offer.id} id={offer.slug} className="reveal mb-5 break-inside-avoid last:mb-0">
          <OfferCard offer={offer} size="lg" />
        </div>
      ))}
    </section>
  );
}

async function DesktopProductsSection() {
  const page = await loadDealsPage();
  return (
    <>
      <div className="reveal flex items-end justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
            Products on sale
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-500)]">
            {page.total} product{page.total === 1 ? "" : "s"} with an active offer.
          </p>
        </div>
      </div>
      {page.products.length === 0 ? (
        <DealsEmpty />
      ) : (
        <ShopProductFeed
          initialPage={page}
          categoryLabel="deals"
          apiParams={{ featured: "1" }}
          gridClassName="grid grid-cols-4 gap-5"
        />
      )}
    </>
  );
}

function DealsEmpty() {
  return (
    <div className="reveal rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 p-10 text-center text-[13px] text-[var(--color-ink-500)]">
      No active deals right now — fresh ones every Friday.
    </div>
  );
}

/* ─────────────────────── Suspense fallbacks ─────────────────────── */

function MobileOffersFallback() {
  return (
    <section className="app-section cv-auto">
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
    <section className="cv-auto mt-16 columns-2 gap-5">
      {Array.from({ length: OFFER_SKELETON_COUNT }).map((_, index) => (
        <div
          key={index}
          className="mb-5 flex break-inside-avoid flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6 last:mb-0"
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
