"use client";

/**
 * Categories workspace — top-level Phase 3 client component.
 *
 * Renders a responsive grid of CategoryCards. Each card hosts the
 * category's brands (inline chips), grades (compact rows), and
 * attributes (compact rows). Drawer-based editors handle authoring
 * with live preview panels per surface.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";

import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import type {
  AdminAttribute,
  AdminBrand,
  AdminCategory,
  AdminGrade,
} from "@/types/admin";

import { AttributeEditor } from "./AttributeEditor";
import { BrandEditor } from "./BrandEditor";
import { CategoryEditor } from "./CategoryEditor";
import { GradeEditor } from "./GradeEditor";

interface CategoriesWorkspaceProps {
  initialCategories: AdminCategory[];
  initialBrands: AdminBrand[];
  initialGrades: AdminGrade[];
  initialAttributes: AdminAttribute[];
}

type DrawerKind =
  | { kind: "category"; category: AdminCategory | null }
  | { kind: "brand"; category: AdminCategory; brand: AdminBrand | null }
  | { kind: "grade"; category: AdminCategory; grade: AdminGrade | null }
  | {
      kind: "attribute";
      category: AdminCategory;
      attribute: AdminAttribute | null;
    }
  | null;

interface DeleteIntent {
  kind: "category" | "brand" | "grade" | "attribute";
  id: string;
  label: string;
  /** For brands deleted from a single category (unlink instead of full delete). */
  unlinkFromCategorySlug?: string;
}

