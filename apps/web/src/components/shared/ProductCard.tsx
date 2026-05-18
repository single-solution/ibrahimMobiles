import Link from "next/link";
import {
  BadgeCheck,
  BatteryMedium,
  Cable,
  HardDrive,
  Headphones,
  Layers,
  Plug,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { WishlistButton } from "@/components/shared/WishlistButton";
import { isAccessory, isPhone, productHref } from "@/data/products";
import { getGradeDescriptor } from "@/data/grades";
import {
  getDefaultVariant,
  hasAnyOffer,
  isProductInStock,
} from "@/lib/productSummary";
import {
  calculateDiscountPercent,
  formatBatteryRange,
  formatPrice,
  formatStorage,
  type Accessory,
  type AccessoryType,
  type AccessoryVariant,
  type AnyVariant,
  type ConditionGrade,
  type PhoneVariant,
  type Product,
} from "@store/shared";

interface ProductCardProps {
  product: Product;
}

const GRADE_BG: Record<ConditionGrade, string> = {
  "brand-new": "var(--color-grade-brand-new)",
  genuine: "var(--color-grade-genuine)",
  "box-open": "var(--color-grade-box-open)",
  refurbished: "var(--color-grade-refurbished)",
  "china-water": "var(--color-grade-china-water)",
  "lcd-shaded": "var(--color-grade-lcd-shaded)",
};

const ACCESSORY_TYPE_LABEL: Record<AccessoryType, string> = {
  charger: "Charger",
  cable: "Cable",
  case: "Case",
  earbuds: "Earbuds",
  "screen-protector": "Screen guard",
  "power-bank": "Power bank",
  other: "Accessory",
};

const ACCESSORY_TYPE_ICON: Record<
  AccessoryType,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  charger: Plug,
  cable: Cable,
  case: Smartphone,
  earbuds: Headphones,
  "screen-protector": Shield,
  "power-bank": Plug,
  other: Plug,
};

