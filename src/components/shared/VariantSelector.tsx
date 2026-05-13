"use client";

import { useState } from "react";
import {
  BatteryMedium,
  Check,
  GitCompare,
  HardDrive,
  Info,
  Palette,
  ShoppingBag,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { CompareVariantsModal } from "@/components/shared/CompareVariantsModal";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { PtaBadge } from "@/components/shared/PtaBadge";
import { StockTypeBadge } from "@/components/shared/StockTypeBadge";
import { getStockTypeDescriptor } from "@/data/stockTypes";
import { buildWhatsAppLink } from "@/lib/constants";
import {
  calculateDiscountPercent,
  classNames,
  formatBatteryRange,
  formatPrice,
  formatStorage,
} from "@/lib/utils";
import type { Phone, PhoneVariant } from "@/types";

interface VariantSelectorProps {
  phone: Phone;
  brandName: string;
  initialVariantId: string;
}

export function VariantSelector({ phone, brandName, initialVariantId }: VariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const selected =
    phone.variants.find((variant) => variant.id === selectedVariantId) ?? phone.variants[0];

  const discountPercent = calculateDiscountPercent(
    selected.originalPriceRupees,
    selected.priceRupees,
  );
  const hasDiscount = discountPercent > 0;
  const stockTypeDescriptor = getStockTypeDescriptor(selected.stockType);
  const showCompare = phone.variants.length > 1;

  const whatsappMessage = `Salam! I'd like to order the ${brandName} ${phone.modelName} — ${stockTypeDescriptor.label} (Grade ${selected.grade}, ${formatStorage(
    selected.storageGb,
  )}, ${selected.colorName}) for ${formatPrice(selected.priceRupees)}.`;

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <GradeBadge grade={selected.grade} size="md" showLabel />
          <StockTypeBadge stockType={selected.stockType} size="md" />
          {selected.isPtaApproved && <PtaBadge size="md" showLabel />}
          {!selected.isInStock && (
            <Pill tone="danger" size="md">
              Sold out
            </Pill>
          )}
        </div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          {brandName}
        </p>
        <h1 className="text-5xl font-semibold leading-[1] tracking-[-0.03em] text-[var(--color-ink-900)] sm:text-6xl">
          {phone.modelName}
        </h1>
        <p className="text-base text-[var(--color-ink-600)]">
          {selected.colorName} · {formatStorage(selected.storageGb)} · {selected.ramGb} GB RAM
        </p>
      </div>

      <PriceBlock
        priceRupees={selected.priceRupees}
        originalPriceRupees={selected.originalPriceRupees}
        discountPercent={discountPercent}
        hasDiscount={hasDiscount}
      />

      <SpecGrid variant={selected} />

      <VariantList
        variants={phone.variants}
        selectedVariantId={selected.id}
        onSelect={setSelectedVariantId}
        onOpenCompare={showCompare ? () => setIsCompareOpen(true) : undefined}
      />

      <StockTypeInfo
        label={stockTypeDescriptor.label}
        description={stockTypeDescriptor.description}
        notes={selected.notes}
      />

      <PurchaseActions isInStock={selected.isInStock} whatsappMessage={whatsappMessage} />

      {isCompareOpen && (
        <CompareVariantsModal
          phone={phone}
          brandName={brandName}
          selectedVariantId={selected.id}
          onClose={() => setIsCompareOpen(false)}
          onSelect={setSelectedVariantId}
        />
      )}
    </div>
  );
}

interface PriceBlockProps {
  priceRupees: number;
  originalPriceRupees: number;
  discountPercent: number;
  hasDiscount: boolean;
}

function PriceBlock({
  priceRupees,
  originalPriceRupees,
  discountPercent,
  hasDiscount,
}: PriceBlockProps) {
  const bankTransferPrice = Math.round(priceRupees * 0.95);
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-5xl font-semibold leading-none tracking-[-0.03em] text-[var(--color-ink-900)]">
          {formatPrice(priceRupees)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-base text-[var(--color-ink-400)] line-through">
              {formatPrice(originalPriceRupees)}
            </span>
            <Pill tone="accent" size="md">
              You save {discountPercent}%
            </Pill>
          </>
        )}
      </div>
      <p className="mt-2 text-sm text-[var(--color-ink-600)]">
        Or{" "}
        <span className="font-semibold text-[var(--color-accent-700)]">
          {formatPrice(bankTransferPrice)}
        </span>{" "}
        with full bank transfer (5% off)
      </p>
    </div>
  );
}

interface SpecGridProps {
  variant: PhoneVariant;
}

