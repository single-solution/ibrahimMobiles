import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
  Recycle,
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

export default function HomePage() {
  const featuredPhones = getFeaturedPhones();
  const heroPhone = phones.find((phone) => phone.slug === "iphone-15-pro-256-natural-titanium");

  return (
    <div className="space-y-14 md:space-y-24">
      <HeroSection heroPhone={heroPhone} />
      <BrandsSection />
      <FeaturedPhonesSection featuredPhones={featuredPhones} />
      <HowItWorksSection />
      <GradesSection />
      <VisitStoreSection />
    </div>
  );
}

function VisitStoreSection() {
  const socials = [
    { href: SOCIAL_LINKS.facebook, label: "Facebook", icon: <Facebook size={14} /> },
    { href: SOCIAL_LINKS.instagram, label: "Instagram", icon: <Instagram size={14} /> },
    { href: SOCIAL_LINKS.tiktok, label: "TikTok", icon: <Music2 size={14} /> },
    { href: SOCIAL_LINKS.youtube, label: "YouTube", icon: <Youtube size={14} /> },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center gap-3.5 p-5 sm:gap-5 sm:p-8 lg:p-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)] sm:text-xs">
              Visit our store
            </p>
            <h2 className="font-semibold text-2xl leading-[1] tracking-tight text-[var(--color-ink-900)] sm:text-4xl lg:text-5xl">
              Walk in to <span className="italic text-[var(--color-accent-700)]">Hall Road</span>.
            </h2>
            <p className="text-pretty text-[13px] text-[var(--color-ink-600)] sm:text-sm lg:text-base">
              Our flagship outlet sits in the heart of Pakistan&apos;s biggest mobile market. Come
              hold the phone, test it for yourself, and walk out the same day. Or follow our
              daily drops on social.
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
          <MapPlaceholder />
        </div>
      </div>
    </section>
  );
}

