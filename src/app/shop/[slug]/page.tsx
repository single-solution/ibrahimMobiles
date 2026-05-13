import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Truck,
  Undo2,
  Video,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PhoneCard } from "@/components/shared/PhoneCard";
import { ProductImage } from "@/components/shared/ProductImage";
import { VariantSelector } from "@/components/shared/VariantSelector";
import { brands } from "@/data/brands";
import { getDefaultVariant, getPhoneBySlug, phones } from "@/data/phones";
import {
  MONEYBACK_DAYS,
  PAYMENT_METHODS,
  SERVICE_CITIES,
} from "@/lib/constants";
import { formatStorage } from "@/lib/utils";

interface PhoneDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PhoneDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const search = await searchParams;
  const phone = getPhoneBySlug(slug);
  if (!phone) {
    return { title: "Phone not found" };
  }
  const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
  const requestedVariantId = typeof search.variant === "string" ? search.variant : undefined;
  const initialVariant =
    (requestedVariantId
      ? phone.variants.find((variant) => variant.id === requestedVariantId)
      : undefined) ?? getDefaultVariant(phone);
  return {
    title: `${brand?.name ?? ""} ${phone.modelName} (${formatStorage(initialVariant.storageGb)})`,
    description: phone.highlights.join(" · "),
  };
}