function SpecGrid({ variant }: SpecGridProps) {
  const specs = [
    { icon: <HardDrive size={16} />, label: "Storage", value: formatStorage(variant.storageGb) },
    { icon: <BatteryMedium size={16} />, label: "Battery (range)", value: formatBatteryRange(variant.batteryHealthRange) },
    { icon: <Palette size={16} />, label: "Colour", value: variant.colorName },
    { icon: <Info size={16} />, label: "Warranty", value: `${variant.warrantyMonths} months` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {specs.map((spec) => (
        <div
          key={spec.label}
          className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3"
        >
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-500)]">
            {spec.icon}
            <span>{spec.label}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">{spec.value}</p>
        </div>
      ))}
    </div>
  );
}

interface VariantListProps {
  variants: PhoneVariant[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
  onOpenCompare?: () => void;
}

function VariantList({ variants, selectedVariantId, onSelect, onOpenCompare }: VariantListProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-700)]">
          Available variants
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-ink-500)]">
            {variants.length} {variants.length === 1 ? "option" : "options"}
          </span>
          {onOpenCompare && (
            <button
              type="button"
              onClick={onOpenCompare}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)]"
            >
              <GitCompare size={12} />
              Compare all
            </button>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            isSelected={variant.id === selectedVariantId}
            onSelect={() => onSelect(variant.id)}
          />
        ))}
      </ul>
    </div>
  );
}

interface VariantRowProps {
  variant: PhoneVariant;
  isSelected: boolean;
  onSelect: () => void;
}

function VariantRow({ variant, isSelected, onSelect }: VariantRowProps) {
  const discountPercent = calculateDiscountPercent(
    variant.originalPriceRupees,
    variant.priceRupees,
  );
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={!variant.isInStock}
        aria-pressed={isSelected}
        className={classNames(
          "group flex w-full flex-col gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-all sm:flex-row sm:items-center sm:gap-4",
          isSelected
            ? "border-[var(--color-ink-900)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
            : "border-[var(--color-ink-100)] bg-[var(--color-surface)] hover:border-[var(--color-ink-300)]",
          !variant.isInStock && "opacity-60",
        )}
      >
        <span
          aria-hidden
          className={classNames(
            "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
            isSelected
              ? "border-[var(--color-accent-700)] bg-[var(--color-accent-700)] text-white"
              : "border-[var(--color-ink-300)] bg-[var(--color-surface)]",
          )}
        >
          {isSelected && <Check size={12} strokeWidth={3} />}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <GradeBadge grade={variant.grade} size="sm" />
            <StockTypeBadge stockType={variant.stockType} size="sm" />
            {variant.isPtaApproved && <PtaBadge size="sm" />}
            {!variant.isInStock && (
              <Pill tone="danger" size="sm">
                Sold out
              </Pill>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink-600)]">
            <span>{formatStorage(variant.storageGb)}</span>
            <span className="text-[var(--color-ink-300)]">·</span>
            <span>{variant.colorName}</span>
            <span className="text-[var(--color-ink-300)]">·</span>
            <span className="inline-flex items-center gap-1">
              <BatteryMedium size={12} />
              {formatBatteryRange(variant.batteryHealthRange)}
            </span>
          </div>
          {variant.notes && (
            <p className="text-xs text-[var(--color-ink-500)]">{variant.notes}</p>
          )}
        </div>

        <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <p className="text-base font-semibold tracking-[-0.01em] text-[var(--color-ink-900)] sm:text-lg">
            {formatPrice(variant.priceRupees)}
          </p>
          {discountPercent > 0 && (
            <p className="text-xs text-[var(--color-ink-400)] line-through">
              {formatPrice(variant.originalPriceRupees)}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}

interface StockTypeInfoProps {
  label: string;
  description: string;
  notes?: string;
}

function StockTypeInfo({ label, description, notes }: StockTypeInfoProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-5">
      <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
        <Info size={16} />
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em]">About {label}</h3>
      </div>
      <p className="mt-3 text-sm text-[var(--color-ink-700)]">{description}</p>
      {notes && (
        <p className="mt-2 text-sm font-medium text-[var(--color-ink-900)]">
          On this unit: <span className="font-normal text-[var(--color-ink-700)]">{notes}</span>
        </p>
      )}
    </div>
  );
}

interface PurchaseActionsProps {
  isInStock: boolean;
  whatsappMessage: string;
}

function PurchaseActions({ isInStock, whatsappMessage }: PurchaseActionsProps) {
  return (
    <div className="space-y-3">
      <Button
        variant="primary"
        size="lg"
        leadingIcon={<ShoppingBag size={16} />}
        className="w-full"
        disabled={!isInStock}
      >
        {isInStock ? "Reserve & checkout" : "Currently sold out"}
      </Button>
      {isInStock && (
        <ButtonLink
          href={buildWhatsAppLink(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size="lg"
          className="w-full !bg-[var(--color-whatsapp)] hover:!bg-[var(--color-whatsapp-dark)]"
        >
          Order this variant on WhatsApp
        </ButtonLink>
      )}
    </div>
  );
}
