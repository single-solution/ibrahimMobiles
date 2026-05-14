import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronRight,
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
  Recycle,
  Sparkles,
  Undo2,
  Video,
  Youtube,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { PtaBadge } from "@/components/shared/PtaBadge";
import { PhoneCard } from "@/components/shared/PhoneCard";
import { ProductImage } from "@/components/shared/ProductImage";
import { BrandTile } from "@/components/shared/BrandTile";
import { brands } from "@/data/brands";
import { gradeDescriptors } from "@/data/grades";
import { getDefaultVariant, getFeaturedPhones, phones } from "@/data/phones";
import {
  SOCIAL_LINKS,
  STORE_ADDRESS_LINE_1,
  STORE_ADDRESS_LINE_2,
  STORE_HOURS,
  buildWhatsAppLink,
} from "@/lib/constants";
import { formatBatteryRange, formatPrice, formatStorage } from "@/lib/utils";

const HOMEPAGE_BRAND_SLUGS = ["apple", "samsung", "google", "xiaomi"];

export default function HomePage() {
  const featuredPhones = getFeaturedPhones();
  const heroPhone = phones.find((phone) => phone.slug === "iphone-15-pro-256-natural-titanium");

  return (
    <>
      {/* Mobile only — native app layout */}
      <div className="app-page pb-2 pt-3 md:hidden">
        <MobileIntro />
        <MobileFeaturedPick heroPhone={heroPhone} />
        <MobileBrandsSection />
        <MobileFeaturedSection featuredPhones={featuredPhones} />
        <MobileHowItWorksSection />
        <MobileGradesSection />
        <MobileVisitStoreSection />
      </div>

      {/* Desktop — single layout that scales fluidly */}
      <div className="hidden space-y-20 md:block">
        <DesktopHero heroPhone={heroPhone} />
        <DesktopBrands />
        <DesktopFeatured featuredPhones={featuredPhones} />
        <DesktopHowItWorks />
        <DesktopGrades />
        <DesktopVisitStore />
      </div>
    </>
  );
}

/* ─────────────────────────── Mobile (native) ─────────────────────────── */

function MobileIntro() {
  return (
    <section className="app-section flex flex-col items-center text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-100)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-800)]">
        <Recycle size={11} />
        Pakistan&apos;s most-trusted pre-owned phone store
      </span>
      <h1 className="mt-3 text-[26px] font-semibold leading-[1.05] tracking-tight text-[var(--color-ink-900)]">
        Pre-loved,<br />
        <span className="text-[var(--color-accent-700)]">pre-Owned.</span>
      </h1>
      <p className="mt-2.5 text-[13.5px] leading-snug text-[var(--color-ink-600)]">
        Hand-checked, graded A+ to C, and clearly tagged by stock type — brand-new, genuine, refurbished and more. PTA-approved options at half the new-phone price, with a 15-day moneyback guarantee.
      </p>
      <div className="mt-4 flex w-full items-center gap-2">
        <Link
          href="/shop"
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--color-accent-700)] px-4 text-[13.5px] font-semibold text-white active:bg-[var(--color-accent-800)]"
        >
          Shop all phones
          <ArrowRight size={13} />
        </Link>
        <a
          href={buildWhatsAppLink("Salam! I'd like to ask about a phone.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-whatsapp)] px-4 text-[13.5px] font-semibold text-white active:bg-[var(--color-whatsapp-dark)]"
        >
          <MessageCircle size={13} className="fill-white" />
          WhatsApp
        </a>
      </div>
      <ul className="mt-4 grid w-full grid-cols-2 gap-1.5">
        <IntroTrustItem icon={<Undo2 size={13} />} label="15-day moneyback" />
        <IntroTrustItem icon={<BadgeCheck size={13} />} label="PTA-approved" tone="green" />
        <IntroTrustItem icon={<Video size={13} />} label="Video before dispatch" />
        <IntroTrustItem icon={<Banknote size={13} />} label="5% off bank transfer" />
      </ul>
    </section>
  );
}

interface IntroTrustItemProps {
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "green";
}

