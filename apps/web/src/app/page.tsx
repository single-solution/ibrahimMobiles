import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Cable,
  ChevronDown,
  Gamepad2,
  MapPin,
  PackageOpen,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Undo2,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import {
  PAYMENT_METHODS,
  type Brand,
  type Phone as PhoneType,
  type ProductCategory,
  type StoreSettings,
} from "@store/shared";

import { gradeDescriptors } from "@/data/grades";
import { productHref } from "@/data/products";
import { getDefaultVariant } from "@/lib/productSummary";
import { getStoreSettingsCached } from "@/lib/storefront/cached";
import {
  getHomeHeroData,
  getHomeShopTypesData,
  type HomePageCategory,
} from "@/lib/storefront/pageData";

// Catalog content (hero phones, categories, brands, offers) changes minute-
// to-minute at most. ISR with a 30-second window means admin price/stock
// edits surface within half a minute, while serving 100% of traffic from
// the data cache between rebuilds. That collapses ~5 cold Mongo queries per
// visit down to one every 30s per server instance.
export const revalidate = 30;

const MOBILE_CATEGORY_STAGGER_MS = 80;
const DESKTOP_CATEGORY_STAGGER_MS = 100;
/** Tiles shown in the mobile hero gallery (centre + two flanking). */
const MOBILE_HERO_TILE_COUNT = 3;
/** Trust chips visible in each desktop category card. */
const DESKTOP_TRUST_CHIP_COUNT = 3;
/** Google Maps zoom level used in the embedded store-locator iframe — 17
 *  reads as "street level" without showing individual building outlines. */
const MAP_EMBED_ZOOM = 17;

type ProcessFlowKey = "store" | "order" | "return";

interface ProcessFlowStep {
  title: string;
  detail: string;
}

interface ProcessFlow {
  key: ProcessFlowKey;
  label: string;
  caption: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  steps: ProcessFlowStep[];
}

/**
 * Three flows behind every order — what we do (store), what you do (order),
 * what we promise (return). Powers the unified `*ProcessSection` blocks.
 *
 * Built per-request from the resolved `StoreSettings` so admin changes to
 * the moneyback window / discount % surface here without a redeploy.
 */
function buildProcessFlows(settings: StoreSettings): ProcessFlow[] {
  return [
    {
      key: "store",
      label: "Store",
      caption: "How we curate",
      icon: PackageOpen,
      steps: [
        { title: "Source", detail: "Direct from verified Pakistani importers and trusted resellers." },
        { title: "Inspect", detail: "32-point bench check — battery, screen, cameras, every button." },
        { title: "Grade & verify", detail: "IMEI on PTA, graded by stock category with honest condition notes." },
        { title: "Channel-tag", detail: "Brand-new, genuine, refurbished, box-open, china-pack or LCD-shaded — all flagged up front." },
      ],
    },
    {
      key: "order",
      label: "Order",
      caption: "How you buy",
      icon: ShoppingBag,
      steps: [
        { title: "Pick", detail: "Browse by brand, grade or budget." },
        {
          title: "Confirm & pay",
          detail: `WhatsApp to lock the unit — advance, or full bank for ${settings.bankTransferDiscountPercent}% off.`,
        },
        { title: "Video proof", detail: "Short video — IMEI, screen, body — on WhatsApp before dispatch." },
        { title: "Dispatch", detail: "Same-day Lahore, 1–3 days nationwide. Tracked courier." },
      ],
    },
    {
      key: "return",
      label: "Return",
      caption: "What we promise",
      icon: ShieldCheck,
      steps: [
        {
          title: `${settings.moneybackDays}-day moneyback`,
          detail: `Change your mind, full refund within ${settings.moneybackDays} days.`,
        },
        { title: "3–6 month warranty", detail: "By grade. Brand-new gets 12-month company warranty." },
        { title: "Lifetime service", detail: "We service genuine faults at Hall Road even after warranty." },
        { title: "Not covered", detail: "Physical damage, liquid ingress, screen cracks, unauthorised repairs." },
      ],
    },
  ];
}

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
 *     hero-phones + brands; ShopTypes only waits for categories +
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
        <MobileGradesSection />
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
        <DesktopGrades />
        <Suspense fallback={<DesktopVisitStoreFallback />}>
          <DesktopVisitStoreData />
        </Suspense>
      </div>
    </>
  );
}

/* ─────────────────────────── Mobile data slots ─────────────────────────── */
//
// Each slot awaits only the reads its own section consumes. That way the
// hero suspense unblocks the moment brands+hero-phones land, regardless of
// how slow the categories+counts join takes — and vice versa. There is no
// shared bundle anywhere on this page, so no Suspense boundary ever waits
// for a fetch it doesn't actually use.

async function MobileHeroData() {
  const { heroPhones, brands } = await getHomeHeroData();
  return <MobileHero heroPhones={heroPhones} brands={brands} />;
}

