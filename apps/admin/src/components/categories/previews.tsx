"use client";

/**
 * Storefront-styled mini renderers used inside the category workspace
 * preview panels. They are intentionally local to the admin app right
 * now — once Phase 3.1 extracts the storefront visuals into
 * `@store/shared/storefrontVisuals`, the imports below switch to that
 * package and these wrappers shrink to thin adapters.
 *
 * Every renderer is a *pure* function of its props: no fetches, no
 * routing, no context. The form passes deferred state down so 80 wpm
 * typing doesn't stall the editor.
 */

import Image from "next/image";
import type { ReactNode } from "react";
import type { StoredImage } from "@store/shared";

import type {
  AdminAttribute,
  AdminAttributeOption,
  AdminBrand,
  AdminCategory,
  AdminCategoryIconKind,
  AdminGrade,
} from "@/types/admin";

/* --------------------------------------------------------------------------
 * CategoryCardPreview — homepage category grid tile
 * ------------------------------------------------------------------------ */

interface CategoryDraft {
  label: string;
  description: string;
  iconKind: AdminCategoryIconKind;
  iconEmoji?: string;
  iconImage?: StoredImage;
  isActive: boolean;
}

export function CategoryCardPreview({ category }: { category: CategoryDraft }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-3">
      <CategoryIcon category={category} size={42} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[var(--color-ink-900)]">
          {category.label || "Untitled category"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[var(--color-ink-600)]">
          {category.description || "Describe the category so customers know what to expect."}
        </p>
      </div>
      {!category.isActive && (
        <span className="rounded-full bg-[var(--color-ink-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-500)]">
          Hidden
        </span>
      )}
    </div>
  );
}

export function CategoryHeaderPreview({ category }: { category: CategoryDraft }) {
  return (
    <div className="flex items-center gap-4 bg-gradient-to-b from-[var(--color-canvas-deep)] to-[var(--color-canvas)] px-4 py-5">
      <CategoryIcon category={category} size={56} />
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-700)]">
          Storefront
        </p>
        <h1 className="text-[18px] font-semibold text-[var(--color-ink-900)]">
          {category.label || "Untitled"}
        </h1>
        <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-600)]">
          {category.description || "Storefront tagline appears here."}
        </p>
      </div>
    </div>
  );
}

export function CategoryNavChipPreview({ category }: { category: CategoryDraft }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-ink-800)]">
        <CategoryIcon category={category} size={16} compact />
        {category.label || "Category"}
      </span>
      <span className="text-[12px] text-[var(--color-ink-400)]">
        · Home · Shop
      </span>
    </div>
  );
}

function CategoryIcon({
  category,
  size,
  compact = false,
}: {
  category: CategoryDraft;
  size: number;
  compact?: boolean;
}) {
  const isImage = category.iconKind === "image" && category.iconImage;
  if (isImage && category.iconImage) {
    return (
      <span
        className="inline-block overflow-hidden rounded-md bg-[var(--color-surface)]"
        style={{ width: size, height: size }}
      >
        <Image
          src={category.iconImage.variants.thumb}
          alt={category.iconImage.alt || category.label || "Category icon"}
          width={category.iconImage.width}
          height={category.iconImage.height}
          placeholder={
            category.iconImage.blurDataURL ? "blur" : "empty"
          }
          blurDataURL={category.iconImage.blurDataURL || undefined}
          className="size-full object-cover"
        />
      </span>
    );
  }
  const emoji = category.iconEmoji && category.iconEmoji.length > 0
    ? category.iconEmoji
    : "📦";
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-md bg-[var(--color-surface)]" +
        (compact ? "" : " shadow-[var(--shadow-sm)]")
      }
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

/* --------------------------------------------------------------------------
 * BrandChipPreview / BrandFilterRowPreview
 * ------------------------------------------------------------------------ */

interface BrandDraft {
  name: string;
  isActive: boolean;
}

export function BrandChipPreview({ brand }: { brand: BrandDraft }) {
  return (
    <div className="flex items-center gap-2 p-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-ink-800)]">
        {brand.name || "Brand"}
      </span>
      <span className="text-[11.5px] text-[var(--color-ink-400)]">on Product card</span>
    </div>
  );
}

