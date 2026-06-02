import { Suspense } from "react";
import { buildProcessFlows } from "@/app/_components/home/homeProcessFlows";
import {
  DesktopGrades,
  DesktopHero,
  DesktopProcessSection,
  DesktopShopTypesSection,
  DesktopVisitStore,
} from "@/app/_components/home/homePageDesktopSections";
import {
  DesktopGradesFallback,
  DesktopHeroFallback,
  DesktopProcessFallback,
  DesktopShopTypesFallback,
  DesktopVisitStoreFallback,
  MobileGradesFallback,
  MobileHeroFallback,
  MobileProcessFallback,
  MobileShopTypesFallback,
  MobileVisitStoreFallback,
} from "@/app/_components/home/homePageFallbacks";
import {
  MobileGradesSection,
  MobileHero,
  MobileProcessSection,
  MobileShopTypesSection,
  MobileVisitStoreSection,
} from "@/app/_components/home/homePageMobileSections";
import {
  getHomeHeroData,
  loadHomeCategoryTiles,
  type HomePageCategory,
} from "@/lib/storefront/pageData";
import { shopHrefFromCategories } from "@/lib/catalog/productPaths";
import { getStoreSettingsCached } from "@/lib/storefront/cached";

// ISR interval is set on `app/page.tsx` (Next.js requires segment config there).

/**
 * Storefront home page.
 *
 * Render strategy — static-first, then stream:
 *   • The page itself is synchronous: the root layout, the section
 *     wrappers and the fully-static `GradesSection` paint immediately,
 *     so on first byte the user sees the page skeleton plus all the
 *     copy that doesn't depend on data ("How we grade", grade cards,
 *     trust chips, etc.).
 *   • Each data-bound section sits behind its own `<Suspense>`
 *     boundary with a content-shaped fallback. Hero, shop-type tiles,
 *     process flows, and the visit-store block all stream in
 *     independently — one slow read never blocks another.
 *   • Each Suspense child awaits ONLY the data its section actually
 *     consumes — there is no shared bundle. Hero only waits for
 *     hero-products + brands; ShopTypes only waits for categories +
 *     counts. That means a fast section never has to wait for a slow
 *     sibling's fetch before its skeleton clears.
 *   • `unstable_cache` (30s TTL, tagged) keeps cross-request dedupe so
 *     a hot homepage doesn't replay the underlying Mongo round-trips
 *     per visitor.
 */
export default function HomePage() {
  return (
    <>
      {/* Mobile only — native app layout. 1:1 with desktop structure:
           hero → shop-type tiles → process → grades (dark band) → visit + map. */}
      <div className="app-page pb-2 md:hidden space-y-4">
        <Suspense fallback={<MobileHeroFallback />}>
          <MobileHeroData />
        </Suspense>
        <Suspense fallback={<MobileShopTypesFallback />}>
          <MobileShopTypesData />
        </Suspense>
        <Suspense fallback={<MobileProcessFallback />}>
          <MobileProcessData />
        </Suspense>
        <Suspense fallback={<MobileGradesFallback />}>
          <MobileGradesSection />
        </Suspense>
        <Suspense fallback={<MobileVisitStoreFallback />}>
          <MobileVisitStoreData />
        </Suspense>
      </div>

      {/* Desktop — single layout that scales fluidly. Each section owns
           its own vertical breathing room (py-24) so the rhythm is intentional
           rather than relying on a uniform space-y wrapper. */}
      <div className="hidden md:block">
        <Suspense fallback={<DesktopHeroFallback />}>
          <DesktopHeroData />
        </Suspense>
        <Suspense fallback={<DesktopShopTypesFallback />}>
          <DesktopShopTypesData />
        </Suspense>
        <Suspense fallback={<DesktopProcessFallback />}>
          <DesktopProcessData />
        </Suspense>
        <Suspense fallback={<DesktopGradesFallback />}>
          <DesktopGrades />
        </Suspense>
        <Suspense fallback={<DesktopVisitStoreFallback />}>
          <DesktopVisitStoreData />
        </Suspense>
      </div>
    </>
  );
}

/** Active category labels for the hero scope pill, capped so the pill
 *  never overflows on narrow viewports. */
const HERO_PILL_CATEGORY_LIMIT = 3;

function toHeroCategoryLabels(categories: HomePageCategory[]): string[] {
  return categories
    .filter((category) => category.isActive)
    .slice(0, HERO_PILL_CATEGORY_LIMIT)
    .map((category) => category.label);
}

/* ─────────────────────────── Mobile data slots ─────────────────────────── */
//
// Each slot awaits only the reads its own section consumes. That way the
// hero suspense unblocks the moment brands+hero-products land, regardless of
// how slow the categories+counts join takes — and vice versa. There is no
// shared bundle anywhere on this page, so no Suspense boundary ever waits
// for a fetch it doesn't actually use.

async function MobileHeroData() {
  const [{ heroProducts }, settings, categories] = await Promise.all([
    getHomeHeroData(),
    getStoreSettingsCached(),
    loadHomeCategoryTiles(),
  ]);
  return (
    <MobileHero
      heroProducts={heroProducts}
      settings={settings}
      categoryLabels={toHeroCategoryLabels(categories)}
      shopHref={shopHrefFromCategories(categories)}
    />
  );
}

async function MobileShopTypesData() {
  const categories = await loadHomeCategoryTiles();
  return <MobileShopTypesSection categories={categories} />;
}

async function MobileProcessData() {
  const settings = await getStoreSettingsCached();
  return <MobileProcessSection flows={buildProcessFlows(settings)} />;
}

async function MobileVisitStoreData() {
  const settings = await getStoreSettingsCached();
  return <MobileVisitStoreSection settings={settings} />;
}

/* ─────────────────────────── Desktop data slots ─────────────────────────── */

async function DesktopHeroData() {
  const [{ heroProducts }, settings, categories] = await Promise.all([
    getHomeHeroData(),
    getStoreSettingsCached(),
    loadHomeCategoryTiles(),
  ]);
  return (
    <DesktopHero
      heroProducts={heroProducts}
      settings={settings}
      categoryLabels={toHeroCategoryLabels(categories)}
      shopHref={shopHrefFromCategories(categories)}
    />
  );
}

async function DesktopShopTypesData() {
  const categories = await loadHomeCategoryTiles();
  return <DesktopShopTypesSection categories={categories} />;
}

async function DesktopProcessData() {
  const settings = await getStoreSettingsCached();
  return <DesktopProcessSection flows={buildProcessFlows(settings)} />;
}

async function DesktopVisitStoreData() {
  const settings = await getStoreSettingsCached();
  return <DesktopVisitStore settings={settings} />;
}