async function MobileShopTypesData() {
  const categories = await getHomeShopTypesData();
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
  const { heroPhones, brands } = await getHomeHeroData();
  return <DesktopHero heroPhones={heroPhones} brands={brands} />;
}

async function DesktopShopTypesData() {
  const categories = await getHomeShopTypesData();
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

/* ─────────────────────────── Suspense fallbacks ─────────────────────────── */

const MOBILE_HERO_TILE_FALLBACK_COUNT = 3;
const DESKTOP_HERO_TILE_FALLBACK_COUNT = 5;
const SHOP_TYPE_FALLBACK_COUNT = 3;
const PROCESS_FLOW_FALLBACK_COUNT = 3;
const PROCESS_STEP_FALLBACK_COUNT = 4;

function MobileHeroFallback() {
  return (
    <section
      className="relative -mx-4 flex items-center border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]"
      style={{
        minHeight:
          "calc(100dvh - var(--mobile-header-h) - var(--mobile-tabbar-h))",
      }}
    >
      <div className="flex w-full flex-col items-center gap-6 px-4 pb-24 pt-8 text-center">
        <Skeleton shape="pill" className="h-6 w-56" />
        <Skeleton shape="text" className="h-[90px] w-3/4" />
        <div className="grid w-full grid-cols-3 items-center gap-1.5">
          {Array.from({ length: MOBILE_HERO_TILE_FALLBACK_COUNT }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] w-full" />
          ))}
        </div>
        <Skeleton shape="pill" className="h-11 w-full" />
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-left">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} shape="text" className="h-3 w-32" />
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileShopTypesFallback() {
  return (
    <section className="app-section">
      <div className="mb-3 space-y-2">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-[80px] w-3/4" />
        <Skeleton shape="text" className="h-3 w-2/3" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: SHOP_TYPE_FALLBACK_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
          >
            <Skeleton className="size-12 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton shape="text" className="h-4 w-32" />
              <Skeleton shape="text" className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileProcessFallback() {
  return (
    <section id="how-to-buy" className="app-section">
      <div className="mb-7 space-y-2 text-center">
        <Skeleton shape="text" className="mx-auto h-3 w-24" />
        <Skeleton shape="text" className="mx-auto h-12 w-3/4" />
        <Skeleton shape="text" className="mx-auto h-3 w-2/3" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: PROCESS_FLOW_FALLBACK_COUNT }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
          >
            <div className="flex items-center gap-2.5 bg-[var(--color-ink-900)] px-3.5 py-3">
              <Skeleton shape="circle" className="size-8 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton shape="text" className="h-2.5 w-16" />
                <Skeleton shape="text" className="h-3 w-32" />
              </div>
            </div>
            <ol>
              {Array.from({ length: PROCESS_STEP_FALLBACK_COUNT }).map((_, stepIndex) => (
                <li
                  key={stepIndex}
                  className="flex items-start gap-2.5 border-b border-[var(--color-ink-100)] px-3.5 py-3 last:border-b-0"
                >
                  <Skeleton shape="circle" className="size-6 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton shape="text" className="h-3 w-32" />
                    <Skeleton shape="text" className="h-2.5 w-3/4" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileVisitStoreFallback() {
  return (
    <section id="contact" className="app-section">
      <div className="mb-7 space-y-2 text-center">
        <Skeleton shape="text" className="mx-auto h-3 w-32" />
        <Skeleton shape="text" className="mx-auto h-12 w-3/4" />
        <Skeleton shape="text" className="mx-auto h-3 w-2/3" />
      </div>
      <div className="overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <Skeleton className="aspect-[16/9] w-full rounded-none" />
        <div className="space-y-3 p-3.5">
          <div className="flex items-start gap-2.5">
            <Skeleton shape="circle" className="size-8 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton shape="text" className="h-3.5 w-40" />
              <Skeleton shape="text" className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopHeroFallback() {
  return (
    <section className="relative flex min-h-[calc(100dvh-var(--desktop-header-h))] items-center border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-16 text-center">
        <Skeleton shape="pill" className="h-7 w-72" />
        <Skeleton shape="text" className="h-[140px] w-2/3" />
        <div className="grid w-full grid-cols-5 items-center gap-2">
          {Array.from({ length: DESKTOP_HERO_TILE_FALLBACK_COUNT }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] w-full" />
          ))}
        </div>
        <Skeleton shape="pill" className="h-12 w-48" />
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} shape="text" className="h-4 w-40" />
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopShopTypesFallback() {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <div className="space-y-3">
        <Skeleton shape="text" className="h-3 w-32" />
        <Skeleton shape="text" className="h-10 w-2/3" />
        <Skeleton shape="text" className="h-3 w-3/4" />
      </div>
      <div className="mt-12 grid grid-cols-3 gap-5">
        {Array.from({ length: SHOP_TYPE_FALLBACK_COUNT }).map((_, index) => (
          <div
            key={index}
            className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6"
          >
            <Skeleton className="size-12" />
            <Skeleton shape="text" className="h-6 w-32" />
            <Skeleton shape="text" className="h-3 w-full" />
            <Skeleton shape="text" className="h-3 w-2/3" />
            <div className="flex gap-2">
              {Array.from({ length: DESKTOP_TRUST_CHIP_COUNT }).map((_, chipIndex) => (
                <Skeleton key={chipIndex} shape="pill" className="h-6 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopProcessFallback() {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <Skeleton shape="text" className="mx-auto h-3 w-24" />
        <Skeleton shape="text" className="mx-auto h-12 w-3/4" />
        <Skeleton shape="text" className="mx-auto h-3 w-2/3" />
      </div>
      <div className="mt-12 grid grid-cols-3 gap-5">
        {Array.from({ length: PROCESS_FLOW_FALLBACK_COUNT }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
          >
            <div className="space-y-2 bg-[var(--color-ink-900)] px-5 py-4">
              <Skeleton shape="text" className="h-2.5 w-16" />
              <Skeleton shape="text" className="h-4 w-32" />
            </div>
            <ol>
              {Array.from({ length: PROCESS_STEP_FALLBACK_COUNT }).map((_, stepIndex) => (
                <li
                  key={stepIndex}
                  className="flex items-start gap-3 border-b border-[var(--color-ink-100)] p-5 last:border-b-0"
                >
                  <Skeleton shape="circle" className="size-8 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton shape="text" className="h-3.5 w-32" />
                    <Skeleton shape="text" className="h-3 w-full" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopVisitStoreFallback() {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <div className="grid grid-cols-2 gap-12">
        <div className="space-y-4">
          <Skeleton shape="text" className="h-3 w-32" />
          <Skeleton shape="text" className="h-12 w-3/4" />
          <Skeleton shape="text" className="h-3 w-full" />
          <Skeleton shape="text" className="h-3 w-2/3" />
        </div>
        <Skeleton className="aspect-[4/3] w-full" />
      </div>
    </section>
  );
}

/* ─────────────────────────── Mobile (native) ─────────────────────────── */

/**
 * Mobile hero — structural mirror of DesktopHero:
 *   - `relative` section sized to fill the visible viewport (above the bottom
 *     tab bar, below the sticky mobile header)
 *   - vertically-centered content stack: pill → split-accent headline →
 *     3-tile gallery → primary CTA → trust row
 *   - scroll cue absolutely positioned at the bottom (out of the content flow)
 *   - same `--color-canvas-deep → --color-canvas` gradient backdrop as desktop
 *     so the visual identity is consistent across breakpoints.
 */
interface HeroProps {
  heroPhones: PhoneType[];
  brands: Brand[];
}

function MobileHero({ heroPhones, brands }: HeroProps) {
  return (
    <section
      className="relative -mx-4 flex items-center border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]"
      style={{
        minHeight:
          "calc(100dvh - var(--mobile-header-h) - var(--mobile-tabbar-h))",
      }}
    >
      <div className="flex w-full flex-col items-center gap-6 px-4 pb-24 pt-8 text-center">
        <span
          className="reveal inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]"
          style={{ ["--reveal-delay" as string]: "60ms" }}
        >
          <Recycle size={11} />
          Phones · Accessories · Gadgets
        </span>
        <h1
          className="reveal font-display text-[110px] leading-[0.85] tracking-[-0.02em] text-[var(--color-ink-900)] opacity-80 uppercase"
          style={{ ["--reveal-delay" as string]: "140ms" }}
        >
          pre owned
          <span className="block text-[var(--color-accent-700)]">mobiles</span>
        </h1>

        <div
          className="reveal w-full pt-1"
          style={{ ["--reveal-delay" as string]: "240ms" }}
        >
          <MobileHeroGallery heroPhones={heroPhones} brands={brands} />
        </div>

        <Link
          href="/shop"
          className="cta-arrow tap reveal inline-flex h-11 items-center justify-center gap-1.5 self-stretch rounded-full bg-[var(--color-accent-500)] px-5 text-[14px] font-semibold text-[var(--color-ink-900)] active:bg-[var(--color-accent-600)]"
          style={{ ["--reveal-delay" as string]: "320ms" }}
        >
          Visit store
          <ArrowUpRight size={15} strokeWidth={2.4} />
        </Link>

        <ul
          className="reveal grid w-full grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-left text-[12px] text-[var(--color-ink-600)]"
          style={{ ["--reveal-delay" as string]: "400ms" }}
        >
          <li className="flex items-center gap-1.5">
            <Undo2 size={13} className="shrink-0 text-[var(--color-accent-600)]" />
            <span>15-day moneyback</span>
          </li>
          <li className="flex items-center gap-1.5">
            <BadgeCheck size={13} className="shrink-0 text-[var(--color-pak-green)]" />
            <span>PTA-approved</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Video size={13} className="shrink-0 text-[var(--color-accent-600)]" />
            <span>Video before dispatch</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Banknote size={13} className="shrink-0 text-[var(--color-accent-600)]" />
            <span>5% off bank transfer</span>
          </li>
        </ul>
      </div>

      <div className="absolute inset-x-0 bottom-6 z-10 flex w-full justify-center px-4">
        <a
          href="#how-to-buy"
          aria-label="Scroll to next section"
          className="hero-scroll-cue group inline-flex flex-col items-center gap-1 text-[var(--color-ink-500)] transition-colors active:text-[var(--color-ink-900)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
            We Are Different
          </span>
          <ChevronDown size={18} strokeWidth={2.2} className="animate-bounce" />
        </a>
      </div>
    </section>
  );
}

/**
 * 3-tile stage for the mobile hero — center phone is the star (scaled +
 * shadow + caption + grade), flanking tiles tilt outward like postcards.
 * Source is the same 5 hero phones the desktop layout uses, sliced to
 * the middle three for a balanced composition at one-thumb width.
 */
function MobileHeroGallery({ heroPhones, brands }: HeroProps) {
  // When we have a full hero set, drop the flanking edge tile from each side
  // so the centre phone sits between two visually similar siblings; otherwise
  // we fall back to whatever the data layer returned.
  const heroFull = heroPhones.length >= MOBILE_HERO_TILE_COUNT + 2;
  const trimStart = heroFull ? 1 : 0;
  const phones = heroFull
    ? heroPhones.slice(trimStart, trimStart + MOBILE_HERO_TILE_COUNT)
    : heroPhones.slice(0, MOBILE_HERO_TILE_COUNT);
  if (phones.length === 0) {
    return <HeroGalleryEmpty variant="mobile" />;
  }
  return (
    <div className="grid grid-cols-3 items-center gap-1.5">
      {phones.map((phone, index) => {
        const isCenter = index === 1;
        const tilt = index === 0 ? "-rotate-6" : index === 2 ? "rotate-6" : "";
        const tone = isCenter ? "z-10 scale-105 shadow-[var(--shadow-md)]" : "";
        return (
          <div key={phone.slug} className={isCenter ? "" : tilt}>
            <HeroGalleryTile
              phone={phone}
              brands={brands}
              className={`aspect-[3/4] ${tone}`}
              imageSizes="(max-width: 640px) 30vw, 200px"
              showCaption={isCenter}
              showGrade={isCenter}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hero gallery placeholder shown when the catalogue has zero phones — happens
 * on a brand-new install before the admin has added inventory.
 */
function HeroGalleryEmpty({ variant }: { variant: "mobile" | "desktop" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] text-center text-[var(--color-ink-500)] ${
        variant === "mobile" ? "h-[180px] text-[12px]" : "h-[260px] text-[14px]"
      }`}
    >
      <p className="px-6">
        New stock dropping soon — add your first phone in admin to light this up.
      </p>
    </div>
  );
}

/**
 * Mobile-tuned "Browse by category" section. Stacks 3 full-width cards
 * (Phones, Accessories, Gadgets) right after the hero so a customer landing
 * on mobile immediately sees what the store sells beyond phones, and can
 * tap into the right category. Each card uses the category meta defined in
 * `@/data/products` so changing the taxonomy updates the homepage too.
 */
interface ShopTypesSectionProps {
  categories: HomePageCategory[];
}

function MobileShopTypesSection({ categories }: ShopTypesSectionProps) {
  return (
    <section className="app-section">
      <div className="reveal mb-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Browse by category
        </p>
        <h2 className="font-headline mt-1 text-[28px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase">
          Phones.
          <br />
          Accessories.
          <br />
          Gadgets.
        </h2>
        <p className="mt-2 text-[13px] leading-snug text-[var(--color-ink-600)]">
          One shop. One graded standard. Tap a category to start browsing.
        </p>
      </div>
      <div className="space-y-2.5">
        {categories.map((meta, index) => (
          <ShopTypeCard
            key={meta.id}
            meta={meta}
            variant="mobile"
            delayMs={(index + 1) * MOBILE_CATEGORY_STAGGER_MS}
          />
        ))}
      </div>
    </section>
  );
}

interface ProcessSectionProps {
  flows: ProcessFlow[];
}

function MobileProcessSection({ flows }: ProcessSectionProps) {
  return (
    <section id="how-to-buy" className="app-section">
      <div className="reveal mb-7 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          How it works
        </p>
        <h2 className="font-headline mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase">
          Three flows
          <span className="block">behind every order</span>
        </h2>
        <p className="mt-3 text-[13px] leading-snug text-[var(--color-ink-500)]">
          From sourcing to refund — every step on record.
        </p>
      </div>
      <div className="reveal-stagger space-y-4">
        {flows.map((flow) => {
          const Icon = flow.icon;
          return (
            <div
              key={flow.key}
              className="reveal overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
            >
              <div className="flex items-center gap-2.5 bg-[var(--color-ink-900)] px-3.5 py-3 text-[var(--color-canvas)]">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-400)]">
                    {flow.label}
                  </p>
                  <p className="text-[13px] font-semibold leading-tight">
                    {flow.caption}
                  </p>
                </div>
              </div>
              <ol className="divide-y divide-[var(--color-ink-100)]">
                {flow.steps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-2.5 px-3.5 py-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-accent-800)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-tight text-[var(--color-ink-900)]">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-600)]">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Mirrors `DesktopGrades` — same `--color-ink-900` band, accent eyebrow,
 * Barlow Condensed accent headline, six grade cards with translucent white surfaces.
 * Full-bleed via `-mx-4` so the dark band runs edge-to-edge on mobile
 * (the parent `.app-page` has 16px horizontal padding we need to escape).
 */
function MobileGradesSection() {
  return (
    <section className="-mx-4 mt-20 bg-[var(--color-ink-900)] px-4 py-14 text-[var(--color-canvas)]">
      <div className="reveal space-y-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-400)]">
          How we grade
        </p>
        <h2 className="font-headline text-[44px] font-semibold leading-[0.95] tracking-[-0.01em] uppercase">
          Honest grades.
          <span className="block text-[var(--color-accent-300)]">No surprises.</span>
        </h2>
        <p className="text-[13px] leading-snug text-[var(--color-ink-300)]">
          A 32-point inspection — then one of six grades. We pick it, we stand behind it.
        </p>
      </div>
      <ul className="reveal-stagger mt-8 grid grid-cols-2 gap-2.5">
        {gradeDescriptors.map((descriptor) => (
          <li
            key={descriptor.grade}
            className="reveal flex flex-col gap-2 rounded-[14px] border border-white/10 bg-white/[0.06] p-3"
          >
            <GradeBadge grade={descriptor.grade} size="sm" />
            <p className="text-[12.5px] leading-snug text-[var(--color-canvas)]">
              {descriptor.description}
            </p>
            <p className="text-[11px] leading-snug text-[var(--color-ink-300)]">
              {descriptor.functionalNotes}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href="#how-to-buy"
        className="cta-arrow tap mt-8 inline-flex w-full items-center justify-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-accent-300)] active:bg-white/10"
      >
        Read our inspection process
        <ArrowRight size={13} />
      </Link>
    </section>
  );
}

interface VisitStoreSectionProps {
  settings: StoreSettings;
}

function MobileVisitStoreSection({ settings }: VisitStoreSectionProps) {
  return (
    <section id="contact" className="app-section">
      <div className="reveal mb-7 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Visit · Call · Chat
        </p>
        <h2 className="font-headline mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase">
          Walk in to
          <span className="block text-[var(--color-accent-700)]">Hall Road</span>
        </h2>
        <p className="mt-3 text-[13px] leading-snug text-[var(--color-ink-500)]">
          Hold the phone, test it for yourself — or message us, we ship anywhere in Pakistan.
        </p>
      </div>

      <div
        className="reveal overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
      >
        <StoreMapEmbed className="aspect-[16/9]" settings={settings} />
        <div className="flex items-start gap-2.5 p-3.5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
            <MapPin size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight text-[var(--color-ink-900)]">
              {settings.storeAddressLine1}
            </p>
            <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
              {settings.storeAddressLine2} · {settings.storeHours}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-[var(--color-ink-100)] p-3.5">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Payment we accept
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {PAYMENT_METHODS.map((paymentMethod) => (
                <li
                  key={paymentMethod.id}
                  className="rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-2 py-0.5 text-[11px] text-[var(--color-ink-700)]"
                >
                  {paymentMethod.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Delivery
            </p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--color-ink-900)]">
              Across all of Pakistan
            </p>
            <p className="text-[11.5px] text-[var(--color-ink-500)]">
              Same-day in Lahore · 1–3 days nationwide
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Live Google Maps iframe pinned to the store address. Uses the public
 * `output=embed` query — no API key needed. The address comes from runtime
 * `StoreSettings` so an admin edit moves the pin without a deploy. A small
 * "Open in Maps" pill in the corner deep-links to the canonical short URL
 * (`socialGoogleMaps`) since iframes capture clicks and the parent can't be
 * a bare <Link>.
 */
interface StoreMapEmbedProps {
  className?: string;
  settings: StoreSettings;
}

function StoreMapEmbed({ className = "", settings }: StoreMapEmbedProps) {
  const mapQuery = `${settings.storeAddressLine1}, ${settings.storeAddressLine2}`;
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${MAP_EMBED_ZOOM}&output=embed`;
  return (
    <div className={`relative w-full overflow-hidden bg-[var(--color-canvas-deep)] ${className}`}>
      <iframe
        title={`Map of ${mapQuery}`}
        src={mapEmbedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
      <a
        href={settings.socialGoogleMaps}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/95 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-900)] shadow-[var(--shadow-md)] backdrop-blur transition-colors hover:bg-[var(--color-surface)]"
      >
        <MapPin size={12} className="text-[var(--color-accent-700)]" />
        Open in Maps
      </a>
    </div>
  );
}

/* ─────────────────────────── Desktop (preserved) ─────────────────────────── */

function DesktopHero({ heroPhones, brands }: HeroProps) {
  return (
    <section className="relative flex min-h-[calc(100dvh-var(--desktop-header-h))] items-center border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-16 text-center">
        <div
          className="reveal"
          style={{ ["--reveal-delay" as string]: "60ms" }}
        >
          <Pill tone="accent" size="md" leadingIcon={<Recycle size={12} />}>
            Phones · Accessories · Gadgets — graded honestly
          </Pill>
        </div>
        <h1
          className="reveal font-display text-[150px] leading-[0.82] tracking-[-0.02em] text-[var(--color-ink-900)] opacity-80 uppercase"
          style={{ ["--reveal-delay" as string]: "140ms" }}
        >
          pre-owned
          <span className="block text-[var(--color-accent-700)]">mobiles</span>
        </h1>
        <div
          className="reveal w-full pt-2"
          style={{ ["--reveal-delay" as string]: "260ms" }}
        >
          <HeroGallery heroPhones={heroPhones} brands={brands} />
        </div>
        <div
          className="reveal flex flex-wrap items-center justify-center gap-3 pt-2"
          style={{ ["--reveal-delay" as string]: "360ms" }}
        >
          <ButtonLink
            href="/shop"
            variant="primary"
            size="lg"
            className="cta-arrow"
            trailingIcon={<ArrowUpRight size={17} strokeWidth={2.4} />}
          >
            Visit store
          </ButtonLink>
        </div>
        <div
          className="reveal flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-sm text-[var(--color-ink-500)]"
          style={{ ["--reveal-delay" as string]: "440ms" }}
        >
          <div className="flex items-center gap-2">
            <Undo2 size={15} className="text-[var(--color-accent-600)]" />
            <span>15-day moneyback</span>
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck size={15} className="text-[var(--color-pak-green)]" />
            <span>PTA-approved options</span>
          </div>
          <div className="flex items-center gap-2">
            <Video size={15} className="text-[var(--color-accent-600)]" />
            <span>Video before dispatch</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote size={15} className="text-[var(--color-accent-600)]" />
            <span>5% off on bank transfer</span>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-6 z-10 flex w-full justify-center px-6">
        <a
          href="#how-to-buy"
          aria-label="Scroll to next section"
          className="hero-scroll-cue group inline-flex flex-col items-center gap-1 text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink-900)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">We Are Different</span>
          <ChevronDown size={20} strokeWidth={2.2} className="animate-bounce" />
        </a>
      </div>
    </section>
  );
}

/* ─────── Hero gallery — 5-tile stage with center emphasis ─────── */

interface GalleryTileProps {
  phone: PhoneType;
  brands: Brand[];
  className?: string;
  imageSizes?: string;
  objectFit?: "cover" | "contain";
  showCaption?: boolean;
  showGrade?: boolean;
}

function HeroGalleryTile({
  phone,
  brands,
  className = "",
  imageSizes = "(max-width: 1024px) 30vw, 280px",
  objectFit = "cover",
  showCaption = true,
  showGrade = true,
}: GalleryTileProps) {
  const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
  const brandName = brand?.name ?? phone.brandSlug;
  const defaultVariant = getDefaultVariant(phone);
  return (
    <Link
      href={productHref(phone)}
      className={`gallery-tile group relative block overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] ${className}`}
    >
      <ProductImage
        imageUrl={phone.imageUrl}
        brandName={brandName}
        modelName={phone.modelName}
        colorName={defaultVariant.colorName}
        brandSlug={phone.brandSlug}
        sizes={imageSizes}
        objectFit={objectFit}
      />
      {showGrade && (
        <span className="absolute right-2 top-2 z-10">
          <GradeBadge grade={defaultVariant.grade} size="sm" />
        </span>
      )}
      {showCaption && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2 pt-6 text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
            {brandName}
          </p>
          <p className="line-clamp-1 text-[12.5px] font-semibold text-white">
            {phone.modelName}
          </p>
        </div>
      )}
    </Link>
  );
}

/**
 * 5-tile stage: the center phone is the star (scaled up + shadow + caption),
 * the four flanking tiles tilt outward but stay full-color and full-fidelity.
 * Tiles use object-cover so each phone fills its frame edge-to-edge while
 * preserving aspect ratio — no stretch, no letterboxing.
 */
const HERO_GALLERY_TILT_BY_INDEX: Record<number, string> = {
  0: "-rotate-6",
  1: "-rotate-2",
  3: "rotate-2",
  4: "rotate-6",
};

function HeroGallery({ heroPhones, brands }: HeroProps) {
  if (heroPhones.length === 0) {
    return <HeroGalleryEmpty variant="desktop" />;
  }
  return (
    <div className="grid grid-cols-5 items-center gap-2">
      {heroPhones.map((phone, index) => {
        const isCenter = index === 2;
        const tilt = HERO_GALLERY_TILT_BY_INDEX[index] ?? "";
        const tone = isCenter ? "z-10 scale-105 shadow-[var(--shadow-lg)]" : "";
        return (
          <div key={phone.slug} className={isCenter ? "" : tilt}>
            <HeroGalleryTile
              phone={phone}
              brands={brands}
              className={`aspect-[3/4] ${tone}`}
              imageSizes="(max-width: 1024px) 18vw, 200px"
              showCaption={isCenter}
              showGrade={isCenter}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Desktop "Browse by category" section — sits between the hero and the
 * process narrative. Slimmer than the /shop landing chooser (this is a
 * teaser, not the storefront). Each card links into its respective category.
 */
function DesktopShopTypesSection({ categories }: ShopTypesSectionProps) {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <div className="reveal">
        <DesktopSectionHeader
          eyebrow="Browse by category"
          title="Phones, accessories, gadgets."
          description="One shop, three categories. Every item graded by the same honest standard — pick a category to start."
        />
      </div>
      <div
        className="reveal mt-12 grid grid-cols-3 gap-5"
        style={{ ["--reveal-delay" as string]: "120ms" }}
      >
        {categories.map((meta, index) => (
          <ShopTypeCard
            key={meta.id}
            meta={meta}
            variant="desktop"
            delayMs={(index + 1) * DESKTOP_CATEGORY_STAGGER_MS}
          />
        ))}
      </div>
    </section>
  );
}

const SHOP_TYPE_ICON: Record<
  ProductCategory,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  phone: Smartphone,
  accessory: Cable,
  gadget: Gamepad2,
};

const SHOP_TYPE_GRADIENT: Record<ProductCategory, string> = {
  phone: "from-[var(--color-accent-100)] via-[var(--color-accent-50)] to-[var(--color-canvas)]",
  accessory: "from-[#E8F4FF] via-[#F4FAFF] to-[var(--color-canvas)]",
  gadget: "from-[#F4F0FF] via-[#FAF7FF] to-[var(--color-canvas)]",
};

interface ShopTypeCardProps {
  meta: HomePageCategory;
  variant: "mobile" | "desktop";
  delayMs: number;
}

function ShopTypeCard({ meta, variant, delayMs }: ShopTypeCardProps) {
  const Icon = SHOP_TYPE_ICON[meta.id];
  const itemCount = meta.itemCount;
  const isActive = meta.isActive;

  const inner = (
    <div
      className={`reveal lift relative flex h-full overflow-hidden rounded-[var(--radius-xl)] border bg-gradient-to-br ${SHOP_TYPE_GRADIENT[meta.id]} ${
        isActive
          ? "border-[var(--color-ink-100)] hover:border-[var(--color-ink-200)]"
          : "cursor-not-allowed border-dashed border-[var(--color-ink-200)] opacity-80"
      } ${variant === "desktop" ? "min-h-[240px] flex-col p-6" : "min-h-[110px] flex-row items-center gap-3 p-3.5"}`}
      style={{ ["--reveal-delay" as string]: `${delayMs}ms` }}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-surface)] text-[var(--color-ink-900)] shadow-[var(--shadow-sm)] ${
          variant === "desktop" ? "size-12" : "size-11"
        }`}
      >
        <Icon size={variant === "desktop" ? 22 : 20} strokeWidth={2} />
      </span>

      <div className={variant === "desktop" ? "mt-4 flex-1 flex flex-col" : "min-w-0 flex-1"}>
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`font-semibold tracking-tight text-[var(--color-ink-900)] ${
              variant === "desktop" ? "text-2xl" : "text-[16px]"
            }`}
          >
            {meta.pluralLabel}
          </h3>
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-700)]">
              {itemCount}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-500)]">
              <Sparkles size={10} /> Soon
            </span>
          )}
        </div>
        <p
          className={`mt-1 leading-snug text-[var(--color-ink-700)] ${
            variant === "desktop" ? "text-[14px]" : "line-clamp-2 text-[12.5px]"
          }`}
        >
          {meta.tagline}
        </p>

        {variant === "desktop" && (
          <ul className="mt-4 space-y-1">
            {meta.trustChips.slice(0, DESKTOP_TRUST_CHIP_COUNT).map((chip) => (
              <li
                key={chip}
                className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-700)]"
              >
                <ShieldCheck size={11} className="text-[var(--color-accent-700)]" />
                {chip}
              </li>
            ))}
          </ul>
        )}

        <div className={variant === "desktop" ? "mt-auto pt-4" : "mt-1.5"}>
          <span
            className={`cta-arrow inline-flex items-center gap-1 font-semibold ${
              isActive
                ? "text-[var(--color-accent-700)]"
                : "text-[var(--color-ink-500)]"
            } ${variant === "desktop" ? "text-[12.5px]" : "text-[12px]"}`}
          >
            {isActive ? `Browse ${meta.pluralLabel.toLowerCase()}` : "Notify me"}
            <ArrowUpRight size={12} strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </div>
  );

  if (!isActive) {
    return inner;
  }
  return (
    <Link href={`/shop/${meta.pathSegment}`} className="group block focus:outline-none">
      {inner}
    </Link>
  );
}

function DesktopProcessSection({ flows }: ProcessSectionProps) {
  return (
    <section
      id="how-to-buy"
      className="mx-auto max-w-[1440px] scroll-mt-[var(--desktop-header-h)] px-6 py-24"
    >
      <div className="reveal">
        <DesktopSectionHeader
          eyebrow="How it works"
          title="Three flows behind every order."
          description="From sourcing to refund — every step on record."
        />
      </div>
      <div className="reveal-stagger mt-8 grid grid-cols-3 gap-4">
        {flows.map((flow) => {
          const Icon = flow.icon;
          return (
            <div
              key={flow.key}
              className="reveal flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center gap-3 bg-[var(--color-ink-900)] px-6 py-4 text-[var(--color-canvas)]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-400)]">
                    {flow.label}
                  </p>
                  <p className="text-[14px] font-semibold leading-tight">
                    {flow.caption}
                  </p>
                </div>
              </div>
              <ol className="flex flex-1 flex-col gap-4 p-6">
                {flow.steps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] text-[12px] font-semibold text-[var(--color-accent-800)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 leading-snug">
                      <p className="text-[14px] font-semibold text-[var(--color-ink-900)]">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-600)]">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DesktopGrades() {
  return (
    <section className="bg-[var(--color-ink-900)] py-24 text-[var(--color-canvas)]">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="grid grid-cols-[1fr_2fr] gap-12">
          <div className="reveal space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-400)]">
              How we grade
            </p>
            <h2 className="font-headline text-[72px] font-semibold leading-[0.92] tracking-[-0.015em] uppercase">
              Honest grades.<br />
              <span className="text-[var(--color-accent-300)]">No surprises.</span>
            </h2>
            <p className="text-base text-[var(--color-ink-300)]">
              Our 32-point inspection covers cosmetic condition, battery health, screen, cameras and every button. Then we assign one of six grades — and stand behind it.
            </p>
            <Link
              href="#how-to-buy"
              className="cta-arrow inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)]"
            >
              Read our inspection process
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="reveal-stagger grid grid-cols-3 gap-3">
            {gradeDescriptors.map((descriptor) => (
              <div
                key={descriptor.grade}
                className="reveal flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5"
              >
                <GradeBadge grade={descriptor.grade} size="sm" />
                <p className="text-sm text-[var(--color-canvas)]">{descriptor.description}</p>
                <p className="text-xs text-[var(--color-ink-300)]">{descriptor.functionalNotes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopVisitStore({ settings }: VisitStoreSectionProps) {
  return (
    <section id="contact" className="mx-auto max-w-[1440px] px-6 py-24">
      <div
        className="reveal overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
      >
        <div className="grid grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-7 p-10">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
                Visit · Call · Chat
              </p>
              <h2 className="font-headline text-[72px] font-semibold leading-[0.92] tracking-[-0.015em] text-[var(--color-ink-900)] uppercase">
                Walk in to <span className="text-[var(--color-accent-700)]">Hall Road</span>
              </h2>
              <p className="text-base text-[var(--color-ink-600)]">
                Our flagship outlet sits in the heart of Pakistan&apos;s biggest mobile market — hold the phone, test it for yourself, walk out the same day. Or message us and we ship anywhere in Pakistan.
              </p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
                  <MapPin size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                    {settings.storeAddressLine1}
                  </p>
                  <p className="text-sm text-[var(--color-ink-600)]">{settings.storeAddressLine2}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{settings.storeHours}</p>
                </div>
                <Link
                  href={settings.socialGoogleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-arrow tap inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-700)]"
                >
                  Maps
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                  Payment we accept
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((paymentMethod) => (
                    <li
                      key={paymentMethod.id}
                      className="rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink-700)]"
                    >
                      {paymentMethod.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                  Delivery
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-ink-900)]">
                  Across all of Pakistan
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
                  Same-day in Lahore · 1–3 days nationwide
                </p>
              </div>
            </div>

          </div>
          <StoreMapEmbed className="min-h-[420px]" settings={settings} />
        </div>
      </div>
    </section>
  );
}

interface DesktopSectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}

function DesktopSectionHeader({ eyebrow, title, description, ctaHref, ctaLabel }: DesktopSectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          {eyebrow}
        </p>
        <h2 className="font-headline mt-2 text-[64px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase">
          {title}
        </h2>
        <p className="mt-3 text-base text-[var(--color-ink-600)]">{description}</p>
      </div>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="cta-arrow inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]"
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
