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
import { LucideIconRenderer } from "@/components/icons/LucideIconRenderer";
import { GradeEditor } from "./GradeEditor";
import { StructuredContentFullPreview } from "@/components/forms/StructuredContentRenderer";

interface CategoriesWorkspaceProps {
  initialCategories: AdminCategory[];
  initialBrands: AdminBrand[];
  initialGrades: AdminGrade[];
  initialAttributes: AdminAttribute[];
  visibleSections?: CatalogSection[];
  /** Renders inside the catalog workspace (no extra page chrome). */
  embedded?: boolean;
}

type CatalogSection = "brands" | "grades" | "attributes";

const ALL_CATALOG_SECTIONS: CatalogSection[] = ["brands", "grades", "attributes"];

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

function getWorkspaceCopy(visibleSections: CatalogSection[]) {
  if (visibleSections.length === 0) {
    return {
      countLabel: (count: number) => `${count} categor${count === 1 ? "y" : "ies"}`,
      description: "Edit storefront category tiles — description, bullets, icon, and SEO.",
    };
  }
  if (visibleSections.length === 1 && visibleSections[0] === "brands") {
    return {
      countLabel: (count: number) => `${count} brand workspaces`,
      description:
        "Manage brands under their categories. Category cards only show brands on this page.",
    };
  }
  if (visibleSections.length === 1 && visibleSections[0] === "grades") {
    return {
      countLabel: (count: number) => `${count} grade workspaces`,
      description:
        "Manage condition grades under their categories. Brand and attribute rows are hidden here.",
    };
  }
  if (visibleSections.length === 1 && visibleSections[0] === "attributes") {
    return {
      countLabel: (count: number) => `${count} attribute workspaces`,
      description:
        "Manage attributes under their categories. Brand and grade rows are hidden here.",
    };
  }
  return {
    countLabel: (count: number) => `${count} categories`,
    description:
      "Each category owns its brands, grades, and attributes. Authoring here propagates straight to the storefront.",
  };
}

export function Categories({
  initialCategories,
  initialBrands,
  initialGrades,
  initialAttributes,
  visibleSections = ALL_CATALOG_SECTIONS,
  embedded = false,
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

  const visibleSectionSet = useMemo(
    () => new Set<CatalogSection>(visibleSections),
    [visibleSections],
  );
  const canManageCategories = visibleSections.length === 0;

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

  const workspaceCopy = getWorkspaceCopy(visibleSections);

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
    const currentIndex = categories.findIndex((item) => item.id === category.id);
    if (currentIndex === -1) {
      return;
    }
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) {
      return;
    }
    const reorderedCategories = [...categories];
    const [movedCategory] = reorderedCategories.splice(currentIndex, 1);
    if (!movedCategory) {
      return;
    }
    reorderedCategories.splice(nextIndex, 0, movedCategory);
    try {
      await Promise.all(
        reorderedCategories.map((item, index) =>
          adminFetch<AdminCategory>(`/api/categories/${item.id}`, {
            method: "PUT",
            json: { sortOrder: index },
          }),
        ),
      );
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
      <header
        className={
          embedded
            ? "mb-3 flex flex-wrap items-end justify-between gap-2"
            : "flex flex-wrap items-end justify-between gap-3"
        }
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            {refreshing ? "Syncing…" : workspaceCopy.countLabel(categories.length)}
          </p>
          <p
            className={
              embedded
                ? "mt-0.5 max-w-prose text-[11px] text-[var(--color-ink-600)]"
                : "mt-1 max-w-prose text-[13px] text-[var(--color-ink-600)]"
            }
          >
            {workspaceCopy.description}
          </p>
        </div>
        {canManageCategories && (
          <button
            type="button"
            onClick={() => setDrawer({ kind: "category", category: null })}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-600)] px-3 text-xs font-semibold text-white hover:bg-[var(--color-accent-700)]"
          >
            <Plus size={13} aria-hidden /> New category
          </button>
        )}
      </header>

      {grouped.length === 0 ? (
        <div
          className={
            embedded
              ? "rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-6 py-12 text-center"
              : "mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] px-6 py-16 text-center"
          }
        >
          <Sparkles
            size={26}
            className="mx-auto text-[var(--color-accent-600)]"
            aria-hidden
          />
          <p className="mt-3 text-[15px] font-semibold text-[var(--color-ink-900)]">
            {canManageCategories ? "Create your first category" : "No categories yet"}
          </p>
          <p className="mx-auto mt-1 max-w-prose text-[13px] text-[var(--color-ink-600)]">
            {canManageCategories
              ? "Add a category tile for the storefront home grid and shop navigation."
              : "Create categories from the Categories page first, then manage this page's content under each category."}
          </p>
          {canManageCategories && (
            <button
              type="button"
              onClick={() => setDrawer({ kind: "category", category: null })}
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-600)] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[var(--color-accent-700)]"
            >
              <Plus size={14} /> Create category
            </button>
          )}
        </div>
      ) : (
        <ul
          className={
            embedded
              ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3"
              : "mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
          }
        >
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
                  visibleSections={visibleSectionSet}
                  canManageCategories={canManageCategories}
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
          siblingAttributes={attributes.filter(
            (row) => row.categorySlug === drawer.category.slug,
          )}
          brands={brands.filter((row) =>
            row.categorySlugs.includes(drawer.category.slug),
          )}
          grades={grades.filter((row) => row.categorySlug === drawer.category.slug)}
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
  visibleSections: Set<CatalogSection>;
  canManageCategories: boolean;
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
  visibleSections,
  canManageCategories,
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
  const categoryOnly = visibleSections.size === 0;

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
          {categoryOnly ? (
            <div className="mt-1.5">
              <StructuredContentFullPreview
                content={category.content}
                fallback={category.description}
                iconColor="var(--color-accent-700)"
                iconSizeClass="size-3"
                iconSize={11}
                bulletItemClassName="text-[12.5px] text-[var(--color-ink-700)]"
              />
            </div>
          ) : (
            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[var(--color-ink-600)]">
              {category.description}
            </p>
          )}
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
            slug: {category.slug}
          </p>
        </div>
        {canManageCategories && (
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
        )}
      </header>

      {visibleSections.has("brands") && (
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
      )}

      {visibleSections.has("grades") && (
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
                      {grade.label || "Untitled grade"}
                    </span>
                    <span className="truncate text-[11.5px] text-[var(--color-ink-500)]">
                      {(grade.notes ?? "").slice(0, 60) || "No notes yet"}
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
      )}

      {visibleSections.has("attributes") && (
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
      )}
    </article>
  );
}

function CategoryIconBlock({ category }: { category: AdminCategory }) {
  return (
    <span
      className="grid size-12 shrink-0 place-items-center rounded-md bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)]"
      aria-hidden
    >
      <LucideIconRenderer name={category.icon} size={24} strokeWidth={2.2} />
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
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