export function Categories({
  initialCategories,
  initialBrands,
  initialGrades,
  initialAttributes,
}: CategoriesWorkspaceProps) {
  const toast = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [brands, setBrands] = useState(initialBrands);
  const [grades, setGrades] = useState(initialGrades);
  const [attributes, setAttributes] = useState(initialAttributes);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [cats, brs, grds, attrs] = await Promise.all([
        adminFetch<{ items: AdminCategory[] }>("/api/categories"),
        adminFetch<{ items: AdminBrand[] }>("/api/brands?limit=200"),
        adminFetch<{ items: AdminGrade[] }>("/api/grades"),
        adminFetch<{ items: AdminAttribute[] }>("/api/attributes"),
      ]);
      setCategories(cats.items);
      setBrands(brs.items);
      setGrades(grds.items);
      setAttributes(attrs.items);
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : "Failed to refresh categories.";
      toast.danger(message);
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server-provided initial data when the page re-renders with fresh props
    setCategories(initialCategories);
  }, [initialCategories]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server-provided initial data when the page re-renders with fresh props
    setBrands(initialBrands);
  }, [initialBrands]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server-provided initial data when the page re-renders with fresh props
    setGrades(initialGrades);
  }, [initialGrades]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server-provided initial data when the page re-renders with fresh props
    setAttributes(initialAttributes);
  }, [initialAttributes]);

  const grouped = useMemo(() => {
    return categories.map((category) => ({
      category,
      brands: brands.filter((brand) =>
        brand.categorySlugs.includes(category.slug),
      ),
      grades: grades
        .filter((grade) => grade.categorySlug === category.slug)
        .sort((a, b) => a.label.localeCompare(b.label)),
      attributes: attributes
        .filter((attr) => attr.categorySlug === category.slug)
        .sort((a, b) => a.label.localeCompare(b.label)),
    }));
  }, [categories, brands, grades, attributes]);

  async function handleConfirmDelete() {
    if (!deleteIntent) return;
    const { kind, id, label, unlinkFromCategorySlug } = deleteIntent;
    setDeleteIntent(null);
    try {
      if (kind === "brand" && unlinkFromCategorySlug) {
        const brand = brands.find((b) => b.id === id);
        if (!brand) return;
        const nextSlugs = brand.categorySlugs.filter(
          (slug) => slug !== unlinkFromCategorySlug,
        );
        if (nextSlugs.length === 0) {
          await adminFetch(`/api/brands/${id}`, { method: "DELETE" });
        } else {
          await adminFetch<AdminBrand>(`/api/brands/${id}`, {
            method: "PUT",
            json: { categorySlugs: nextSlugs },
          });
        }
        toast.success(`Removed brand "${label}".`);
      } else {
        const path =
          kind === "category"
            ? `/api/categories/${id}`
            : kind === "brand"
              ? `/api/brands/${id}`
              : kind === "grade"
                ? `/api/grades/${id}`
                : `/api/attributes/${id}`;
        await adminFetch(path, { method: "DELETE" });
        toast.success(`Deleted ${kind} "${label}".`);
      }
      await refreshAll();
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : `Failed to delete ${kind}.`;
      toast.danger(message);
    }
  }

  async function moveCategory(category: AdminCategory, direction: -1 | 1) {
    const nextSortOrder = category.sortOrder + direction;
    try {
      await adminFetch<AdminCategory>(`/api/categories/${category.id}`, {
        method: "PUT",
        json: { sortOrder: nextSortOrder },
      });
      await refreshAll();
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : "Failed to reorder category.";
      toast.danger(message);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            {refreshing ? "Syncing…" : `${categories.length} categories`}
          </p>
          <p className="mt-1 max-w-prose text-[13px] text-[var(--color-ink-600)]">
            Each category owns its brands, grades, and attributes. Authoring
            here propagates straight to the storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ kind: "category", category: null })}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-600)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-700)]"
        >
          <Plus size={14} /> New category
        </button>
      </header>

      {grouped.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-6 py-16 text-center">
          <Sparkles
            size={26}
            className="mx-auto text-[var(--color-accent-600)]"
            aria-hidden
          />
          <p className="mt-3 text-[15px] font-semibold text-[var(--color-ink-900)]">
            Create your first category
          </p>
          <p className="mx-auto mt-1 max-w-prose text-[13px] text-[var(--color-ink-600)]">
            Categories are the buckets that brands, grades, and attributes
            attach to. Once you have at least one, products can be created
            against it.
          </p>
          <button
            type="button"
            onClick={() => setDrawer({ kind: "category", category: null })}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-600)] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[var(--color-accent-700)]"
          >
            <Plus size={14} /> Create category
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          {grouped.map(
            (
              { category, brands: brandsForCategory, grades: gradesForCategory, attributes: attrsForCategory },
              index,
            ) => (
              <li key={category.id}>
                <CategoryCard
                  category={category}
                  brands={brandsForCategory}
                  grades={gradesForCategory}
                  attributes={attrsForCategory}
                  isFirst={index === 0}
                  isLast={index === grouped.length - 1}
                  onEditCategory={() =>
                    setDrawer({ kind: "category", category })
                  }
                  onDeleteCategory={() =>
                    setDeleteIntent({
                      kind: "category",
                      id: category.id,
                      label: category.label,
                    })
                  }
                  onMoveUp={() => moveCategory(category, -1)}
                  onMoveDown={() => moveCategory(category, 1)}
                  onAddBrand={() =>
                    setDrawer({ kind: "brand", category, brand: null })
                  }
                  onEditBrand={(brand) =>
                    setDrawer({ kind: "brand", category, brand })
                  }
                  onRemoveBrand={(brand) =>
                    setDeleteIntent({
                      kind: "brand",
                      id: brand.id,
                      label: brand.name,
                      unlinkFromCategorySlug: category.slug,
                    })
                  }
                  onAddGrade={() =>
                    setDrawer({ kind: "grade", category, grade: null })
                  }
                  onEditGrade={(grade) =>
                    setDrawer({ kind: "grade", category, grade })
                  }
                  onDeleteGrade={(grade) =>
                    setDeleteIntent({
                      kind: "grade",
                      id: grade.id,
                      label: grade.label,
                    })
                  }
                  onAddAttribute={() =>
                    setDrawer({
                      kind: "attribute",
                      category,
                      attribute: null,
                    })
                  }
                  onEditAttribute={(attribute) =>
                    setDrawer({ kind: "attribute", category, attribute })
                  }
                  onDeleteAttribute={(attribute) =>
                    setDeleteIntent({
                      kind: "attribute",
                      id: attribute.id,
                      label: attribute.label,
                    })
                  }
                />
              </li>
            ),
          )}
        </ul>
      )}

      <CategoryEditor
        isOpen={drawer?.kind === "category"}
        onClose={() => setDrawer(null)}
        category={drawer?.kind === "category" ? drawer.category : null}
        onSaved={refreshAll}
      />
      {drawer?.kind === "brand" && (
        <BrandEditor
          isOpen
          onClose={() => setDrawer(null)}
          category={drawer.category}
          brand={drawer.brand}
          siblings={brands.filter((b) =>
            b.categorySlugs.includes(drawer.category.slug),
          )}
          onSaved={refreshAll}
        />
      )}
      {drawer?.kind === "grade" && (
        <GradeEditor
          isOpen
          onClose={() => setDrawer(null)}
          category={drawer.category}
          grade={drawer.grade}
          onSaved={refreshAll}
        />
      )}
      {drawer?.kind === "attribute" && (
        <AttributeEditor
          isOpen
          onClose={() => setDrawer(null)}
          category={drawer.category}
          attribute={drawer.attribute}
          onSaved={refreshAll}
        />
      )}

      <ConfirmDialog
        isOpen={deleteIntent !== null}
        onCancel={() => setDeleteIntent(null)}
        onConfirm={handleConfirmDelete}
        title={deleteIntent ? `Delete "${deleteIntent.label}"?` : "Delete"}
        message={
          deleteIntent?.kind === "brand" && deleteIntent.unlinkFromCategorySlug
            ? "If this brand isn't linked to any other category it will be removed entirely."
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        tone="danger"
      />
    </>
  );
}