export function BrandFilterRowPreview({
  brand,
  siblingNames,
}: {
  brand: BrandDraft;
  siblingNames: string[];
}) {
  return (
    <div className="p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Brand
      </p>
      <ul className="mt-1.5 space-y-1">
        <li className="flex items-center justify-between gap-2 rounded-md bg-[var(--color-accent-50)] px-2 py-1 text-[12.5px] font-semibold text-[var(--color-ink-900)]">
          <span className="truncate">{brand.name || "Brand"}</span>
          <span className="text-[10px] text-[var(--color-ink-400)]">·</span>
        </li>
        {siblingNames.slice(0, 3).map((name) => (
          <li
            key={name}
            className="flex items-center justify-between gap-2 px-2 py-1 text-[12px] text-[var(--color-ink-700)]"
          >
            <span className="truncate">{name}</span>
            <span className="text-[10px] text-[var(--color-ink-400)]">·</span>
          </li>
        ))}
        {siblingNames.length === 0 && (
          <li className="px-2 py-1 text-[11.5px] italic text-[var(--color-ink-400)]">
            More brands will appear here.
          </li>
        )}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * GradeBadgePreview / GradeShowcasePreview
 * ------------------------------------------------------------------------ */

interface GradeDraft {
  label: string;
  notes: string;
  color: string;
  video: string;
}

export function GradeBadgePreview({ grade }: { grade: GradeDraft }) {
  return (
    <div className="p-3">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white shadow-sm"
        style={{ backgroundColor: grade.color }}
      >
        {grade.label || "Grade"}
      </span>
    </div>
  );
}

export function GradeShowcasePreview({ grade }: { grade: GradeDraft }) {
  return (
    <div className="p-3">
      <div
        className="rounded-md border p-3"
        style={{
          borderColor: grade.color,
          backgroundColor: `${grade.color}10`,
        }}
      >
        <p
          className="text-[11.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: grade.color }}
        >
          {grade.label || "Grade"}
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-[var(--color-ink-700)]">
          {grade.notes || "Grade notes will appear here."}
        </p>
        {grade.video ? (
          <p className="mt-2 text-[10.5px] text-[var(--color-ink-500)]">
            Inspection video attached
          </p>
        ) : (
          <p className="mt-2 text-[10.5px] italic text-[var(--color-rose-700)]">
            No inspection video yet
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * AttributePreviews
 * ------------------------------------------------------------------------ */

interface AttributeDraft {
  label: string;
  cardPosition: AdminAttribute["cardPosition"];
  options: AdminAttributeOption[];
  isActive: boolean;
}

export function AttributeSpecStripPreview({ attribute }: { attribute: AttributeDraft }) {
  return (
    <div className="p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {attribute.label || "Attribute"}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {attribute.options.length === 0 && (
          <span className="text-[11.5px] italic text-[var(--color-ink-400)]">
            Add an option to preview.
          </span>
        )}
        {attribute.options.slice(0, 5).map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-2 py-0.5 text-[11.5px] text-[var(--color-ink-800)]"
          >
            {opt.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AttributeFilterGroupPreview({
  attribute,
}: {
  attribute: AttributeDraft;
}) {
  return (
    <div className="p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {attribute.label || "Attribute"}
      </p>
      <ul className="mt-1.5 space-y-1">
        {attribute.options.length === 0 && (
          <li className="text-[11.5px] italic text-[var(--color-ink-400)]">
            No options yet.
          </li>
        )}
        {attribute.options.slice(0, 6).map((opt) => (
          <li
            key={opt.value}
            className="flex items-center gap-2 text-[12px] text-[var(--color-ink-700)]"
          >
            <span className="inline-block size-3 rounded border border-[var(--color-ink-300)] bg-[var(--color-surface)]" />
            <span className="truncate">{opt.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AttributeCardChipPreview({
  attribute,
}: {
  attribute: AttributeDraft;
}) {
  const first = attribute.options[0];
  return (
    <div className="flex items-center gap-2 p-3">
      <div className="aspect-[3/4] w-14 rounded-md bg-[var(--color-ink-100)]" />
      <div className="flex-1">
        <p className="text-[12px] font-semibold text-[var(--color-ink-900)]">
          Sample product
        </p>
        <p className="text-[11px] text-[var(--color-ink-500)]">Brand · Rs 0</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {first && (
            <span className="inline-flex items-center rounded-full bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent-800)]">
              {first.label}
            </span>
          )}
          {!first && (
            <span className="text-[10.5px] italic text-[var(--color-ink-400)]">
              Add an option to preview.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Listed-card placeholders used in the empty-state grid tiles
 * ------------------------------------------------------------------------ */

export function NeighborSlot({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] p-2 text-[10.5px] italic text-[var(--color-ink-400)]">
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Helpers used by parent components when projecting models → draft shapes
 * ------------------------------------------------------------------------ */

export function categoryToDraft(category: AdminCategory): CategoryDraft {
  return {
    label: category.label,
    description: category.description,
    iconKind: category.iconKind,
    iconEmoji: category.iconEmoji,
    iconImage: category.iconImage,
    isActive: category.isActive,
  };
}

export function brandToDraft(brand: AdminBrand): BrandDraft {
  return { name: brand.name, isActive: brand.isActive };
}

export function gradeToDraft(grade: AdminGrade): GradeDraft {
  return {
    label: grade.label,
    notes: grade.notes,
    color: grade.color,
    video: grade.video,
  };
}

export function attributeToDraft(attribute: AdminAttribute): AttributeDraft {
  return {
    label: attribute.label,
    cardPosition: attribute.cardPosition,
    options: attribute.options,
    isActive: attribute.isActive,
  };
}

export type { AttributeDraft, BrandDraft, CategoryDraft, GradeDraft };
