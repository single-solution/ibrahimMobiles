import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { GradesByCategoryTabs } from "@/app/_components/home/GradesByCategoryTabs";
import { HeroMaskSweepHeadline } from "@/app/_components/home/HeroMaskSweepHeadline";
import { HeroTrendingProductBand } from "@/app/_components/home/HeroTrendingProductBand";
import {
  HeroTrustHints,
  ShopTypeCard,
  StoreMapEmbed,
  type HeroProps,
  type ProcessSectionProps,
  type ShopTypesSectionProps,
  type VisitStoreSectionProps,
} from "@/app/_components/home/homePageDesktopSections";
import { KineticHeading } from "@/components/shared/motion/KineticHeading";
import { MagneticHover } from "@/components/shared/motion/MagneticHover";
import { getPaymentMethods } from "@store/shared";
import {
  getStorefrontCategoriesCached,
  getStorefrontGradesCached,
} from "@/lib/storefront/cached";
import { buildGradeCategoryGroups } from "@/lib/storefront/gradeGroups";
import {
  HOME_FEATURED_CATEGORY_COUNT,
  getHomeCategoryGridClass,
  shouldShowBrowseAllCategories,
} from "@/lib/storefront/categoryDisplay";
import type { HomePageCategory } from "@/lib/storefront/pageData";

export const MOBILE_CATEGORY_STAGGER_MS = 80;



export function CategorySectionHeadline({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return <>Every category.</>;
  }
  /* Each category label sits on its own line. Single-word labels
     (e.g. "Samsung", "Audio") must never break across lines — if the
     container ever gets narrow, the eye expects the label to overflow,
     not to split mid-word. */
  if (labels.length <= 3) {
    return (
      <>
        {labels.map((label) => (
          <span key={label} className="block whitespace-nowrap">
            {label}.
          </span>
        ))}
      </>
    );
  }
  return (
    <>
      <span className="block whitespace-nowrap">{labels[0]}.</span>
      <span className="block whitespace-nowrap">{labels[1]}.</span>
      <span className="block whitespace-nowrap text-[var(--color-accent-700)]">
        & more.
      </span>
    </>
  );
}

export function MobileShopTypesSection({ categories }: ShopTypesSectionProps) {
  const featured = categories.slice(0, HOME_FEATURED_CATEGORY_COUNT);
  const showBrowseAll = shouldShowBrowseAllCategories(categories.length);
  const headlineLabels = categories.map((category) => category.label);

  return (
    <section className="app-section cv-auto">
      <div className="reveal mb-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Browse by category
        </p>
        <h2 className="font-headline mt-1 text-[28px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase">
          <CategorySectionHeadline labels={headlineLabels} />
        </h2>
        <p className="mt-2 max-w-prose text-[13px] leading-snug text-[var(--color-ink-600)]">
          One shop. One graded standard. Tap a category to start browsing.
        </p>
      </div>
      <div className={`reveal-stagger ${getHomeCategoryGridClass(featured.length, "mobile")}`}>
        {featured.map((meta, index) => (
          <ShopTypeCard
            key={meta.slug}
            meta={meta}
            variant="mobile"
            delayMs={(index + 1) * MOBILE_CATEGORY_STAGGER_MS}
          />
        ))}
      </div>
      {showBrowseAll ? (
        <Link
          href="/shop"
          className="cta-arrow tap mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-accent-700)] active:bg-[var(--color-canvas-deep)]"
        >
          Browse all categories
          <ArrowRight size={13} />
        </Link>
      ) : null}
    </section>
  );
}

