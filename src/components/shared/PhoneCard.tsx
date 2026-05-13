import Link from "next/link";
import { BadgeCheck, BatteryMedium, HardDrive, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StockTypeBadge } from "@/components/shared/StockTypeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { brands } from "@/data/brands";
import { getDefaultVariant, hasAnyOffer, isPhoneInStock } from "@/data/phones";
import type { ConditionGrade, Phone } from "@/types";
import {
  calculateDiscountPercent,
  formatBatteryRange,
  formatPrice,
  formatStorage,
} from "@/lib/utils";

interface PhoneCardProps {
  phone: Phone;
}

const GRADE_BG: Record<ConditionGrade, string> = {
  "A+": "var(--color-grade-aplus)",
  A: "var(--color-grade-a)",
  B: "var(--color-grade-b)",
  C: "var(--color-grade-c)",
};

export function PhoneCard({ phone }: PhoneCardProps) {
  const brand = brands.find((candidate) => candidate.slug === phone.brandSlug);
  const brandName = brand?.name ?? phone.brandSlug;
  const defaultVariant = getDefaultVariant(phone);
  const inStock = isPhoneInStock(phone);
  const hasOffer = hasAnyOffer(phone);
  const discountPercent = calculateDiscountPercent(
    defaultVariant.originalPriceRupees,
    defaultVariant.priceRupees,
  );
  const variantCount = phone.variants.length;
  const isMultiVariant = variantCount > 1;

  return (
    <Link href={`/shop/${phone.slug}`} className="group block focus:outline-none">
      <Card isInteractive className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden rounded-t-[var(--radius-lg)] bg-[var(--color-canvas-deep)]">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductImage
              imageUrl={phone.imageUrl}
              brandName={brandName}
              modelName={phone.modelName}
              colorName={defaultVariant.colorName}
              brandSlug={phone.brandSlug}
            />
          </div>

          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
            <span
              className="inline-flex h-6 items-center rounded-[var(--radius-full)] px-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-white shadow-[var(--shadow-sm)]"
              style={{ backgroundColor: GRADE_BG[defaultVariant.grade] }}
            >
              {defaultVariant.grade} grade
            </span>
            {defaultVariant.isPtaApproved && (
              <span className="inline-flex h-5 items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-pak-green)] px-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-white shadow-[var(--shadow-sm)]">
                <BadgeCheck size={10} strokeWidth={2.8} />
                PTA
              </span>
            )}
          </div>

          {!inStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)]">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              {brandName}
            </p>
            <h3 className="mt-1 line-clamp-1 text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-ink-900)]">
              {phone.modelName}
            </h3>
            <p className="text-xs text-[var(--color-ink-500)]">{defaultVariant.colorName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--color-ink-600)]">
            <span className="inline-flex items-center gap-1">
              <HardDrive size={12} />
              {formatStorage(defaultVariant.storageGb)}
            </span>
            <span className="inline-flex items-center gap-1">
              <BatteryMedium size={12} />
              {formatBatteryRange(defaultVariant.batteryHealthRange)}
            </span>
            <StockTypeBadge stockType={defaultVariant.stockType} size="sm" />
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div>
              {isMultiVariant && (
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                  From
                </p>
              )}
              <p className="text-base font-semibold tracking-[-0.01em] text-[var(--color-ink-900)]">
                {formatPrice(defaultVariant.priceRupees)}
              </p>
              {hasOffer && discountPercent > 0 && (
                <p className="text-xs text-[var(--color-ink-400)] line-through">
                  {formatPrice(defaultVariant.originalPriceRupees)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {isMultiVariant && (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-canvas-deep)] px-2 py-1 text-[10px] font-medium text-[var(--color-ink-700)]">
                  <Layers size={10} />
                  {variantCount} variants
                </span>
              )}
              <span className="text-xs font-medium text-[var(--color-accent-700)] opacity-0 transition-opacity group-hover:opacity-100">
                View details →
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