export function ProductCard({ product }: ProductCardProps) {
  const brandName = product.brandName ?? product.brandSlug;
  const defaultVariant = getDefaultVariant(product);
  const gradeDescriptor = getGradeDescriptor(defaultVariant.grade);
  const inStock = isProductInStock(product);
  const offered = hasAnyOffer(product);
  const discountPercent = calculateDiscountPercent(
    defaultVariant.originalPriceRupees,
    defaultVariant.priceRupees,
  );
  const variantCount = product.variants.length;
  const isMultiVariant = variantCount > 1;

  return (
    <Link href={productHref(product)} className="group block focus:outline-none">
      <div className="lift flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--color-ink-200)]">
        <div className="relative aspect-square overflow-hidden bg-[var(--color-canvas-deep)]">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductImage
              imageUrl={product.imageUrl}
              brandName={brandName}
              modelName={product.modelName}
              colorName={defaultVariant.colorName}
              brandSlug={product.brandSlug}
              objectFit="cover"
            />
          </div>

          <WishlistButton
            productId={product.id}
            productSlug={product.slug}
            modelName={product.modelName}
            brandSlug={product.brandSlug}
            brandName={brandName}
            imageUrl={product.imageUrl}
            category={product.category}
            fromPriceRupees={defaultVariant.priceRupees}
          />

          <div className="absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1 md:right-3 md:top-3 md:gap-1.5">
            <span
              className="inline-flex h-5 items-center rounded-[var(--radius-full)] px-2 text-[10px] font-bold uppercase tracking-[0.04em] text-white shadow-[var(--shadow-sm)] md:h-6 md:px-2.5 md:text-[11px]"
              style={{ backgroundColor: GRADE_BG[defaultVariant.grade] }}
            >
              {gradeDescriptor.shortLabel}
            </span>
            <CategoryTopBadge product={product} variant={defaultVariant} />
          </div>

          {!inStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)] md:px-4 md:py-1.5 md:text-[11px]">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-1.5 p-2.5 md:p-3">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-[10px] md:text-[11px]">
                <span className="line-clamp-1 font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                  {brandName}
                </span>
                <span className="line-clamp-1 shrink-0 text-[var(--color-ink-500)]">
                  {defaultVariant.colorName}
                </span>
              </div>
              <h3 className="line-clamp-1 text-[14px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] md:text-[16px]">
                {product.modelName}
              </h3>
            </div>

            <SpecChips product={product} variant={defaultVariant} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-2.5 py-2 md:px-3 md:py-2.5">
            <div className="flex items-baseline gap-2">
              <p className="text-[15px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)] md:text-[17px]">
                {formatPrice(defaultVariant.priceRupees)}
              </p>
              {offered && discountPercent > 0 && (
                <p className="text-[11px] leading-none text-[var(--color-ink-400)] line-through md:text-[12.5px]">
                  {formatPrice(defaultVariant.originalPriceRupees)}
                </p>
              )}
            </div>
            {isMultiVariant && (
              <span className="inline-flex items-center gap-0.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-ink-700)] md:gap-1 md:px-2 md:py-0.5 md:text-[11px]">
                <Layers size={9} className="md:size-[11px]" />
                {variantCount}
                <span className="hidden md:inline"> options</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

interface CategoryTopBadgeProps {
  product: Product;
  variant: AnyVariant;
}

function CategoryTopBadge({ product, variant }: CategoryTopBadgeProps) {
  if (isPhone(product)) {
    const phoneVariant = variant as PhoneVariant;
    if (!phoneVariant.isPtaApproved) {
      return null;
    }
    return (
      <span className="inline-flex h-[18px] items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--color-pak-green)] px-1.5 text-[9px] font-bold uppercase tracking-[0.05em] text-white shadow-[var(--shadow-sm)] md:h-5 md:gap-1 md:text-[10px]">
        <BadgeCheck size={9} strokeWidth={2.8} className="md:size-[10px]" />
        PTA
      </span>
    );
  }
  if (isAccessory(product)) {
    const accVariant = variant as AccessoryVariant;
    if (!accVariant.isGenuine) {
      return null;
    }
    return (
      <span className="inline-flex h-[18px] items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--color-ink-900)] px-1.5 text-[9px] font-bold uppercase tracking-[0.05em] text-white shadow-[var(--shadow-sm)] md:h-5 md:gap-1 md:text-[10px]">
        <BadgeCheck size={9} strokeWidth={2.8} className="md:size-[10px]" />
        OEM
      </span>
    );
  }
  return null;
}

interface SpecChipsProps {
  product: Product;
  variant: AnyVariant;
}

function SpecChips({ product, variant }: SpecChipsProps) {
  if (isPhone(product)) {
    const phoneVariant = variant as PhoneVariant;
    return (
      <div className="flex flex-nowrap items-center gap-1.5 text-[10.5px] text-[var(--color-ink-700)] md:gap-2 md:text-[12px]">
        <Chip>
          <HardDrive size={11} className="text-[var(--color-ink-500)] md:size-[12px]" />
          {formatStorage(phoneVariant.storageGb)}
        </Chip>
        <Chip>
          <BatteryMedium size={11} className="text-[var(--color-ink-500)] md:size-[12px]" />
          {formatBatteryRange(phoneVariant.batteryHealthRange)}
        </Chip>
      </div>
    );
  }
  if (isAccessory(product)) {
    return <AccessorySpecChips product={product} variant={variant as AccessoryVariant} />;
  }
  return null;
}

function AccessorySpecChips({
  product,
  variant,
}: {
  product: Accessory;
  variant: AccessoryVariant;
}) {
  const TypeIcon = ACCESSORY_TYPE_ICON[product.accessoryType] ?? Plug;
  const typeLabel = ACCESSORY_TYPE_LABEL[product.accessoryType] ?? "Accessory";

  const secondChip: React.ReactNode = (() => {
    if (variant.wattage) {
      return (
        <Chip>
          <Zap size={11} className="text-[var(--color-ink-500)] md:size-[12px]" />
          {variant.wattage}W
        </Chip>
      );
    }
    if (variant.lengthMeters) {
      return (
        <Chip>
          <Cable size={11} className="text-[var(--color-ink-500)] md:size-[12px]" />
          {variant.lengthMeters} m
        </Chip>
      );
    }
    if (variant.connector && variant.connector !== "n-a") {
      return (
        <Chip>
          <Plug size={11} className="text-[var(--color-ink-500)] md:size-[12px]" />
          {connectorLabel(variant.connector)}
        </Chip>
      );
    }
    return null;
  })();

  return (
    <div className="flex flex-nowrap items-center gap-1.5 text-[10.5px] text-[var(--color-ink-700)] md:gap-2 md:text-[12px]">
      <Chip>
        <TypeIcon size={11} className="text-[var(--color-ink-500)] md:size-[12px]" />
        {typeLabel}
      </Chip>
      {secondChip}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 md:px-2 md:py-1">
      {children}
    </span>
  );
}

function connectorLabel(connector: NonNullable<AccessoryVariant["connector"]>): string {
  switch (connector) {
    case "usb-c":
      return "USB-C";
    case "lightning":
      return "Lightning";
    case "micro-usb":
      return "Micro-USB";
    case "wireless":
      return "Wireless";
    default:
      return "—";
  }
}

