import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  ChevronDown,
  Clock,
  MapPin,
  Sparkles,
  Undo2,
  Video,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/shared/Icon";
import {
  StructuredContentCompact,
  StructuredContentFull,
} from "@/components/shared/StructuredContent";
import { GradesByCategoryTabs } from "@/app/_components/home/GradesByCategoryTabs";
import { HeroMaskSweepHeadline } from "@/app/_components/home/HeroMaskSweepHeadline";
import { HeroTrendingProductBand } from "@/app/_components/home/HeroTrendingProductBand";
import type { ProcessFlow } from "@/app/_components/home/homeProcessFlows";
import { KineticHeading } from "@/components/shared/motion/KineticHeading";
import { MagneticHover } from "@/components/shared/motion/MagneticHover";
import { SectionAmbience } from "@/components/shared/motion/SectionAmbience";
import {
  getPaymentMethods,
  type Product as StorefrontProductType,
  type StoreSettings,
} from "@store/shared";
import {
  getStorefrontCategoriesCached,
  getStorefrontGradesCached,
} from "@/lib/storefront/cached";
import { buildGradeCategoryGroups } from "@/lib/storefront/gradeGroups";
import {
  HOME_FEATURED_CATEGORY_COUNT,
  formatCategorySectionTitle,
  getHomeCategoryGridClass,
  shouldShowBrowseAllCategories,
} from "@/lib/storefront/categoryDisplay";
import type { HomePageCategory } from "@/lib/storefront/pageData";

export const DESKTOP_CATEGORY_STAGGER_MS = 100;

/** Google Maps zoom level used in the embedded store-locator iframe — 17
 *  reads as "street level" without showing individual building outlines. */
export const MAP_EMBED_ZOOM = 17;

export interface HeroProps {
  heroProducts: StorefrontProductType[];
  settings: StoreSettings;
  /** Active storefront category labels, shown in the hero scope pill. */
  categoryLabels: string[];
  /**
   * Pre-resolved storefront entry URL — the first active category
   * (`/shop/<slug>`) so the CTA lands on real content directly instead
   * of bouncing through the `/shop` → first-category server redirect.
   */
  shopHref: string;
}

/** Neutral fallback when no categories are configured yet. */
const HERO_PILL_FALLBACK = "Shop every category";

export interface ShopTypesSectionProps {
  categories: HomePageCategory[];
}

export interface ProcessSectionProps {
  flows: ProcessFlow[];
}

export interface VisitStoreSectionProps {
  settings: StoreSettings;
}

export function HeroTrustHints({
  settings,
  variant,
}: {
  settings: StoreSettings;
  variant: "mobile" | "desktop";
}) {
  const items = [
    { icon: Undo2, label: `${settings.moneybackDays}-day moneyback` },
    { icon: Video, label: "Video before dispatch" },
    {
      icon: Banknote,
      label: `${settings.bankTransferDiscountPercent}% off bank transfer`,
    },
  ] as const;

  if (variant === "mobile") {
    /* Flex-wrap + `justify-center` so the items cluster as a group in
       the middle (not stretched into grid cells where each label would
       hug the left of its cell and lose the centred feel). With the
       three current labels the first two land on row 1 and the third
       naturally wraps to a centred row 2 — the layout the design asks
       for, without the grid's column-anchored alignment. */
    return (
      <ul className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-ink-600)]">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5">
            <Icon size={13} className="shrink-0 text-[var(--color-accent-600)]" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[var(--color-ink-500)]">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon size={15} className="text-[var(--color-accent-600)]" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function DesktopHero({ heroProducts, settings, categoryLabels, shopHref }: HeroProps) {
  const productNames = heroProducts.map((product) => product.name);
  const pillLabel = categoryLabels.length > 0 ? categoryLabels.join(" · ") : HERO_PILL_FALLBACK;

  return (
    <section
      data-magnetic-field
      className="relative flex overflow-hidden border-b border-[var(--color-ink-100)]"
      style={{
        minHeight: "calc(100dvh - var(--desktop-header-h))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 60%, var(--color-canvas)) 0%, var(--color-canvas) 60%, var(--color-canvas) 100%)",
      }}
    >
      <div
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-evenly px-6 text-center"
        style={{ minHeight: "calc(100dvh - var(--desktop-header-h))" }}
      >
        <Pill tone="accent" size="md" leadingIcon={<BadgeCheck size={12} />}>
          {pillLabel}
        </Pill>

        <HeroMaskSweepHeadline variant="desktop" />

        <HeroTrendingProductBand productNames={productNames} variant="desktop" />

        <div className="flex flex-col items-center gap-6">
          <MagneticHover fieldSelector="[data-magnetic-field]" strength={0.08} maxOffset={14}>
            <ButtonLink
              href={shopHref}
              variant="primary"
              size="lg"
              className="cta-arrow !rounded-full shadow-[0_12px_36px_-16px_color-mix(in_srgb,var(--color-accent-500)_75%,transparent)]"
              trailingIcon={<ArrowUpRight size={17} strokeWidth={2.4} />}
            >
              Visit store
            </ButtonLink>
          </MagneticHover>
        </div>

        <a
          href="#how-to-buy"
          aria-label="Scroll to next section"
          className="hero-scroll-cue tap group inline-flex flex-col items-center gap-1 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">We Are Different</span>
          <ChevronDown size={20} strokeWidth={2.2} className="animate-bounce" />
        </a>
      </div>
    </section>
  );
}