function IntroTrustItem({ icon, label, tone = "default" }: IntroTrustItemProps) {
  return (
    <li className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2 py-1.5 text-left">
      <span className={tone === "green" ? "text-[var(--color-pak-green)]" : "text-[var(--color-accent-700)]"}>
        {icon}
      </span>
      <span className="text-[11.5px] font-medium leading-tight text-[var(--color-ink-700)]">
        {label}
      </span>
    </li>
  );
}

interface MobileFeaturedPickProps {
  heroPhone: (typeof phones)[number] | undefined;
}

function MobileFeaturedPick({ heroPhone }: MobileFeaturedPickProps) {
  if (!heroPhone) return null;
  const heroBrand = brands.find((b) => b.slug === heroPhone.brandSlug);
  const heroBrandName = heroBrand?.name ?? heroPhone.brandSlug;
  const heroVariant = getDefaultVariant(heroPhone);

  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Today&apos;s pick</span>
      </div>
      <Link
        href={`/shop/${heroPhone.slug}`}
        className="relative block overflow-hidden rounded-[18px] bg-gradient-to-br from-[var(--color-canvas-deep)] to-[var(--color-surface-muted)]"
      >
        <div className="grid grid-cols-[1fr_140px] items-stretch">
          <div className="flex flex-col justify-between gap-2.5 p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="accent" size="sm" leadingIcon={<Sparkles size={11} />}>
                Editor&apos;s pick
              </Pill>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                {heroBrandName}
              </p>
              <h2 className="mt-0.5 text-[15px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
                {heroPhone.modelName}
              </h2>
              <p className="mt-2 text-[18px] font-semibold leading-none tracking-tight text-[var(--color-accent-700)]">
                {formatPrice(heroVariant.priceRupees)}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--color-ink-500)]">
                {formatStorage(heroVariant.storageGb)} · Grade {heroVariant.grade}
              </p>
            </div>
            <span className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-[var(--color-accent-700)] px-4 text-[13px] font-semibold text-white">
              Shop now
              <ArrowRight size={13} />
            </span>
          </div>
          <div className="relative">
            <ProductImage
              imageUrl={heroPhone.imageUrl}
              brandName={heroBrandName}
              modelName={heroPhone.modelName}
              colorName={heroVariant.colorName}
              brandSlug={heroPhone.brandSlug}
              sizes="140px"
              priority
            />
            {heroVariant.isPtaApproved && (
              <div className="absolute right-2 top-2">
                <PtaBadge size="sm" />
              </div>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}

function MobileBrandsSection() {
  const homepageBrands = brands.filter((brand) => HOMEPAGE_BRAND_SLUGS.includes(brand.slug));
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Shop by brand</span>
        <Link href="/shop">All</Link>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        Every unit graded A+ to C and labelled by stock type.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {homepageBrands.map((brand) => (
          <BrandTile key={brand.slug} brand={brand} />
        ))}
      </div>
    </section>
  );
}

interface MobileFeaturedProps {
  featuredPhones: ReturnType<typeof getFeaturedPhones>;
}

function MobileFeaturedSection({ featuredPhones }: MobileFeaturedProps) {
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Latest stock arrived</span>
        <Link href="/shop">See all</Link>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        Fresh inventory off the bench — inspected, graded, and ready to ship.
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
        {featuredPhones.map((featuredPhone) => (
          <PhoneCard key={featuredPhone.id} phone={featuredPhone} />
        ))}
      </div>
    </section>
  );
}