interface CategoryCardProps {
  category: AdminCategory;
  brands: AdminBrand[];
  grades: AdminGrade[];
  attributes: AdminAttribute[];
  isFirst: boolean;
  isLast: boolean;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBrand: () => void;
  onEditBrand: (brand: AdminBrand) => void;
  onRemoveBrand: (brand: AdminBrand) => void;
  onAddGrade: () => void;
  onEditGrade: (grade: AdminGrade) => void;
  onDeleteGrade: (grade: AdminGrade) => void;
  onAddAttribute: () => void;
  onEditAttribute: (attribute: AdminAttribute) => void;
  onDeleteAttribute: (attribute: AdminAttribute) => void;
}

function CategoryCard({
  category,
  brands,
  grades,
  attributes,
  isFirst,
  isLast,
  onEditCategory,
  onDeleteCategory,
  onMoveUp,
  onMoveDown,
  onAddBrand,
  onEditBrand,
  onRemoveBrand,
  onAddGrade,
  onEditGrade,
  onDeleteGrade,
  onAddAttribute,
  onEditAttribute,
  onDeleteAttribute,
}: CategoryCardProps) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <header className="flex items-start gap-3">
        <CategoryIconBlock category={category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[17px] font-semibold text-[var(--color-ink-900)]">
              {category.label}
            </h2>
            {!category.isActive && (
              <span className="rounded-full bg-[var(--color-ink-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-500)]">
                Hidden
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[var(--color-ink-600)]">
            {category.description}
          </p>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
            slug: {category.slug}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <CardIconButton
            label="Move up"
            disabled={isFirst}
            onClick={onMoveUp}
            icon={<ChevronUp size={14} />}
          />
          <CardIconButton
            label="Move down"
            disabled={isLast}
            onClick={onMoveDown}
            icon={<ChevronDown size={14} />}
          />
          <CardIconButton
            label="Edit category"
            onClick={onEditCategory}
            icon={<Pencil size={14} />}
          />
          <CardIconButton
            label="Delete category"
            onClick={onDeleteCategory}
            icon={<Trash2 size={14} />}
            tone="danger"
          />
        </div>
      </header>

      <CardBlock title="Brands" onAdd={onAddBrand} addLabel="Add brand">
        {brands.length === 0 ? (
          <EmptyBlock copy="No brands yet — add one to power the filter sidebar and product card chip." />
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {brands.map((brand) => (
              <li key={brand.id}>
                <span className="group inline-flex items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1 text-[12.5px] font-semibold text-[var(--color-ink-800)]">
                  <button
                    type="button"
                    onClick={() => onEditBrand(brand)}
                    className="hover:text-[var(--color-accent-700)]"
                  >
                    {brand.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBrand(brand)}
                    aria-label={`Remove ${brand.name} from ${category.label}`}
                    className="rounded-full p-0.5 text-[var(--color-ink-400)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)]"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBlock>

      <CardBlock title="Grades" onAdd={onAddGrade} addLabel="Add grade">
        {grades.length === 0 ? (
          <EmptyBlock copy="No grades yet — required before products can attach a condition." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {grades.map((grade) => (
              <li key={grade.id}>
                <button
                  type="button"
                  onClick={() => onEditGrade(grade)}
                  className="group flex w-full items-center gap-2 rounded-md border border-transparent bg-[var(--color-canvas-deep)] px-2 py-1.5 text-left hover:border-[var(--color-accent-200)]"
                >
                  <span
                    className="inline-block size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: grade.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-[13px] font-semibold text-[var(--color-ink-900)]">
                    {grade.label}
                  </span>
                  <span className="truncate text-[11.5px] text-[var(--color-ink-500)]">
                    {grade.notes.slice(0, 60)}
                  </span>
                  <span
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGrade(grade);
                    }}
                    className="rounded p-1 text-[var(--color-ink-400)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)]"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBlock>

      <CardBlock title="Attributes" onAdd={onAddAttribute} addLabel="Add attribute">
        {attributes.length === 0 ? (
          <EmptyBlock copy="No attributes yet — define dimensions like Storage, RAM, or Color." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {attributes.map((attribute) => (
              <li key={attribute.id}>
                <button
                  type="button"
                  onClick={() => onEditAttribute(attribute)}
                  className="group flex w-full items-center gap-2 rounded-md border border-transparent bg-[var(--color-canvas-deep)] px-2 py-1.5 text-left hover:border-[var(--color-accent-200)]"
                >
                  <Tag size={12} className="shrink-0 text-[var(--color-ink-500)]" />
                  <span className="flex-1 truncate text-[13px] font-semibold text-[var(--color-ink-900)]">
                    {attribute.label}
                  </span>
                  <span className="rounded-full bg-[var(--color-ink-100)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink-700)]">
                    {attribute.options.length} opts
                  </span>
                  <span className="rounded-full bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent-800)]">
                    {attribute.cardPosition}
                  </span>
                  <span
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAttribute(attribute);
                    }}
                    className="rounded p-1 text-[var(--color-ink-400)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)]"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBlock>
    </article>
  );
}

function CategoryIconBlock({ category }: { category: AdminCategory }) {
  if (category.iconKind === "image" && category.iconImage) {
    return (
      <span
        className="block size-12 shrink-0 overflow-hidden rounded-md bg-[var(--color-canvas-deep)]"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- icons are 64-256px and not worth the optimizer per-request cost */}
        <img
          src={category.iconImage.variants.thumb}
          alt={category.iconImage.alt || category.label}
          className="size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className="grid size-12 shrink-0 place-items-center rounded-md bg-[var(--color-canvas-deep)] text-[24px]"
      aria-hidden
    >
      {category.iconEmoji || "📦"}
    </span>
  );
}

function CardBlock({
  title,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/30 p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          {title}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1 text-[11.5px] font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]"
        >
          <Plus size={11} /> {addLabel}
        </button>
      </header>
      {children}
    </section>
  );
}

function EmptyBlock({ copy }: { copy: string }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-3 text-[12px] italic text-[var(--color-ink-500)]">
      {copy}
    </p>
  );
}

function CardIconButton({
  label,
  icon,
  onClick,
  disabled,
  tone = "neutral",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={
        "rounded p-1.5 transition disabled:opacity-30 " +
        (tone === "danger"
          ? "text-[var(--color-ink-500)] hover:bg-[var(--color-rose-100)] hover:text-[var(--color-rose-700)]"
          : "text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]")
      }
    >
      {icon}
    </button>
  );
}

export function CategoriesLoadingPlaceholder() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
        >
          <Skeleton shape="text" className="h-6 w-1/3" />
          <Skeleton shape="text" className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