export function MobileHero({ heroProducts, settings, categoryLabels, shopHref }: HeroProps) {
  const productNames = heroProducts.map((product) => product.name);
  const pillLabel = categoryLabels.length > 0 ? categoryLabels.join(" · ") : "Shop every category";

  return (
    <section
      className="relative -mx-4 flex flex-col items-center justify-evenly overflow-hidden border-b border-[var(--color-ink-100)] px-4 text-center"
      style={{
        minHeight:
          "calc(100dvh - var(--mobile-header-h) - var(--mobile-tabbar-h))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 55%, var(--color-canvas)) 0%, var(--color-canvas) 55%, var(--color-canvas) 100%)",
      }}
    >
      <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]">
        <BadgeCheck size={11} />
        {pillLabel}
      </span>

      <div className="relative z-10">
        <HeroMaskSweepHeadline variant="mobile" />
      </div>

      <div className="relative z-10 w-full">
        <HeroTrendingProductBand productNames={productNames} variant="mobile" />
      </div>

      <div className="relative z-10 flex w-full flex-col items-center gap-3">
        <MagneticHover strength={0.3} maxOffset={25}>
          <Link
            href={shopHref}
            className="cta-arrow tap inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--color-accent-500)] px-6 text-[14px] font-semibold text-[var(--color-ink-900)] shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--color-accent-500)_70%,transparent)] transition-shadow active:bg-[var(--color-accent-600)]"
          >
            Visit store
            <ArrowUpRight size={15} strokeWidth={2.4} />
          </Link>
        </MagneticHover>
      </div>

      <a
        href="#how-to-buy"
        aria-label="Scroll to next section"
        className="hero-scroll-cue tap group relative z-10 inline-flex flex-col items-center gap-1 text-[var(--color-ink-500)] active:text-[var(--color-ink-900)]"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
          We Are Different
        </span>
        <ChevronDown size={18} strokeWidth={2.2} className="animate-bounce" />
      </a>
    </section>
  );
}

export function MobileProcessSection({ flows }: ProcessSectionProps) {
  return (
    <section id="how-to-buy" className="app-section cv-auto">
      <div className="reveal mb-7 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          How it works
        </p>
        <KineticHeading
          as="h2"
          lines={["Three flows", "behind every order"]}
          stagger={0.028}
          className="font-headline mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase"
        />
        <p className="mx-auto mt-3 max-w-prose text-[13px] leading-snug text-[var(--color-ink-500)]">
          From sourcing to refund — every step on record.
        </p>
      </div>
      <div className="reveal-stagger space-y-4">
        {flows.map((flow) => {
          const Icon = flow.icon;
          return (
            <div
              key={flow.key}
              className="reveal overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
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
                      <p className="mt-0.5 max-w-prose text-[12px] leading-snug text-[var(--color-ink-600)]">
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

export async function MobileGradesSection() {
  // Hard-failing the homepage if the Grade collection is unreachable would
  // be a terrible UX — render an empty grid (the surrounding section copy
  // is still useful) instead of throwing.
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
    <section className="cv-auto -mx-4 mt-20 bg-[var(--color-ink-900)] px-4 py-14 text-[var(--color-canvas)]">
      <div className="reveal space-y-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-400)]">
          How we grade
        </p>
        <KineticHeading
          as="h2"
          lines={["Honest grades.", "No surprises."]}
          stagger={0.03}
          className="font-headline text-[44px] font-semibold leading-[0.95] tracking-[-0.01em] uppercase"
          lineClassNames={["", "text-[var(--color-accent-300)]"]}
        />
        <p className="mx-auto max-w-prose text-[13px] leading-snug text-[var(--color-ink-300)]">
          Thorough condition check — then a grade for that category. We pick it, we stand behind it.
        </p>
      </div>
      <GradesByCategoryTabs groups={groups} variant="mobile" />
      <Link
        href="#how-to-buy"
        className="cta-arrow tap mt-8 inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--color-on-dark-15)] bg-[var(--color-on-dark-06)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-accent-300)] active:bg-[var(--color-on-dark-10)]"
      >
        Read our inspection process
        <ArrowRight size={13} />
      </Link>
    </section>
  );
}

export function MobileVisitStoreSection({ settings }: VisitStoreSectionProps) {
  return (
    <section id="contact" className="app-section cv-auto">
      <div className="reveal mb-7 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Visit · Call · Chat
        </p>
        <KineticHeading
          as="h2"
          lines={["Walk in", "or order online"]}
          stagger={0.03}
          className="font-headline mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.01em] text-[var(--color-ink-900)] uppercase"
          lineClassNames={["", "text-[var(--color-accent-700)]"]}
        />
        <p className="mx-auto mt-3 max-w-prose text-[13px] leading-snug text-[var(--color-ink-500)]">
          Visit the store to inspect stock in person — or message us, we ship anywhere in the country.
        </p>
      </div>

      <div
        className="reveal overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]"
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
              {getPaymentMethods(settings).map((paymentMethod) => (
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
              Nationwide delivery
            </p>
            <p className="text-[11.5px] text-[var(--color-ink-500)]">
              Same-day in-city · 1–3 days nationwide
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}