function MobileHowItWorksSection() {
  const steps = [
    { title: "Pick your phone", body: "Browse by brand, grade, stock type or budget." },
    { title: "Confirm & pay advance", body: "WhatsApp to lock the unit, or full bank transfer for 5% off." },
    { title: "We send a video", body: "Video of your exact unit before dispatch — IMEI, screen, body." },
    { title: "Dispatch & 15-day moneyback", body: "Same-day Lahore, 1–3 days nationwide. Full refund within 15 days." },
  ];
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>How to buy</span>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        Four steps, no surprises. Or walk into our Hall Road outlet and pay on the spot.
      </p>
      <ol className="app-list">
        {steps.map((step, stepIndex) => (
          <li key={step.title} className="app-list-row">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent-100)] text-[12px] font-semibold text-[var(--color-accent-800)]">
              {stepIndex + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-tight text-[var(--color-ink-900)]">
                {step.title}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-ink-600)]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <TrustChip icon={<Undo2 size={14} />} label="15-day refund" />
        <TrustChip icon={<Banknote size={14} />} label="5% bank off" />
        <TrustChip icon={<MapPin size={14} />} label="Visit store" />
      </div>
    </section>
  );
}

interface TrustChipProps {
  icon: React.ReactNode;
  label: string;
}

function TrustChip({ icon, label }: TrustChipProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-2 py-2">
      <span className="text-[var(--color-accent-700)]">{icon}</span>
      <span className="text-[11px] font-medium text-[var(--color-ink-700)]">{label}</span>
    </div>
  );
}

