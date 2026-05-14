import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PhoneCard } from "@/components/shared/PhoneCard";
import { ProductImage } from "@/components/shared/ProductImage";
import { VariantSelector } from "@/components/shared/VariantSelector";
import { VariantProvider } from "@/components/shared/VariantContext";
import { GradeShowcase } from "@/components/shared/GradeShowcase";
import { StockTypeCard } from "@/components/shared/StockTypeCard";
import { brands } from "@/data/brands";
import { getDefaultVariant, getPhoneBySlug, phones } from "@/data/phones";
import { PAYMENT_METHODS, SERVICE_CITIES } from "@/lib/constants";
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
    <VariantProvider initialVariantId={initialVariant.id}>
      {/* Mobile only — native */}
      <div className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-2 md:hidden">
        <MobileGallery
          imageUrl={phone.imageUrl}
          galleryUrls={phone.galleryUrls}
          brandName={brandName}
          modelName={phone.modelName}
          colorName={initialVariant.colorName}
          brandSlug={phone.brandSlug}
        />

        <div className="app-page">
          <div className="app-section">
            <VariantSelector phone={phone} brandName={brandName} />
          </div>

          <StockTypeCard phone={phone} variant="mobile" />

          <GradeShowcase phone={phone} variant="mobile" />

          <MobilePaymentSection />

          <MobileDeliverySection />

          {relatedPhones.length > 0 && (
            <section className="app-section">
              <div className="app-section-eyebrow">
                <span>More from {brandName}</span>
                <Link href={`/shop?brand=${phone.brandSlug}`}>See all</Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
                {relatedPhones.map((relatedPhone) => (
                  <PhoneCard key={relatedPhone.id} phone={relatedPhone} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Desktop — single layout */}
      <div className="mx-auto hidden max-w-7xl px-6 pb-12 pt-8 md:block">
        <Breadcrumbs brandName={brandName} brandSlug={phone.brandSlug} modelName={phone.modelName} />

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-12">
          <PhotoGallery
            imageUrl={phone.imageUrl}
            galleryUrls={phone.galleryUrls}
            brandName={brandName}
            modelName={phone.modelName}
            colorName={initialVariant.colorName}
            brandSlug={phone.brandSlug}
          />

          <div>
            <VariantSelector phone={phone} brandName={brandName} />
          </div>
        </div>

        <StockTypeCard phone={phone} />

        <GradeShowcase phone={phone} />

        <PaymentDeliverySection />

        {relatedPhones.length > 0 && (
          <section className="mt-20">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-ink-900)]">
                More from {brandName}
              </h2>
              <Link
                href={`/shop?brand=${phone.brandSlug}`}
                className="text-sm font-medium text-[var(--color-accent-700)] hover:underline"
              >
                See all {brandName} →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-5">
              {relatedPhones.map((relatedPhone) => (
                <PhoneCard key={relatedPhone.id} phone={relatedPhone} />
              ))}
            </div>
          </section>
        )}
      </div>
    </VariantProvider>
  );
}

interface MobileGalleryProps {
  imageUrl: string;
  galleryUrls: string[];
  brandName: string;
  modelName: string;
  colorName: string;
  brandSlug: string;
}

function MobileGallery({
  imageUrl,
  galleryUrls,
  brandName,
  modelName,
  colorName,
  brandSlug,
}: MobileGalleryProps) {
  const thumbnails = galleryUrls.length > 0 ? galleryUrls : [imageUrl];
  return (
    <>
      <div className="relative aspect-square w-full bg-[var(--color-canvas-deep)]">
        <ProductImage
          imageUrl={imageUrl}
          brandName={brandName}
          modelName={modelName}
          colorName={colorName}
          brandSlug={brandSlug}
          sizes="100vw"
          priority
        />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
        {thumbnails.slice(0, 6).map((thumbUrl, thumbIndex) => (
          <button
            key={`${thumbUrl}-${thumbIndex}`}
            type="button"
            aria-label={`Photo ${thumbIndex + 1}`}
            className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
          >
            <ProductImage
              imageUrl={thumbUrl}
              brandName={brandName}
              modelName={modelName}
              colorName={colorName}
              brandSlug={brandSlug}
              sizes="64px"
            />
          </button>
        ))}
      </div>
    </>
  );
}

function MobilePaymentSection() {
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Payment options</span>
      </div>
      <ul className="app-list">
        {PAYMENT_METHODS.map((paymentMethod) => (
          <li key={paymentMethod.id} className="app-list-row">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight text-[var(--color-ink-900)]">{paymentMethod.label}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-500)]">{paymentMethod.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobileDeliverySection() {
  return (
    <section className="app-section">
      <div className="app-section-eyebrow">
        <span>Delivery</span>
      </div>
      <div className="rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3.5">
        <p className="text-[13px] leading-snug text-[var(--color-ink-700)]">
          <span className="font-semibold text-[var(--color-ink-900)]">Same-day in Lahore</span> ·
          1–3 days across {SERVICE_CITIES.length} cities. Video of your unit before dispatch.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {SERVICE_CITIES.map((cityName) => (
            <span
              key={cityName}
              className="rounded-full bg-[var(--color-canvas-deep)] px-2 py-0.5 text-[11px] text-[var(--color-ink-600)]"
            >
              {cityName}
            </span>
          ))}
        </div>
      </div>
    </section>
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
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]">
        <ProductImage
          imageUrl={imageUrl}
          brandName={brandName}
          modelName={modelName}
          colorName={colorName}
          brandSlug={brandSlug}
          sizes="(max-width: 1024px) 50vw, 50vw"
          priority
        />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {thumbnails.slice(0, 4).map((thumbUrl, thumbIndex) => (
          <button
            key={`${thumbUrl}-${thumbIndex}`}
            type="button"
            aria-label={`Photo ${thumbIndex + 1}`}
            className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] transition-colors hover:border-[var(--color-ink-300)]"
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

function PaymentDeliverySection() {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
          <ShieldCheck size={18} />
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em]">Payment options</h3>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {PAYMENT_METHODS.map((paymentMethod) => (
            <li
              key={paymentMethod.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2.5"
            >
              <p className="font-medium text-[var(--color-ink-900)]">{paymentMethod.label}</p>
              <p className="text-xs text-[var(--color-ink-500)]">{paymentMethod.note}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
          <MapPin size={18} />
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em]">Delivery</h3>
        </div>
        <p className="mt-4 text-sm text-[var(--color-ink-700)]">
          <span className="font-semibold text-[var(--color-ink-900)]">Same-day in Lahore</span> ·
          1–3 days across {SERVICE_CITIES.length} cities. Video of your unit before dispatch.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SERVICE_CITIES.map((cityName) => (
            <span
              key={cityName}
              className="rounded-[var(--radius-full)] bg-[var(--color-canvas-deep)] px-2.5 py-1 text-xs text-[var(--color-ink-600)]"
            >
              {cityName}
            </span>
          ))}
        </div>
      </Card>
    </section>
  );
}