function MapPlaceholder() {
  const cellCount = 8 * 6;

  return (
    <Link
      href={SOCIAL_LINKS.googleMaps}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Google Maps"
      className="relative block min-h-[260px] overflow-hidden bg-[var(--color-canvas-deep)] lg:min-h-[420px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(6, 1fr)",
        }}
      >
        {Array.from({ length: cellCount }, (_, cellIndex) => (
          <div
            key={cellIndex}
            className="border border-[var(--color-ink-100)]"
            style={{
              backgroundColor:
                cellIndex % 7 === 0
                  ? "rgba(16, 185, 129, 0.04)"
                  : cellIndex % 5 === 0
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
        <p className="font-semibold mt-3 text-xl tracking-tight text-[var(--color-ink-900)]">
          Hall Road, Lahore
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">Click to open in Maps</p>
      </div>
    </Link>
  );
}

interface HeroSectionProps {
  heroPhone: (typeof phones)[number] | undefined;
}

function HeroSection({ heroPhone }: HeroSectionProps) {
  return (
    <section className="border-b border-[var(--color-ink-100)] bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center gap-4 sm:gap-6">
          <Pill tone="accent" size="md" leadingIcon={<Recycle size={12} />}>
            Pakistan&apos;s most-trusted pre-owned phone store
          </Pill>
          <h1 className="text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-[var(--color-ink-900)] sm:text-6xl lg:text-7xl">
            Pre-loved,<br />
            <span className="text-[var(--color-accent-700)]">pre-Owned.</span>
          </h1>
          <p className="max-w-xl text-pretty text-sm text-[var(--color-ink-600)] sm:text-base lg:text-lg">
            Hand-checked, graded A+ to C, and clearly tagged by stock type — brand-new, genuine,
            refurbished, box-open and more. PTA-approved options at half the new-phone price,
            with a 15-day moneyback guarantee on every order.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:gap-3 sm:pt-2">
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
          <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-[var(--color-ink-500)] sm:flex">
            <div className="flex items-center gap-2">
              <Undo2 size={16} className="text-[var(--color-accent-600)]" />
              <span>15-day moneyback</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck size={16} className="text-[var(--color-pak-green)]" />
              <span>PTA-approved options</span>
            </div>
            <div className="flex items-center gap-2">
              <Video size={16} className="text-[var(--color-accent-600)]" />
              <span>Video before dispatch</span>
            </div>
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-[var(--color-accent-600)]" />
              <span>5% off on bank transfer</span>
            </div>
          </div>
        </div>

        <HeroVisual heroPhone={heroPhone} />
      </div>
    </section>
  );
}

interface HeroVisualProps {
  heroPhone: HeroSectionProps["heroPhone"];
}

function HeroVisual({ heroPhone }: HeroVisualProps) {
  if (!heroPhone) {
    return null;
  }
  const heroBrand = brands.find((brand) => brand.slug === heroPhone.brandSlug);
  const heroBrandName = heroBrand?.name ?? heroPhone.brandSlug;
  const heroVariant = getDefaultVariant(heroPhone);
  const variantCount = heroPhone.variants.length;
  const isMultiVariant = variantCount > 1;

  return (
    <div className="relative">
      <Card className="relative overflow-hidden p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <Pill tone="dark" size="sm">Today&apos;s pick</Pill>
          <GradeBadge grade={heroVariant.grade} showLabel size="md" />
        </div>

        <div className="relative mt-6 aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-canvas-deep)]">
          <ProductImage
            imageUrl={heroPhone.imageUrl}
            brandName={heroBrandName}
            modelName={heroPhone.modelName}
            colorName={heroVariant.colorName}
            brandSlug={heroPhone.brandSlug}
            sizes="(max-width: 1024px) 100vw, 40vw"
            priority
          />
          {heroVariant.isPtaApproved && (
            <div className="absolute left-3 top-3">
              <PtaBadge size="md" />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
              {heroBrandName}
            </p>
            <p className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--color-ink-900)]">
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
            <p className="text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--color-ink-900)]">
              {formatPrice(heroVariant.priceRupees)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-400)] line-through">
              {formatPrice(heroVariant.originalPriceRupees)} new
            </p>
          </div>
        </div>
      </Card>

      <Card className="absolute -left-4 bottom-8 hidden w-64 p-4 sm:block lg:-left-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Battery health (range)
        </p>
        <p className="mt-1 text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--color-ink-900)]">
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

const HOMEPAGE_BRAND_SLUGS = ["apple", "samsung", "google", "xiaomi"];

function BrandsSection() {
  const homepageBrands = brands.filter((brand) =>
    HOMEPAGE_BRAND_SLUGS.includes(brand.slug),
  );

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Shop by brand"
        title="Find your favourite."
        description="Every unit graded A+ to C and labelled with its stock type — brand-new, genuine, refurbished, box-open and more."
        ctaHref="/shop"
        ctaLabel="Browse all brands"
      />
      <div className="mt-5 grid grid-cols-4 gap-2 sm:mt-8 sm:gap-4">
        {homepageBrands.map((brand) => (
          <BrandTile key={brand.slug} brand={brand} />
        ))}
      </div>
    </section>
  );
}

interface FeaturedPhonesSectionProps {
  featuredPhones: ReturnType<typeof getFeaturedPhones>;
}

function FeaturedPhonesSection({ featuredPhones }: FeaturedPhonesSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Just landed"
        title="Latest stock arrived"
        description="Fresh inventory off the bench — inspected, graded, and ready to ship."
        ctaHref="/shop"
        ctaLabel="See all phones"
      />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-4">
        {featuredPhones.map((featuredPhone) => (
          <PhoneCard key={featuredPhone.id} phone={featuredPhone} />
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
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
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="How to buy"
        title="Buying a used phone shouldn't feel risky."
        description="Four steps, no surprises. Or skip it all and walk into our Hall Road outlet — verify in person, pay on the spot."
      />
      <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <Card key={step.number} className="p-4 sm:p-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold leading-none text-[var(--color-accent-700)] sm:text-4xl">
                {step.number}
              </span>
              <h3 className="text-base font-semibold leading-tight tracking-[-0.02em] text-[var(--color-ink-900)] sm:text-xl">
                {step.title}
              </h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-600)] sm:mt-3 sm:text-sm">{step.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-4 py-3.5 sm:mt-6 sm:gap-4 sm:grid-cols-3 sm:px-6 sm:py-4">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <Undo2 size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)] sm:size-5" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-ink-900)] sm:text-sm">
              15-day moneyback guarantee
            </p>
            <p className="text-xs text-[var(--color-ink-600)]">
              Change your mind, we refund. After 15 days we still service genuine faults.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 sm:gap-3">
          <Banknote size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)] sm:size-5" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-ink-900)] sm:text-sm">
              Pay full by bank transfer — 5% off
            </p>
            <p className="text-xs text-[var(--color-ink-600)]">
              Auto-applied. All major Pakistani banks supported.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 sm:gap-3">
          <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--color-accent-700)] sm:size-5" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-ink-900)] sm:text-sm">
              Visit the store, verify in person
            </p>
            <p className="text-xs text-[var(--color-ink-600)]">
              Hall Road, Lahore. Hold the phone, test it, then pay.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function GradesSection() {
  return (
    <section className="bg-[var(--color-ink-900)] py-10 text-[var(--color-canvas)] sm:py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-400)] sm:text-xs">
              How we grade
            </p>
            <h2 className="font-semibold text-2xl tracking-tight sm:text-4xl lg:text-5xl">
              Honest grades.<br />
              <span className="italic text-[var(--color-accent-300)]">No</span> surprises.
            </h2>
            <p className="text-[13px] text-[var(--color-ink-300)] sm:text-sm lg:text-base">
              Our 32-point inspection covers cosmetic condition, battery health, screen, cameras
              and every button. Then we assign one of four grades — and stand behind it.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)]"
            >
              Read our inspection process
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {gradeDescriptors.map((descriptor) => (
              <div
                key={descriptor.grade}
                className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between">
                  <GradeBadge grade={descriptor.grade} size="md" />
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


interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}

function SectionHeader({ eyebrow, title, description, ctaHref, ctaLabel }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-700)] sm:text-xs">
          {eyebrow}
        </p>
        <h2 className="font-semibold mt-1.5 text-2xl tracking-tight text-[var(--color-ink-900)] sm:mt-2 sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] text-[var(--color-ink-600)] sm:mt-2 sm:text-sm lg:text-base">{description}</p>
      </div>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="hidden items-center gap-1 text-sm font-medium text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)] sm:inline-flex"
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