/**
 * Desktop "Browse by category" section — sits between the hero and the
 * process narrative. Slimmer than the /shop landing chooser (this is a
 * teaser, not the storefront). Each card links into its respective category.
 */
export function DesktopShopTypesSection({ categories }: ShopTypesSectionProps) {
  const featured = categories.slice(0, HOME_FEATURED_CATEGORY_COUNT);
  const showBrowseAll = shouldShowBrowseAllCategories(categories.length);
  const headlineLabels = categories.map((category) => category.label);

  return (
    <section className="cv-auto relative mx-auto max-w-[1440px] overflow-hidden px-6 py-24">
      <SectionAmbience intensity="soft" side="right" />
      <div className="relative z-10 reveal">
        <DesktopSectionHeader
          eyebrow="Browse by category"
          title={formatCategorySectionTitle(headlineLabels)}
          description="One graded standard across every category — pick a category to start browsing."
        />
      </div>
      <div
        className={`relative z-10 reveal mt-12 ${getHomeCategoryGridClass(featured.length, "desktop")}`}
        style={{ ["--reveal-delay" as string]: "120ms" }}
      >
        {featured.map((meta, index) => (
          <ShopTypeCard
            key={meta.slug}
            meta={meta}
            variant="desktop"
            delayMs={(index + 1) * DESKTOP_CATEGORY_STAGGER_MS}
          />
        ))}
      </div>
      {showBrowseAll ? (
        <div className="relative z-10 reveal mt-8 text-center">
          <Link
            href="/shop"
            className="cta-arrow tap inline-flex items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-5 py-2.5 text-[14px] font-semibold text-[var(--color-accent-700)] hover:border-[var(--color-ink-300)]"
          >
            Browse all categories
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Default gradient applied to category cards. Phase 3 (Categories
 * workspace) will let admins author a per-category gradient or accent
 * colour; for now every card shares the same warm gradient so the home
 * page reads as a single design system rather than ad-hoc per-id swatches.
 */
const SHOP_TYPE_DEFAULT_GRADIENT =
  "from-[var(--color-accent-100)] via-[var(--color-accent-50)] to-[var(--color-canvas)]";

export interface ShopTypeCardProps {
  meta: HomePageCategory;
  variant: "mobile" | "desktop";
  delayMs: number;
}

export function ShopTypeCard({ meta, variant, delayMs }: ShopTypeCardProps) {
  const isActive = meta.isActive;

  const inner = (
    <div
      /* Concentric radii: mobile inner --radius-lg (14) + p-3.5 (14) →
         outer 28 ≈ --radius-2xl (24, within 2px). Desktop inner
         --radius-lg (14) + p-6 (24) → outer 38 ≈ --radius-3xl (32,
         within 6px). See radius table in globals.css. */
      className={`reveal lift relative flex h-full overflow-hidden border bg-gradient-to-br ${SHOP_TYPE_DEFAULT_GRADIENT} ${
        isActive
          ? "border-[var(--color-ink-100)] hover:border-[var(--color-ink-200)]"
          : "cursor-not-allowed border-dashed border-[var(--color-ink-200)] opacity-80"
      } ${variant === "desktop" ? "min-h-[240px] flex-col rounded-[var(--radius-3xl)] p-6" : "min-h-[110px] flex-row items-center gap-3 rounded-[var(--radius-2xl)] p-3.5"}`}
      style={{ ["--reveal-delay" as string]: `${delayMs}ms` }}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-[var(--radius-lg)] border border-[var(--color-accent-400)]/25 bg-[var(--color-accent-500)]/10 text-[var(--color-accent-800)] ${
          variant === "desktop" ? "size-12 p-2.5" : "size-11 p-2"
        }`}
        aria-hidden
      >
        <ShopTypeIcon category={meta} />
      </span>

      <div className={variant === "desktop" ? "mt-4 flex-1 flex flex-col" : "min-w-0 flex-1"}>
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`font-semibold tracking-tight text-[var(--color-ink-900)] ${
              variant === "desktop" ? "text-2xl" : "text-[16px]"
            }`}
          >
            {meta.label}
          </h3>
          {!isActive && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-500)]">
              <Clock size={10} /> Soon
            </span>
          )}
        </div>
        <StructuredContentCompact
          content={meta.content}
          fallback={meta.description}
          clampLines={variant === "desktop" ? 3 : 2}
          className={`mt-1 leading-snug text-[var(--color-ink-700)] ${
            variant === "desktop" ? "text-[14px]" : "text-[12.5px]"
          }`}
        />
        {meta.content?.bullets?.length ? (
          <StructuredContentFull
            content={{ summary: "", bullets: meta.content.bullets }}
            maxBullets={variant === "desktop" ? 3 : 2}
            iconColor="var(--color-accent-700)"
            iconSize={variant === "desktop" ? 13 : 12}
            iconSizeClass={variant === "desktop" ? "size-[13px]" : "size-3"}
            className={variant === "desktop" ? "mt-3" : "mt-2"}
            bulletItemClassName={
              variant === "desktop"
                ? "text-[13px] text-[var(--color-ink-700)]"
                : "text-[12px] text-[var(--color-ink-700)]"
            }
          />
        ) : null}

        <div className={variant === "desktop" ? "mt-auto pt-4" : "mt-1.5"}>
          <span
            className={`cta-arrow inline-flex items-center gap-1 font-semibold ${
              isActive
                ? "text-[var(--color-accent-700)]"
                : "text-[var(--color-ink-500)]"
            } ${variant === "desktop" ? "text-[12.5px]" : "text-[12px]"}`}
          >
            {isActive ? `Browse ${meta.label.toLowerCase()}` : "Notify me"}
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
    <Link href={`/shop/${meta.slug}`} className="tap group block focus:outline-none">
      {inner}
    </Link>
  );
}

export function ShopTypeIcon({ category }: { category: HomePageCategory }) {
  return (
    <Icon node={category.iconNode} className="size-full" />
  );
}

export function DesktopProcessSection({ flows }: ProcessSectionProps) {
  return (
    <section
      id="how-to-buy"
      className="cv-auto relative mx-auto max-w-[1440px] scroll-mt-[var(--desktop-header-h)] overflow-hidden px-6 py-24"
    >
      <SectionAmbience intensity="soft" side="left" />
      <div className="relative z-10">
        <div className="reveal">
          <DesktopSectionHeader
            eyebrow="How it works"
            title="Three flows behind every order."
            description="From sourcing to refund — every step on record."
          />
        </div>
        <div className="reveal-stagger mt-12 grid grid-cols-3 gap-4">
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
                        <p className="mt-0.5 max-w-prose text-[12.5px] text-[var(--color-ink-600)]">
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
      </div>
    </section>
  );
}

export async function DesktopGrades() {
  let gradeDescriptors: Awaited<ReturnType<typeof getStorefrontGradesCached>> = [];
  let categories: Awaited<ReturnType<typeof getStorefrontCategoriesCached>> = [];
  try {
    [gradeDescriptors, categories] = await Promise.all([
      getStorefrontGradesCached(),
      getStorefrontCategoriesCached(),
    ]);
  } catch {
    gradeDescriptors = [];
    categories = [];
  }

  const groups = buildGradeCategoryGroups(
    gradeDescriptors,
    categories.map((category) => ({
      slug: category.slug,
      label: category.label,
      sortOrder: category.sortOrder,
    })),
  );

  return (
    <section className="cv-auto bg-[var(--color-ink-900)] py-24 text-[var(--color-canvas)]">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="grid grid-cols-[1fr_2fr] gap-12">
          <div className="reveal space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-400)]">
              How we grade
            </p>
            <KineticHeading
              as="h2"
              lines={["Honest grades.", "No surprises."]}
              stagger={0.026}
              className="font-headline text-[72px] font-semibold leading-[0.92] tracking-[-0.015em] uppercase"
              lineClassNames={["", "text-[var(--color-accent-300)]"]}
            />
            <p className="max-w-prose text-base text-[var(--color-ink-300)]">
              Every unit goes through a thorough condition check before it lists. We assign a grade for that category — and stand behind it.
            </p>
            <Link
              href="#how-to-buy"
              className="cta-arrow tap inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)]"
            >
              Read our inspection process
              <ArrowRight size={14} />
            </Link>
          </div>
          <GradesByCategoryTabs groups={groups} variant="desktop" />
        </div>
      </div>
    </section>
  );
}

export function DesktopVisitStore({ settings }: VisitStoreSectionProps) {
  return (
    <section id="contact" className="cv-auto relative mx-auto max-w-[1440px] overflow-hidden px-6 py-24">
      <SectionAmbience intensity="soft" side="right" />
      <div
        className="relative z-10 reveal overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
      >
        <div className="grid grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-7 p-10">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
                Visit · Call · Chat
              </p>
              <KineticHeading
                as="h2"
                lines={["Walk in", "or order online"]}
                stagger={0.026}
                className="font-headline text-[72px] font-semibold leading-[0.92] tracking-[-0.015em] text-[var(--color-ink-900)] uppercase"
              />
              <p className="max-w-prose text-base text-[var(--color-ink-600)]">
                Visit the store to inspect stock in person and walk out the same day. Prefer to order? Message us and we&apos;ll ship anywhere in the country.
              </p>
            </div>

            {/* Concentric: inner --radius-md (8) + p-4 (16) → outer
                --radius-2xl (24). */}
            <div className="rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-4">
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
                  {getPaymentMethods(settings).map((paymentMethod) => (
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
                  Nationwide delivery
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
                  Same-day in-city · 1–3 days nationwide
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

export interface DesktopSectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function DesktopSectionHeader({ eyebrow, title, description, ctaHref, ctaLabel }: DesktopSectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          {eyebrow}
        </p>
        <KineticHeading
          as="h2"
          lines={title}
          stagger={0.028}
          className="font-headline mt-2 text-[64px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase"
        />
        <p className="mt-3 max-w-prose text-base text-[var(--color-ink-600)]">
          {description}
        </p>
      </div>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="cta-arrow tap inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]"
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export interface StoreMapEmbedProps {
  className?: string;
  settings: StoreSettings;
}

export function StoreMapEmbed({ className = "", settings }: StoreMapEmbedProps) {
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
        className="tap absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/95 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-900)] shadow-[var(--shadow-md)] backdrop-blur hover:bg-[var(--color-surface)]"
      >
        <MapPin size={12} className="text-[var(--color-accent-700)]" />
        Open in Maps
      </a>
    </div>
  );
}