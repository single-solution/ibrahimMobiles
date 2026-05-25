"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  classNames,
  compareAlphabetically,
  formatAttributeOptionLabel,
} from "@store/shared";

import { AdminTable, type AdminTableColumn } from "@/components/AdminTable";
import {
  CatalogSearchField,
  CatalogTabChip,
} from "@/components/catalog/catalogWorkspaceUi";
import { ColoredPill } from "@/components/ColoredPill";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LucideIconRenderer } from "@/components/icons/LucideIconRenderer";
import { AdminTableSkeleton } from "@/components/loading/AdminTableSkeleton";
import { StatusPill } from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import {
  drawerItemFromState,
  drawerUrlSignature,
  formatCatalogDeleteParam,
  parseCatalogDeleteParam,
  resolveCatalogDrawer,
  type CatalogDrawerState,
} from "@/lib/url/catalogDrawerUrl";
import {
  syncAfterPendingUrl,
  useAdminUrlParams,
} from "@/lib/url/useAdminUrlParams";
import type {
  AdminAttribute,
  AdminBrand,
  AdminCategory,
  AdminGrade,
} from "@/types/admin";

import { AttributeEditor } from "./AttributeEditor";
import { BrandEditor } from "./BrandEditor";
import { Categories } from "./Categories";
import { CategoryEditor } from "./CategoryEditor";
import { GradeEditor } from "./GradeEditor";

export interface CategoriesCatalogProps {
  initialCategories: AdminCategory[];
  initialBrands: AdminBrand[];
  initialGrades: AdminGrade[];
  initialAttributes: AdminAttribute[];
}

type CatalogTab = "brands" | "grades" | "attributes";
type WorkspaceView = "tables" | "cards";

const TABS: CatalogTab[] = ["brands", "grades", "attributes"];

type DrawerKind = CatalogDrawerState;

interface DeleteIntent {
  kind: "category" | "brand" | "grade" | "attribute";
  id: string;
  label: string;
  unlinkFromCategorySlug?: string;
}

interface CategoryNavItem {
  category: AdminCategory;
  brandCount: number;
  gradeCount: number;
  attributeCount: number;
}