export default async function PhoneDetailPage({ params, searchParams }: PhoneDetailPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const phone = getPhoneBySlug(slug);
  if (!phone) {
    notFound();
  }

  const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
  const brandName = brand?.name ?? phone.brandSlug;
  const requestedVariantId = typeof search.variant === "string" ? search.variant : undefined;
  const initialVariant =
    (requestedVariantId
      ? phone.variants.find((variant) => variant.id === requestedVariantId)
      : undefined) ?? getDefaultVariant(phone);
  const relatedPhones = phones
    .filter((candidate) => candidate.brandSlug === phone.brandSlug && candidate.id !== phone.id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-8 sm:pb-8 lg:px-8 lg:pb-10">
      <div className="hidden sm:block">
        <Breadcrumbs brandName={brandName} brandSlug={phone.brandSlug} modelName={phone.modelName} />
      </div>

      <div className="mt-3 grid gap-8 sm:mt-6 sm:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <PhotoGallery
          imageUrl={phone.imageUrl}
          galleryUrls={phone.galleryUrls}
          brandName={brandName}
          modelName={phone.modelName}
          colorName={initialVariant.colorName}
          brandSlug={phone.brandSlug}
        />

        <div>
          <VariantSelector
            phone={phone}
            brandName={brandName}
            initialVariantId={initialVariant.id}
          />
          <div className="mt-7">
            <PromiseList />
          </div>
        </div>
      </div>

      <HighlightsSection highlights={phone.highlights} />

      <PaymentDeliverySection />

      {relatedPhones.length > 0 && (
        <section className="mt-10 sm:mt-16">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-ink-900)] sm:text-3xl lg:text-4xl">
              More from {brandName}
            </h2>
            <Link
              href={`/shop?brand=${phone.brandSlug}`}
              className="hidden text-sm font-medium text-[var(--color-accent-700)] hover:underline sm:inline"
            >
              See all {brandName} →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-4">
            {relatedPhones.map((relatedPhone) => (
              <PhoneCard key={relatedPhone.id} phone={relatedPhone} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface BreadcrumbsProps {
  brandName: string;
  brandSlug: string;
  modelName: string;
}

function Breadcrumbs({ brandName, brandSlug, modelName }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-500)]">
      <Link href="/" className="hover:text-[var(--color-ink-800)]">Home</Link>
      <ChevronRight size={14} />
      <Link href="/shop" className="hover:text-[var(--color-ink-800)]">Shop</Link>
      <ChevronRight size={14} />
      <Link
        href={`/shop?brand=${brandSlug}`}
        className="hover:text-[var(--color-ink-800)]"
      >
        {brandName}
      </Link>
      <ChevronRight size={14} />
      <span className="text-[var(--color-ink-800)]">{modelName}</span>
    </nav>
  );
}

interface PhotoGalleryProps {
  imageUrl: string;
  galleryUrls: string[];
  brandName: string;
  modelName: string;
  colorName: string;
  brandSlug: string;
}

function PhotoGallery({
  imageUrl,
  galleryUrls,
  brandName,
  modelName,
  colorName,
  brandSlug,
}: PhotoGalleryProps) {
  const thumbnails = galleryUrls.length > 0 ? galleryUrls : [imageUrl];

  return (
    <div className="space-y-3">
      <div className="-mx-4 sm:mx-0">
        <div className="relative aspect-square overflow-hidden bg-[var(--color-canvas-deep)] sm:rounded-[var(--radius-lg)] sm:border sm:border-[var(--color-ink-100)]">
          <ProductImage
            imageUrl={imageUrl}
            brandName={brandName}
            modelName={modelName}
            colorName={colorName}
            brandSlug={brandSlug}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0">
        {thumbnails.slice(0, 4).map((thumbUrl, thumbIndex) => (
          <button
            key={`${thumbUrl}-${thumbIndex}`}
            type="button"
            aria-label={`Photo ${thumbIndex + 1}`}
            className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] transition-colors hover:border-[var(--color-ink-300)] sm:w-auto"
          >
            <ProductImage
              imageUrl={thumbUrl}
              brandName={brandName}
              modelName={modelName}
              colorName={colorName}
              brandSlug={brandSlug}
              sizes="120px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function PromiseList() {
  const promises = [
    {
      icon: <Undo2 size={16} />,
      label: `${MONEYBACK_DAYS}-day moneyback guarantee`,
      sub: "Change your mind, we refund — no questions asked.",
    },
    {
      icon: <Wrench size={16} />,
      label: "After-sales service for genuine faults",
      sub: "Post-warranty? We still service any genuine fault (excluding physical damage).",
    },
    {
      icon: <Video size={16} />,
      label: "Video of your unit before dispatch",
      sub: "IMEI, screen, body — verified on WhatsApp before shipping.",
    },
    {
      icon: <Banknote size={16} />,
      label: "5% off on full bank transfer",
      sub: "All major Pakistani banks supported.",
    },
    {
      icon: <Truck size={16} />,
      label: "Free delivery on orders over Rs 50,000",
      sub: "Same-day in Lahore, 1–3 days across Pakistan.",
    },
    {
      icon: <ShieldCheck size={16} />,
      label: "Warranty per variant",
      sub: "Brand-new units carry company warranty; used stock 3–6 months.",
    },
  ];
  return (
    <ul className="grid gap-2.5 text-sm">
      {promises.map((promise) => (
        <li
          key={promise.label}
          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3"
        >
          <span className="mt-0.5 text-[var(--color-accent-600)]">{promise.icon}</span>
          <div>
            <p className="font-medium text-[var(--color-ink-900)]">{promise.label}</p>
            <p className="text-xs text-[var(--color-ink-500)]">{promise.sub}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface HighlightsSectionProps {
  highlights: string[];
}

function HighlightsSection({ highlights }: HighlightsSectionProps) {
  return (
    <section className="mt-10 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5 sm:mt-16 sm:p-8 lg:p-10">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-ink-900)] sm:text-3xl">
        Highlights
      </h2>
      <ul className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3 sm:grid-cols-2">
        {highlights.map((highlight) => (
          <li
            key={highlight}
            className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-3 text-[13px] text-[var(--color-ink-700)] sm:gap-3 sm:p-4 sm:text-sm"
          >
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-accent-500)] sm:mt-0.5 sm:size-2" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PaymentDeliverySection() {
  return (
    <section className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 sm:grid-cols-2">
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
          <ShieldCheck size={16} className="sm:size-[18px]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] sm:text-sm">Payment options</h3>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:mt-4 sm:text-sm">
          {PAYMENT_METHODS.map((paymentMethod) => (
            <li
              key={paymentMethod.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-2.5 py-2 sm:px-3 sm:py-2.5"
            >
              <p className="font-medium text-[var(--color-ink-900)]">{paymentMethod.label}</p>
              <p className="text-xs text-[var(--color-ink-500)]">{paymentMethod.note}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
          <MapPin size={16} className="sm:size-[18px]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] sm:text-sm">Delivery</h3>
        </div>
        <p className="mt-3 text-[13px] text-[var(--color-ink-700)] sm:mt-4 sm:text-sm">
          <span className="font-semibold text-[var(--color-ink-900)]">Same-day in Lahore</span> ·
          1–3 days across {SERVICE_CITIES.length} cities. We send a video of your unit before
          dispatch. Verify on delivery in Lahore or in person at our Hall Road outlet.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3">
          {SERVICE_CITIES.map((cityName) => (
            <span
              key={cityName}
              className="rounded-[var(--radius-full)] bg-[var(--color-canvas-deep)] px-2.5 py-1 text-[11px] text-[var(--color-ink-600)] sm:text-xs"
            >
              {cityName}
            </span>
          ))}
        </div>
      </Card>
    </section>
  );
}