function MobileGradesSection() {
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Honest grades. No surprises.</span>
        <Link href="/about#grades">Learn more</Link>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        Our 32-point inspection covers cosmetics, battery, screen, cameras and every button.
      </p>
      <ul className="app-list">
        {gradeDescriptors.map((descriptor) => (
          <li key={descriptor.grade} className="app-list-row">
            <GradeBadge grade={descriptor.grade} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[var(--color-ink-900)]">
                {descriptor.shortLabel}
              </p>
              <p className="line-clamp-1 text-[12px] text-[var(--color-ink-500)]">
                {descriptor.description}
              </p>
            </div>
            <ChevronRight size={14} className="shrink-0 text-[var(--color-ink-400)]" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobileVisitStoreSection() {
  const socials = [
    { href: SOCIAL_LINKS.facebook, label: "Facebook", icon: <Facebook size={14} /> },
    { href: SOCIAL_LINKS.instagram, label: "Instagram", icon: <Instagram size={14} /> },
    { href: SOCIAL_LINKS.tiktok, label: "TikTok", icon: <Music2 size={14} /> },
    { href: SOCIAL_LINKS.youtube, label: "YouTube", icon: <Youtube size={14} /> },
  ];
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Walk in to Hall Road</span>
      </div>
      <p className="mb-3 text-center text-[12.5px] leading-snug text-[var(--color-ink-500)]">
        Our flagship outlet sits in the heart of Pakistan&apos;s biggest mobile market — verify in person, walk out same day.
      </p>
      <div className="overflow-hidden rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <Link
          href={SOCIAL_LINKS.googleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-[16/7] bg-[var(--color-canvas-deep)]"
          aria-label="Open Google Maps"
        >
          <MapPlaceholderInner />
        </Link>
        <div className="flex flex-col gap-3 p-3.5">
          <div>
            <p className="text-[14px] font-semibold leading-tight text-[var(--color-ink-900)]">
              Hall Road, Lahore
            </p>
            <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
              {STORE_ADDRESS_LINE_1} · {STORE_HOURS}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={SOCIAL_LINKS.googleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--color-accent-700)] px-4 text-[13px] font-semibold text-white"
            >
              <MapPin size={13} />
              Open in Maps
            </Link>
            <Link
              href={buildWhatsAppLink("Salam! I'd like to ask about a phone.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[var(--color-whatsapp)] px-3.5 text-[13px] font-semibold text-white"
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle size={13} />
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="grid size-8 place-items-center rounded-md border border-[var(--color-ink-200)] text-[var(--color-ink-700)]"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MapPlaceholderInner() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(4, 1fr)" }}
      >
        {Array.from({ length: 32 }, (_, i) => (
          <div
            key={i}
            className="border border-[var(--color-ink-100)]"
            style={{
              backgroundColor:
                i % 7 === 0
                  ? "rgba(16, 185, 129, 0.04)"
                  : i % 5 === 0
                    ? "rgba(217, 119, 6, 0.04)"
                    : "transparent",
            }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 top-1/3 h-[2px] bg-[var(--color-ink-200)]" />
      <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[var(--color-ink-200)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-[var(--color-accent-600)] shadow-md">
        <MapPin size={14} className="fill-white text-white" />
      </div>
    </>
  );
}

/* ─────────────────────────── Desktop (preserved) ─────────────────────────── */

interface DesktopHeroProps {
  heroPhone: (typeof phones)[number] | undefined;
}

function DesktopHero({ heroPhone }: DesktopHeroProps) {
  return (
    <section className="border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]">
      <div className="mx-auto grid max-w-7xl grid-cols-[1.05fr_1fr] items-center gap-12 px-6 py-20">
        <div className="flex flex-col justify-center gap-5">
          <Pill tone="accent" size="md" leadingIcon={<Recycle size={12} />} className="self-start">
            Pakistan&apos;s most-trusted pre-owned phone store
          </Pill>
          <h1 className="text-balance text-6xl font-semibold leading-[0.98] tracking-[-0.04em] text-[var(--color-ink-900)]">
            Pre-loved,<br />
            <span className="text-[var(--color-accent-700)]">pre-Owned.</span>
          </h1>
          <p className="max-w-xl text-pretty text-base text-[var(--color-ink-600)]">
            Hand-checked, graded A+ to C, and clearly tagged by stock type — brand-new, genuine,
            refurbished, box-open and more. PTA-approved options at half the new-phone price,
            with a 15-day moneyback guarantee on every order.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <ButtonLink href="/shop" variant="primary" size="lg" trailingIcon={<ArrowRight size={16} />}>
              Shop all phones
            </ButtonLink>
            <ButtonLink
              href={buildWhatsAppLink("Salam! I'd like to ask about a phone.")}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="lg"
              leadingIcon={<MessageCircle size={16} />}
              className="!bg-[var(--color-whatsapp)] hover:!bg-[var(--color-whatsapp-dark)]"
            >
              WhatsApp us
            </ButtonLink>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-sm text-[var(--color-ink-500)]">
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
        <DesktopHeroVisual heroPhone={heroPhone} />
      </div>
    </section>
  );
}

interface DesktopHeroVisualProps {
  heroPhone: DesktopHeroProps["heroPhone"];
}

function DesktopHeroVisual({ heroPhone }: DesktopHeroVisualProps) {
  if (!heroPhone) return null;
  const heroBrand = brands.find((brand) => brand.slug === heroPhone.brandSlug);
  const heroBrandName = heroBrand?.name ?? heroPhone.brandSlug;
  const heroVariant = getDefaultVariant(heroPhone);
  const variantCount = heroPhone.variants.length;
  const isMultiVariant = variantCount > 1;

  return (
    <div className="relative">
      <Card className="relative overflow-hidden p-6">
        <div className="flex items-center justify-between">
          <Pill tone="dark" size="sm">Today&apos;s pick</Pill>
          <GradeBadge grade={heroVariant.grade} showLabel size="md" />
        </div>
        <div className="relative mt-5 aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)]">
          <ProductImage
            imageUrl={heroPhone.imageUrl}
            brandName={heroBrandName}
            modelName={heroPhone.modelName}
            colorName={heroVariant.colorName}
            brandSlug={heroPhone.brandSlug}
            sizes="40vw"
            priority
          />
          {heroVariant.isPtaApproved && (
            <div className="absolute left-3 top-3">
              <PtaBadge size="md" />
            </div>
          )}
        </div>
        <div className="mt-5 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
              {heroBrandName}
            </p>
            <p className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-[var(--color-ink-900)]">
              {heroPhone.modelName}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">
              {formatStorage(heroVariant.storageGb)} · {heroVariant.colorName}
            </p>
          </div>
          <div className="text-right">
            {isMultiVariant && (
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                From
              </p>
            )}
            <p className="text-2xl font-semibold leading-none tracking-[-0.02em] text-[var(--color-ink-900)]">
              {formatPrice(heroVariant.priceRupees)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-400)] line-through">
              {formatPrice(heroVariant.originalPriceRupees)} new
            </p>
          </div>
        </div>
      </Card>
      <Card className="absolute -left-8 bottom-8 hidden w-60 p-4 lg:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Battery health (range)
        </p>
        <p className="mt-1 text-2xl font-semibold leading-none tracking-[-0.02em] text-[var(--color-ink-900)]">
          {formatBatteryRange(heroVariant.batteryHealthRange)}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent-500)]"
            style={{ width: `${heroVariant.batteryHealthRange.maxPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--color-ink-500)]">
          We commit to a range, not a single number.
        </p>
      </Card>
    </div>
  );
}

function DesktopBrands() {
  const homepageBrands = brands.filter((brand) => HOMEPAGE_BRAND_SLUGS.includes(brand.slug));
  return (
    <section className="mx-auto max-w-7xl px-6">
      <DesktopSectionHeader
        eyebrow="Shop by brand"
        title="Find your favourite."
        description="Every unit graded A+ to C and labelled with its stock type — brand-new, genuine, refurbished, box-open and more."
        ctaHref="/shop"
        ctaLabel="Browse all brands"
      />
      <div className="mt-8 grid grid-cols-4 gap-4">
        {homepageBrands.map((brand) => (
          <BrandTile key={brand.slug} brand={brand} />
        ))}
      </div>
    </section>
  );
}

interface DesktopFeaturedProps {
  featuredPhones: ReturnType<typeof getFeaturedPhones>;
}

function DesktopFeatured({ featuredPhones }: DesktopFeaturedProps) {
  return (
    <section className="mx-auto max-w-7xl px-6">
      <DesktopSectionHeader
        eyebrow="Just landed"
        title="Latest stock arrived"
        description="Fresh inventory off the bench — inspected, graded, and ready to ship."
        ctaHref="/shop"
        ctaLabel="See all phones"
      />
      <div className="mt-8 grid grid-cols-4 gap-5">
        {featuredPhones.map((featuredPhone) => (
          <PhoneCard key={featuredPhone.id} phone={featuredPhone} />
        ))}
      </div>
    </section>
  );
}

function DesktopHowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Pick your phone",
      body: "Browse by brand, grade, stock type or budget. Read the honest condition notes — we mark every dent and call out whether the box is included.",
    },
    {
      number: "02",
      title: "Confirm & pay advance",
      body: "WhatsApp us to lock the unit with a small advance, or pay full via bank transfer for a flat 5% discount.",
    },
    {
      number: "03",
      title: "We send a video",
      body: "Before dispatch we shoot a short video of your exact unit — IMEI, screen, body — so there are no surprises.",
    },
    {
      number: "04",
      title: "Dispatch & 15-day moneyback",
      body: "On your approval we dispatch via tracked courier. Same-day in Lahore, 1–3 days across Pakistan. Change your mind within 15 days, full refund.",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6">
      <DesktopSectionHeader
        eyebrow="How to buy"
        title="Buying a used phone shouldn't feel risky."
        description="Four steps, no surprises. Or skip it all and walk into our Hall Road outlet — verify in person, pay on the spot."
      />
      <div className="mt-8 grid grid-cols-4 gap-4">
        {steps.map((step) => (
          <Card key={step.number} className="p-6">
            <span className="text-4xl font-semibold leading-none text-[var(--color-accent-700)]">
              {step.number}
            </span>
            <h3 className="mt-3 text-xl font-semibold leading-tight tracking-[-0.02em] text-[var(--color-ink-900)]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-600)]">{step.body}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-6 py-4">
        <div className="flex items-start gap-3">
          <Undo2 size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">15-day moneyback guarantee</p>
            <p className="text-xs text-[var(--color-ink-600)]">Change your mind, we refund. After 15 days we still service genuine faults.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Banknote size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">Pay full by bank transfer — 5% off</p>
            <p className="text-xs text-[var(--color-ink-600)]">Auto-applied. All major Pakistani banks supported.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">Visit the store, verify in person</p>
            <p className="text-xs text-[var(--color-ink-600)]">Hall Road, Lahore. Hold the phone, test it, then pay.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopGrades() {
  return (
    <section className="bg-[var(--color-ink-900)] py-20 text-[var(--color-canvas)]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-[1fr_2fr] gap-12">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-400)]">
              How we grade
            </p>
            <h2 className="text-4xl font-semibold tracking-tight">
              Honest grades.<br />
              <span className="italic text-[var(--color-accent-300)]">No</span> surprises.
            </h2>
            <p className="text-base text-[var(--color-ink-300)]">
              Our 32-point inspection covers cosmetic condition, battery health, screen, cameras and every button. Then we assign one of four grades — and stand behind it.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)]"
            >
              Read our inspection process
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {gradeDescriptors.map((descriptor) => (
              <div
                key={descriptor.grade}
                className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <GradeBadge grade={descriptor.grade} size="sm" />
                  <span className="text-xs uppercase tracking-wider text-[var(--color-ink-300)]">
                    {descriptor.shortLabel}
                  </span>
                </div>
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

function DesktopVisitStore() {
  const socials = [
    { href: SOCIAL_LINKS.facebook, label: "Facebook", icon: <Facebook size={14} /> },
    { href: SOCIAL_LINKS.instagram, label: "Instagram", icon: <Instagram size={14} /> },
    { href: SOCIAL_LINKS.tiktok, label: "TikTok", icon: <Music2 size={14} /> },
    { href: SOCIAL_LINKS.youtube, label: "YouTube", icon: <Youtube size={14} /> },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <div className="grid grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center gap-5 p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)]">
              Visit our store
            </p>
            <h2 className="text-4xl font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)]">
              Walk in to <span className="italic text-[var(--color-accent-700)]">Hall Road</span>.
            </h2>
            <p className="text-base text-[var(--color-ink-600)]">
              Our flagship outlet sits in the heart of Pakistan&apos;s biggest mobile market. Come hold the phone, test it for yourself, and walk out the same day.
            </p>
            <div className="space-y-1.5 text-sm text-[var(--color-ink-700)]">
              <p className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--color-accent-600)]" />
                <span>
                  {STORE_ADDRESS_LINE_1}<br />
                  <span className="text-[var(--color-ink-500)]">{STORE_ADDRESS_LINE_2}</span>
                </span>
              </p>
              <p className="text-xs text-[var(--color-ink-500)]">{STORE_HOURS}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={SOCIAL_LINKS.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-700)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-800)]"
              >
                <MapPin size={14} />
                Open in Google Maps
              </Link>
              <div className="flex items-center gap-1.5">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-[var(--color-ink-200)] text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-700)]"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <DesktopMapPlaceholder />
        </div>
      </div>
    </section>
  );
}

function DesktopMapPlaceholder() {
  const cellCount = 8 * 6;
  return (
    <Link
      href={SOCIAL_LINKS.googleMaps}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Google Maps"
      className="relative block min-h-[420px] overflow-hidden bg-[var(--color-canvas-deep)]"
    >
      <div
        aria-hidden
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(6, 1fr)" }}
      >
        {Array.from({ length: cellCount }, (_, i) => (
          <div
            key={i}
            className="border border-[var(--color-ink-100)]"
            style={{
              backgroundColor:
                i % 7 === 0
                  ? "rgba(16, 185, 129, 0.04)"
                  : i % 5 === 0
                    ? "rgba(217, 119, 6, 0.04)"
                    : "transparent",
            }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 top-1/3 h-[3px] bg-[var(--color-ink-200)]" />
      <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-[var(--color-ink-200)]" />
      <div className="absolute inset-x-0 top-2/3 h-[2px] bg-[var(--color-ink-200)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-[var(--color-accent-600)] text-white shadow-[var(--shadow-lg)]">
          <MapPin size={20} className="fill-white" />
        </span>
        <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--color-ink-900)]">
          Hall Road, Lahore
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">Click to open in Maps</p>
      </div>
    </Link>
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--color-ink-900)]">
          {title}
        </h2>
        <p className="mt-2 text-base text-[var(--color-ink-600)]">{description}</p>
      </div>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]"
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