function matchesQuery(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

function isCatalogTab(value: string | null): value is CatalogTab {
  return value !== null && TABS.includes(value as CatalogTab);
}

export function CategoriesCatalog(props: CategoriesCatalogProps) {
  return (
    <Suspense fallback={<AdminTableSkeleton columnCount={4} rowCount={8} />}>
      <CategoriesCatalogInner {...props} />
    </Suspense>
  );
}

function CategoriesCatalogInner({
  initialCategories,
  initialBrands,
  initialGrades,
  initialAttributes,
}: CategoriesCatalogProps) {
  const router = useRouter();
  const { searchParams, replace } = useAdminUrlParams();
  const toast = useToast();

  const [categories, setCategories] = useState(initialCategories);
  const [brands, setBrands] = useState(initialBrands);
  const [grades, setGrades] = useState(initialGrades);
  const [attributes, setAttributes] = useState(initialAttributes);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<CatalogTab>("brands");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [rowQuery, setRowQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [viewMode, setViewMode] = useState<WorkspaceView>("tables");
  const prevViewModeRef = useRef<WorkspaceView>("tables");
  // URL sync uses pendingWizardRef + scheduleStateUpdate to avoid replace loops.
  const pendingCategorySlugRef = useRef<string | null>(null);
  const pendingDrawerRef = useRef<string | null>(null);
  const pendingRowQueryRef = useRef<string | null>(null);
  const pendingCategoryQueryRef = useRef<string | null>(null);
  const pendingDeleteRef = useRef<string | null>(null);

  const refreshAll = useCallback(async () => {
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
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : "Failed to refresh catalog.",
      );
    }
  }, [toast]);

  useEffect(() => {
    scheduleStateUpdate(() => {
      setCategories(initialCategories);
    });
  }, [initialCategories]);
  useEffect(() => {
    scheduleStateUpdate(() => {
      setBrands(initialBrands);
    });
  }, [initialBrands]);
  useEffect(() => {
    scheduleStateUpdate(() => {
      setGrades(initialGrades);
    });
  }, [initialGrades]);
  useEffect(() => {
    scheduleStateUpdate(() => {
      setAttributes(initialAttributes);
    });
  }, [initialAttributes]);

  const setCategoryUrl = useCallback(
    (categorySlug: string) => {
      replace({
        category: categorySlug,
        tab: searchParams.get("tab") ?? "brands",
      });
    },
    [replace, searchParams],
  );

  const setTabUrl = useCallback(
    (tab: CatalogTab) => {
      replace({
        tab,
        ...(selectedCategorySlug ? { category: selectedCategorySlug } : {}),
        q: null,
      });
      setRowQuery("");
    },
    [replace, selectedCategorySlug],
  );

  const setViewUrl = useCallback(
    (mode: WorkspaceView) => {
      replace({ view: mode === "cards" ? "cards" : null });
    },
    [replace],
  );

  const openDrawerUrl = useCallback(
    (next: DrawerKind) => {
      const signature = next
        ? drawerUrlSignature(next.kind, drawerItemFromState(next))
        : null;
      pendingDrawerRef.current = signature;
      setDrawer(next);
      if (!next) {
        replace({ drawer: null, item: null });
        return;
      }
      replace({
        drawer: next.kind,
        item: drawerItemFromState(next),
      });
    },
    [replace],
  );

  const closeDrawerUrl = useCallback(() => {
    openDrawerUrl(null);
  }, [openDrawerUrl]);

  const setRowQueryUrl = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      pendingRowQueryRef.current = trimmed || null;
      setRowQuery(query);
      replace({ q: trimmed || null });
    },
    [replace],
  );

  const setCategoryQueryUrl = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      pendingCategoryQueryRef.current = trimmed || null;
      setCategoryQuery(query);
      replace({ cq: trimmed || null });
    },
    [replace],
  );

  const openDeleteUrl = useCallback(
    (intent: DeleteIntent) => {
      const param = formatCatalogDeleteParam(intent.kind, intent.id);
      pendingDeleteRef.current = param;
      setDeleteIntent(intent);
      replace({ delete: param });
    },
    [replace],
  );

  const closeDeleteUrl = useCallback(() => {
    pendingDeleteRef.current = null;
    setDeleteIntent(null);
    replace({ delete: null });
  }, [replace]);

  const openCardView = useCallback(() => {
    setViewMode("cards");
    setViewUrl("cards");
  }, [setViewUrl]);

  const openTableView = useCallback(() => {
    setViewMode("tables");
    setViewUrl("tables");
  }, [setViewUrl]);

  useEffect(() => {
    scheduleStateUpdate(() => {
      const viewParam = searchParams.get("view");
      setViewMode(viewParam === "cards" ? "cards" : "tables");
    });
  }, [searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get("q") ?? "";
    if (!syncAfterPendingUrl(pendingRowQueryRef, fromUrl || null)) return;
    setRowQuery(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get("cq") ?? "";
    if (!syncAfterPendingUrl(pendingCategoryQueryRef, fromUrl || null)) return;
    setCategoryQuery(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (prevViewModeRef.current === "cards" && viewMode === "tables") {
      void refreshAll();
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, refreshAll]);

  const categoryNav = useMemo((): CategoryNavItem[] => {
    return categories.map((category) => ({
      category,
      brandCount: brands.filter((row) =>
        row.categorySlugs.includes(category.slug),
      ).length,
      gradeCount: grades.filter((row) => row.categorySlug === category.slug).length,
      attributeCount: attributes.filter((row) => row.categorySlug === category.slug)
        .length,
    }));
  }, [categories, brands, grades, attributes]);

  const filteredCategoryNav = useMemo(() => {
    if (!categoryQuery.trim()) return categoryNav;
    return categoryNav.filter(({ category }) =>
      matchesQuery([category.label, category.slug].join(" "), categoryQuery),
    );
  }, [categoryNav, categoryQuery]);

  const selectCategory = useCallback(
    (slug: string) => {
      pendingCategorySlugRef.current = slug;
      setSelectedCategorySlug(slug);
      setRowQuery("");
      setCategoryUrl(slug);
    },
    [setCategoryUrl],
  );

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    const tabParam = searchParams.get("tab");
    const pending = pendingCategorySlugRef.current;

    scheduleStateUpdate(() => {
      if (isCatalogTab(tabParam)) {
        setActiveTab(tabParam);
      }

      if (pending) {
        if (fromUrl === pending) {
          pendingCategorySlugRef.current = null;
        } else {
          return;
        }
      }

      if (fromUrl && categoryNav.some((row) => row.category.slug === fromUrl)) {
        setSelectedCategorySlug(fromUrl);
        return;
      }
      if (categoryNav.length === 0) {
        setSelectedCategorySlug(null);
        return;
      }
      const preferred = categoryNav[0];
      setSelectedCategorySlug(preferred.category.slug);
      setCategoryUrl(preferred.category.slug);
    });
  }, [categoryNav, searchParams, setCategoryUrl]);

  useEffect(() => {
    if (!categoryQuery.trim() || filteredCategoryNav.length === 0) return;
    const stillVisible = filteredCategoryNav.some(
      (row) => row.category.slug === selectedCategorySlug,
    );
    if (!stillVisible) {
      scheduleStateUpdate(() => {
        selectCategory(filteredCategoryNav[0].category.slug);
      });
    }
  }, [categoryQuery, filteredCategoryNav, selectedCategorySlug, selectCategory]);

  const selectedNav = categoryNav.find(
    (row) => row.category.slug === selectedCategorySlug,
  );
  const selectedCategory = selectedNav?.category ?? null;

  useEffect(() => {
    const drawerParam = searchParams.get("drawer");
    const itemParam = searchParams.get("item");
    const signature = drawerUrlSignature(drawerParam, itemParam);
    if (!syncAfterPendingUrl(pendingDrawerRef, signature)) return;
    setDrawer(
      resolveCatalogDrawer({
        drawer: drawerParam,
        item: itemParam,
        category: selectedCategory,
        categories,
        brands,
        grades,
        attributes,
      }),
    );
  }, [
    searchParams,
    selectedCategory,
    categories,
    brands,
    grades,
    attributes,
  ]);

  useEffect(() => {
    const deleteParam = searchParams.get("delete");
    if (!syncAfterPendingUrl(pendingDeleteRef, deleteParam)) return;
    const parsed = parseCatalogDeleteParam(deleteParam);
    scheduleStateUpdate(() => {
      if (!parsed) {
        setDeleteIntent(null);
        return;
      }
      if (parsed.kind === "category") {
        const category = categories.find((row) => row.id === parsed.id);
        if (!category) {
          setDeleteIntent(null);
          return;
        }
        setDeleteIntent({
          kind: "category",
          id: category.id,
          label: category.label,
        });
        return;
      }
      if (parsed.kind === "brand") {
        const brand = brands.find((row) => row.id === parsed.id);
        if (!brand || !selectedCategory) {
          setDeleteIntent(null);
          return;
        }
        setDeleteIntent({
          kind: "brand",
          id: brand.id,
          label: brand.name,
          unlinkFromCategorySlug: selectedCategory.slug,
        });
        return;
      }
      if (parsed.kind === "grade") {
        const grade = grades.find((row) => row.id === parsed.id);
        if (!grade) {
          setDeleteIntent(null);
          return;
        }
        setDeleteIntent({ kind: "grade", id: grade.id, label: grade.label });
        return;
      }
      const attribute = attributes.find((row) => row.id === parsed.id);
      if (!attribute) {
        setDeleteIntent(null);
        return;
      }
      setDeleteIntent({
        kind: "attribute",
        id: attribute.id,
        label: attribute.label,
      });
    });
  }, [
    searchParams,
    categories,
    brands,
    grades,
    attributes,
    selectedCategory,
  ]);

  const brandsForCategory = useMemo(() => {
    if (!selectedCategorySlug) return [];
    return brands
      .filter((row) => row.categorySlugs.includes(selectedCategorySlug))
      .sort((left, right) => compareAlphabetically(left.name, right.name));
  }, [brands, selectedCategorySlug]);

  const gradesForCategory = useMemo(() => {
    if (!selectedCategorySlug) return [];
    return grades
      .filter((row) => row.categorySlug === selectedCategorySlug)
      .sort((left, right) => compareAlphabetically(left.label, right.label));
  }, [grades, selectedCategorySlug]);

  const attributesForCategory = useMemo(() => {
    if (!selectedCategorySlug) return [];
    return attributes
      .filter((row) => row.categorySlug === selectedCategorySlug)
      .sort((left, right) => compareAlphabetically(left.label, right.label));
  }, [attributes, selectedCategorySlug]);

  const filteredBrands = useMemo(() => {
    if (!rowQuery.trim()) return brandsForCategory;
    return brandsForCategory.filter((row) =>
      matchesQuery([row.name, row.slug].join(" "), rowQuery),
    );
  }, [brandsForCategory, rowQuery]);

  const filteredGrades = useMemo(() => {
    if (!rowQuery.trim()) return gradesForCategory;
    return gradesForCategory.filter((row) =>
      matchesQuery([row.label, row.slug, row.notes].join(" "), rowQuery),
    );
  }, [gradesForCategory, rowQuery]);

  const filteredAttributes = useMemo(() => {
    if (!rowQuery.trim()) return attributesForCategory;
    return attributesForCategory.filter((row) =>
      matchesQuery(
        [row.label, row.slug, row.unit ?? "", row.cardPosition].join(" "),
        rowQuery,
      ),
    );
  }, [attributesForCategory, rowQuery]);

  async function handleConfirmDelete() {
    if (!deleteIntent) return;
    const { kind, id, label, unlinkFromCategorySlug } = deleteIntent;
    closeDeleteUrl();
    try {
      if (kind === "brand" && unlinkFromCategorySlug) {
        const brand = brands.find((row) => row.id === id);
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
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : `Failed to delete ${deleteIntent.kind}.`,
      );
    }
  }

  async function moveCategory(category: AdminCategory, direction: -1 | 1) {
    const currentIndex = categories.findIndex((row) => row.id === category.id);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(currentIndex, 1);
    if (!moved) return;
    reordered.splice(nextIndex, 0, moved);
    try {
      await Promise.all(
        reordered.map((row, index) =>
          adminFetch<AdminCategory>(`/api/categories/${row.id}`, {
            method: "PUT",
            json: { sortOrder: index },
          }),
        ),
      );
      await refreshAll();
    } catch (error) {
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : "Failed to reorder category.",
      );
    }
  }

  function openCreateForTab() {
    if (!selectedCategory) return;
    if (activeTab === "brands") {
      openDrawerUrl({ kind: "brand", category: selectedCategory, brand: null });
      return;
    }
    if (activeTab === "grades") {
      openDrawerUrl({ kind: "grade", category: selectedCategory, grade: null });
      return;
    }
    openDrawerUrl({ kind: "attribute", category: selectedCategory, attribute: null });
  }

  const newButtonLabel =
    activeTab === "brands"
      ? "New brand"
      : activeTab === "grades"
        ? "New grade"
        : "New attribute";

  const rowSearchPlaceholder =
    activeTab === "brands"
      ? "Search brands…"
      : activeTab === "grades"
        ? "Search grades…"
        : "Search attributes…";

  const brandColumns: AdminTableColumn<AdminBrand>[] = [
    {
      id: "name",
      header: "Brand",
      sortable: true,
      sortAccessor: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-ink-900)]">
            {row.name}
          </p>
          <p className="truncate text-[10px] text-[var(--color-ink-500)]">{row.slug}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      hideOnMobile: true,
      cell: (row) => (
        <StatusPill tone={row.isActive ? "success" : "warn"}>
          {row.isActive ? "Active" : "Hidden"}
        </StatusPill>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        selectedCategory ? (
          <RowActions
            onEdit={() =>
              openDrawerUrl({ kind: "brand", category: selectedCategory, brand: row })
            }
            onDelete={() =>
              openDeleteUrl({
                kind: "brand",
                id: row.id,
                label: row.name,
                unlinkFromCategorySlug: selectedCategory.slug,
              })
            }
          />
        ) : null,
    },
  ];

  const gradeColumns: AdminTableColumn<AdminGrade>[] = [
    {
      id: "grade",
      header: "Grade",
      sortable: true,
      sortAccessor: (row) => row.label,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <ColoredPill
            backgroundColor={row.color}
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          >
            {row.label}
          </ColoredPill>
          <span className="truncate text-[10px] text-[var(--color-ink-500)]">
            {row.slug}
          </span>
        </div>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      hideOnMobile: true,
      cell: (row) => (
        <span className="line-clamp-2 text-[11px] text-[var(--color-ink-600)]">
          {row.notes || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        selectedCategory ? (
          <RowActions
            onEdit={() =>
              openDrawerUrl({ kind: "grade", category: selectedCategory, grade: row })
            }
            onDelete={() =>
              openDeleteUrl({
                kind: "grade",
                id: row.id,
                label: row.label,
              })
            }
          />
        ) : null,
    },
  ];

  const attributeColumns: AdminTableColumn<AdminAttribute>[] = [
    {
      id: "attribute",
      header: "Attribute",
      sortable: true,
      sortAccessor: (row) => row.label,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-ink-900)]">
            {row.label}
          </p>
          <p className="truncate text-[10px] text-[var(--color-ink-500)]">{row.slug}</p>
        </div>
      ),
    },
    {
      id: "unit",
      header: "Unit",
      hideOnMobile: true,
      cell: (row) =>
        row.unit ? (
          <span className="inline-flex max-w-full items-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-700)]">
            <span className="truncate">{row.unit}</span>
          </span>
        ) : (
          <span className="text-[11px] text-[var(--color-ink-400)]">—</span>
        ),
    },
    {
      id: "options",
      header: "Options",
      hideOnMobile: true,
      cell: (row) => <AttributeOptionsCell attribute={row} />,
    },
    {
      id: "display",
      header: "Display",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-[11px] capitalize text-[var(--color-ink-600)]">
          {row.cardPosition.replace("-", " ")}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      hideOnMobile: true,
      cell: (row) => (
        <StatusPill tone={row.isActive ? "success" : "warn"}>
          {row.isActive ? "Active" : "Hidden"}
        </StatusPill>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        selectedCategory ? (
          <RowActions
            onEdit={() =>
              openDrawerUrl({
                kind: "attribute",
                category: selectedCategory,
                attribute: row,
              })
            }
            onDelete={() =>
              openDeleteUrl({
                kind: "attribute",
                id: row.id,
                label: row.label,
              })
            }
          />
        ) : null,
    },
  ];

  const categoryIndex = selectedCategory
    ? categories.findIndex((row) => row.id === selectedCategory.id)
    : -1;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <CategorySidebar
            items={filteredCategoryNav}
            selectedSlug={selectedCategorySlug}
            onSelect={selectCategory}
            categoryQuery={categoryQuery}
            onCategoryQueryChange={setCategoryQueryUrl}
            isFiltered={categoryQuery.trim().length > 0}
            viewMode={viewMode}
            onOpenCardView={openCardView}
            onOpenTableView={openTableView}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {viewMode === "cards" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <Categories
                  embedded
                  initialCategories={categories}
                  initialBrands={brands}
                  initialGrades={grades}
                  initialAttributes={attributes}
                  visibleSections={[]}
                />
              </div>
            ) : (
              <>
            <header className="shrink-0 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedNav ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:mr-auto">
                    <LucideIconRenderer
                      name={selectedNav.category.icon}
                      size={14}
                      strokeWidth={2.2}
                      className="shrink-0 text-[var(--color-accent-700)]"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-xs font-semibold text-[var(--color-ink-900)]">
                        {selectedNav.category.label}
                      </h2>
                      <p className="text-[10px] text-[var(--color-ink-500)]">
                        {activeTab === "brands"
                          ? filteredBrands.length
                          : activeTab === "grades"
                            ? filteredGrades.length
                            : filteredAttributes.length}{" "}
                        shown · slug {selectedNav.category.slug}
                      </p>
                    </div>
                    <div className="ml-1 flex shrink-0 items-center gap-0.5">
                      <IconButton
                        label="Move category up"
                        disabled={categoryIndex <= 0}
                        onClick={() => moveCategory(selectedNav.category, -1)}
                        icon={<ChevronUp size={13} />}
                      />
                      <IconButton
                        label="Move category down"
                        disabled={
                          categoryIndex < 0 || categoryIndex >= categories.length - 1
                        }
                        onClick={() => moveCategory(selectedNav.category, 1)}
                        icon={<ChevronDown size={13} />}
                      />
                      <IconButton
                        label="Edit category"
                        onClick={() =>
                          openDrawerUrl({
                            kind: "category",
                            category: selectedNav.category,
                          })
                        }
                        icon={<Pencil size={13} />}
                      />
                      <IconButton
                        label="Delete category"
                        tone="danger"
                        onClick={() =>
                          openDeleteUrl({
                            kind: "category",
                            id: selectedNav.category.id,
                            label: selectedNav.category.label,
                          })
                        }
                        icon={<Trash2 size={13} />}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-ink-500)] sm:mr-auto">
                    Select a category
                  </p>
                )}

                <div className="flex w-full min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:flex-nowrap">
                  <CatalogSearchField
                    value={rowQuery}
                    onChange={setRowQueryUrl}
                    placeholder={rowSearchPlaceholder}
                    aria-label={rowSearchPlaceholder}
                    className="min-w-0 flex-1 sm:max-w-[14rem] sm:flex-none"
                  />
                  <button
                    type="button"
                    disabled={!selectedCategory}
                    onClick={openCreateForTab}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-600)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-accent-700)] disabled:opacity-50"
                  >
                    <Plus size={13} aria-hidden />
                    {newButtonLabel}
                  </button>
                </div>
              </div>

              <div
                className="mt-2 flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Catalog sections"
              >
                <CatalogTabChip
                  label="Brands"
                  count={selectedNav?.brandCount ?? 0}
                  isActive={activeTab === "brands"}
                  onClick={() => {
                    setActiveTab("brands");
                    setRowQuery("");
                    setTabUrl("brands");
                  }}
                />
                <CatalogTabChip
                  label="Grades"
                  count={selectedNav?.gradeCount ?? 0}
                  isActive={activeTab === "grades"}
                  onClick={() => {
                    setActiveTab("grades");
                    setRowQuery("");
                    setTabUrl("grades");
                  }}
                />
                <CatalogTabChip
                  label="Attributes"
                  count={selectedNav?.attributeCount ?? 0}
                  isActive={activeTab === "attributes"}
                  onClick={() => {
                    setActiveTab("attributes");
                    setRowQuery("");
                    setTabUrl("attributes");
                  }}
                />
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-2 [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&_table]:text-xs [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-[10px]">
              {categories.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-[var(--color-ink-500)]">
                  No categories yet. Open Manage categories to add one.
                </div>
              ) : (
                <>
                  {activeTab === "brands" ? (
                    <AdminTable
                      rows={filteredBrands}
                      columns={brandColumns}
                      rowKey={(row) => row.id}
                      emptyState={
                        !selectedCategory
                          ? "Select a category from the sidebar."
                          : rowQuery.trim()
                            ? "No items match your search."
                            : "No brands in this category yet."
                      }
                    />
                  ) : null}
                  {activeTab === "grades" ? (
                    <AdminTable
                      rows={filteredGrades}
                      columns={gradeColumns}
                      rowKey={(row) => row.id}
                      emptyState={
                        !selectedCategory
                          ? "Select a category from the sidebar."
                          : rowQuery.trim()
                            ? "No items match your search."
                            : "No grades in this category yet."
                      }
                    />
                  ) : null}
                  {activeTab === "attributes" ? (
                    <AdminTable
                      rows={filteredAttributes}
                      columns={attributeColumns}
                      rowKey={(row) => row.id}
                      emptyState={
                        !selectedCategory
                          ? "Select a category from the sidebar."
                          : rowQuery.trim()
                            ? "No items match your search."
                            : "No attributes in this category yet."
                      }
                    />
                  ) : null}
                </>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CategoryEditor
        isOpen={drawer?.kind === "category"}
        onClose={closeDrawerUrl}
        category={drawer?.kind === "category" ? drawer.category : null}
        onSaved={refreshAll}
      />
      {drawer?.kind === "brand" && (
        <BrandEditor
          isOpen
          onClose={closeDrawerUrl}
          category={drawer.category}
          brand={drawer.brand}
          siblings={brands.filter((row) =>
            row.categorySlugs.includes(drawer.category.slug),
          )}
          onSaved={refreshAll}
        />
      )}
      {drawer?.kind === "grade" && (
        <GradeEditor
          isOpen
          onClose={closeDrawerUrl}
          category={drawer.category}
          grade={drawer.grade}
          onSaved={refreshAll}
        />
      )}
      {drawer?.kind === "attribute" && (
        <AttributeEditor
          isOpen
          onClose={closeDrawerUrl}
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
        onCancel={closeDeleteUrl}
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

function AttributeOptionsCell({ attribute }: { attribute: AdminAttribute }) {
  const maxVisible = 4;
  const { options, unit } = attribute;

  if (options.length === 0) {
    return (
      <span className="text-[11px] italic text-[var(--color-ink-400)]">No options</span>
    );
  }

  const visible = options.slice(0, maxVisible);
  const overflow = options.length - visible.length;

  return (
    <div className="flex max-w-[16rem] flex-wrap items-center gap-1">
      {visible.map((opt) => {
        const label = formatAttributeOptionLabel(opt.label, unit);
        return opt.backgroundColor ? (
          <ColoredPill
            key={opt.value}
            backgroundColor={opt.backgroundColor}
            className="max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          >
            {label}
          </ColoredPill>
        ) : (
          <span
            key={opt.value}
            className="inline-flex max-w-full truncate items-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-800)]"
          >
            {label}
          </span>
        );
      })}
      {overflow > 0 ? (
        <span className="text-[10px] font-medium text-[var(--color-ink-500)]">
          +{overflow} more
        </span>
      ) : null}
    </div>
  );
}

function CategorySidebar({
  items,
  selectedSlug,
  onSelect,
  categoryQuery,
  onCategoryQueryChange,
  isFiltered,
  viewMode,
  onOpenCardView,
  onOpenTableView,
}: {
  items: CategoryNavItem[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  categoryQuery: string;
  onCategoryQueryChange: (value: string) => void;
  isFiltered: boolean;
  viewMode: WorkspaceView;
  onOpenCardView: () => void;
  onOpenTableView: () => void;
}) {
  return (
    <>
      <aside className="hidden w-44 shrink-0 flex-col border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-2.5 lg:flex lg:border-b-0 lg:border-r xl:w-48">
        <p className="pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Categories
          {isFiltered && items.length > 0 ? (
            <span className="ml-1 font-medium normal-case tracking-normal text-[var(--color-ink-400)]">
              ({items.length})
            </span>
          ) : null}
        </p>
        <CatalogSearchField
          value={categoryQuery}
          onChange={onCategoryQueryChange}
          placeholder="Search…"
          aria-label="Search categories"
          className="mb-2 w-full shrink-0"
        />
        <nav
          aria-label="Categories"
          className="-mx-1 min-h-0 flex-1 overflow-y-auto"
        >
          {items.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-[var(--color-ink-500)]">
              No categories match your search.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {items.map(
                ({ category, brandCount, gradeCount, attributeCount }) => {
                  const isSelected = category.slug === selectedSlug;
                  const total = brandCount + gradeCount + attributeCount;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(category.slug)}
                        className={classNames(
                          "flex w-full items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1.5 text-left text-xs transition-colors",
                          isSelected
                            ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-900)]"
                            : "text-[var(--color-ink-700)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink-900)]",
                        )}
                      >
                        <LucideIconRenderer
                          name={category.icon}
                          size={13}
                          strokeWidth={2.2}
                          className="shrink-0"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{category.label}</span>
                        <span
                          className={classNames(
                            "shrink-0 rounded-full px-1 py-0.5 text-[9px] font-semibold tabular-nums",
                            isSelected
                              ? "bg-[var(--color-accent-200)] text-[var(--color-accent-900)]"
                              : "bg-[var(--color-ink-100)] text-[var(--color-ink-600)]",
                          )}
                        >
                          {total}
                        </span>
                      </button>
                    </li>
                  );
                },
              )}
            </ul>
          )}
        </nav>
        <div className="mt-2">
          {viewMode === "tables" ? (
            <button
              type="button"
              onClick={onOpenCardView}
              className="inline-flex h-8 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[11px] font-semibold text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-accent-400)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-800)]"
            >
              Manage categories
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenTableView}
              className="inline-flex h-8 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] text-[11px] font-semibold text-[var(--color-accent-800)] transition-colors hover:bg-[var(--color-accent-100)]"
            >
              Back to catalog
            </button>
          )}
        </div>
      </aside>

      <div className="shrink-0 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 py-2 lg:hidden">
        <div className="mb-2">
          {viewMode === "tables" ? (
            <button
              type="button"
              onClick={onOpenCardView}
              className="inline-flex h-8 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[11px] font-semibold text-[var(--color-ink-700)]"
            >
              Manage categories
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenTableView}
              className="inline-flex h-8 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] text-[11px] font-semibold text-[var(--color-accent-800)]"
            >
              Back to catalog
            </button>
          )}
        </div>
        <CatalogSearchField
          value={categoryQuery}
          onChange={onCategoryQueryChange}
          placeholder="Search categories…"
          aria-label="Search categories"
          className="mb-2 w-full"
        />
        <nav
          aria-label="Categories"
          className="-mx-1 flex gap-1 overflow-x-auto"
        >
          {items.length === 0 ? (
            <p className="px-1 text-[11px] text-[var(--color-ink-500)]">No categories.</p>
          ) : (
            items.map(({ category, brandCount, gradeCount, attributeCount }) => {
              const isSelected = category.slug === selectedSlug;
              const total = brandCount + gradeCount + attributeCount;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelect(category.slug)}
                  className={classNames(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    isSelected
                      ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-900)]"
                      : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)]",
                  )}
                >
                  <LucideIconRenderer
                    name={category.icon}
                    size={12}
                    strokeWidth={2.2}
                    aria-hidden
                  />
                  {category.label}
                  <span className="tabular-nums text-[9px] opacity-80">{total}</span>
                </button>
              );
            })
          )}
        </nav>
      </div>
    </>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] px-2 py-1 text-[11px] font-semibold text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)]"
      >
        <Pencil size={13} aria-hidden />
        <span className="hidden md:inline">Edit</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-rose-200)] px-2 py-1 text-[11px] font-semibold text-[var(--color-rose-700)] transition-colors hover:bg-[var(--color-rose-50)]"
      >
        <Trash2 size={13} aria-hidden />
        <span className="hidden md:inline">Delete</span>
      </button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
  disabled = false,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "grid size-7 place-items-center rounded-[var(--radius-md)] transition-colors disabled:opacity-40",
        tone === "danger"
          ? "text-[var(--color-rose-600)] hover:bg-[var(--color-rose-50)]"
          : "text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
      )}
    >
      {icon}
    </button>
  );
}
