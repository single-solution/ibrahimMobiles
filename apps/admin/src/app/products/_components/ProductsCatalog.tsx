"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Boxes, Pencil, Trash2 } from "lucide-react";
import {
  classNames,
  compareAlphabetically,
  emptyStructuredContent,
  formatPrice,
} from "@store/shared";

import { CatalogSearchField } from "@/components/shared/catalogWorkspaceUi";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import {
  WorkspaceCatalogPaneHeader,
  WorkspaceFilterChip,
  WorkspaceFrame,
  WorkspaceReadOnlyBanner,
} from "@/components/shared/adminWorkspaceUi";
import { useAdminPermissions } from "@/lib/adminPermissionsContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LucideIconRenderer } from "@/components/icons/LucideIconRenderer";
import { CatalogWorkspaceSkeleton } from "@/components/loading/CatalogWorkspaceSkeleton";
import { StatusPill } from "@/components/shared/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { getInitials } from "@/lib/initials";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import {
  countByProductListFilter,
  formatVariantStockSummary,
  matchesProductListFilter,
  type ProductListFilter,
  variantStockStatusPills,
} from "@/lib/products/productVariantStock";
import {
  syncAfterPendingUrl,
  useAdminUrlParams,
} from "@/lib/url/useAdminUrlParams";
import type { AdminCategory, AdminProductSummary } from "@/types/admin";

import { ProductCreateWizard } from "./ProductCreateWizard";
import { ProductEditDrawer } from "./ProductEditDrawer";
import { ProductManageVariantsDrawer } from "./ProductManageVariantsDrawer";

interface ProductsCatalogProps {
  products: AdminProductSummary[];
  catalog: ProductWizardCatalog;
}

type Panel = "edit" | "variants";

interface CategoryNavItem {
  category: AdminCategory;
  totalCount: number;
}

const UNCATEGORIZED_SLUG = "uncategorized";

const PRODUCT_LIST_FILTERS: ProductListFilter[] = [
  "all",
  "no_variants",
  "partial_stock",
  "all_out_of_stock",
  "fully_stocked",
  "featured",
  "hidden",
];

function isProductListFilter(value: string | null): value is ProductListFilter {
  return (
    value !== null &&
    (PRODUCT_LIST_FILTERS as readonly string[]).includes(value)
  );
}

function matchesQuery(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

function productSearchHaystack(product: AdminProductSummary): string {
  return [product.name, product.brand.name, product.brand.slug, product.slug]
    .filter(Boolean)
    .join(" ");
}

function categorySearchHaystack(category: AdminCategory): string {
  return [category.label, category.slug].filter(Boolean).join(" ");
}

export function ProductsCatalog(props: ProductsCatalogProps) {
  return (
    <Suspense fallback={<CatalogWorkspaceSkeleton />}>
      <ProductsCatalogInner {...props} />
    </Suspense>
  );
}

function ProductsCatalogInner({ products, catalog }: ProductsCatalogProps) {
  const router = useRouter();
  const { searchParams, replace } = useAdminUrlParams();
  const toast = useToast();
  const { can } = useAdminPermissions();
  const canCreate = can("product_create");
  const canUpdate = can("product_update");
  const canDelete = can("product_delete");

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    null,
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [variantsId, setVariantsId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductSummary | null>(
    null,
  );
  const [categoryQuery, setCategoryQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [listFilter, setListFilter] = useState<ProductListFilter>("all");
  // URL sync uses pending refs + scheduleStateUpdate to avoid replace loops.
  const pendingCategorySlugRef = useRef<string | null>(null);
  const pendingProductQueryRef = useRef<string | null>(null);
  const pendingCategoryQueryRef = useRef<string | null>(null);
  const pendingListFilterRef = useRef<string | null>(null);
  const pendingDeleteIdRef = useRef<string | null>(null);

  const setPanelUrl = useCallback(
    (productId: string | null, panel: Panel | null) => {
      if (productId && panel) {
        replace({
          product: productId,
          panel,
          ...(panel !== "variants" ? { vgrade: null, vuid: null } : {}),
        });
      } else {
        replace({
          product: null,
          panel: null,
          vgrade: null,
          vuid: null,
        });
      }
    },
    [replace],
  );

  const setCategoryUrl = useCallback(
    (categorySlug: string) => {
      replace({ category: categorySlug });
    },
    [replace],
  );

  const openEdit = useCallback(
    (id: string) => {
      setEditId(id);
      setVariantsId(null);
      setPanelUrl(id, "edit");
    },
    [setPanelUrl],
  );

  const openVariants = useCallback(
    (id: string) => {
      setVariantsId(id);
      setEditId(null);
      setPanelUrl(id, "variants");
    },
    [setPanelUrl],
  );

  const closePanels = useCallback(() => {
    setEditId(null);
    setVariantsId(null);
    setPanelUrl(null, null);
  }, [setPanelUrl]);

  useEffect(() => {
    const productId = searchParams.get("product");
    const panel = searchParams.get("panel");
    scheduleStateUpdate(() => {
      if (!productId) {
        setEditId(null);
        setVariantsId(null);
        return;
      }
      if (!canUpdate && (panel === "edit" || panel === "variants")) {
        setEditId(null);
        setVariantsId(null);
        replace({ product: productId, panel: null, vgrade: null, vuid: null });
        return;
      }
      if (panel === "edit") {
        setEditId(productId);
        setVariantsId(null);
        return;
      }
      if (panel === "variants") {
        setVariantsId(productId);
        setEditId(null);
      }
    });
  }, [canUpdate, replace, searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get("q") ?? "";
    if (!syncAfterPendingUrl(pendingProductQueryRef, fromUrl || null)) return;
    setProductQuery(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get("cq") ?? "";
    if (!syncAfterPendingUrl(pendingCategoryQueryRef, fromUrl || null)) return;
    setCategoryQuery(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (!syncAfterPendingUrl(pendingListFilterRef, filterParam)) return;
    setListFilter(isProductListFilter(filterParam) ? filterParam : "all");
  }, [searchParams]);

  useEffect(() => {
    const deleteId = searchParams.get("delete");
    if (!syncAfterPendingUrl(pendingDeleteIdRef, deleteId)) return;
    scheduleStateUpdate(() => {
      if (!deleteId) {
        setDeleteTarget(null);
        return;
      }
      const match = products.find((row) => row.id === deleteId);
      setDeleteTarget(match ?? null);
    });
  }, [searchParams, products]);

  const setProductQueryUrl = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      pendingProductQueryRef.current = trimmed || null;
      setProductQuery(query);
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

  const setListFilterUrl = useCallback(
    (filter: ProductListFilter) => {
      pendingListFilterRef.current = filter === "all" ? null : filter;
      setListFilter(filter);
      replace({ filter: filter === "all" ? null : filter });
    },
    [replace],
  );

  const openDeleteConfirm = useCallback(
    (product: AdminProductSummary) => {
      pendingDeleteIdRef.current = product.id;
      setDeleteTarget(product);
      replace({ delete: product.id });
    },
    [replace],
  );

  const closeDeleteConfirm = useCallback(() => {
    pendingDeleteIdRef.current = null;
    setDeleteTarget(null);
    replace({ delete: null });
  }, [replace]);

  const totalByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.categorySlug, (map.get(product.categorySlug) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const categoryNav = useMemo((): CategoryNavItem[] => {
    const knownSlugs = new Set(catalog.categories.map((row) => row.slug));
    const items: CategoryNavItem[] = catalog.categories.map((category) => ({
      category,
      totalCount: totalByCategory.get(category.slug) ?? 0,
    }));

    const orphanTotal = [...totalByCategory.entries()]
      .filter(([slug]) => !knownSlugs.has(slug))
      .reduce((sum, [, count]) => sum + count, 0);

    if (orphanTotal > 0) {
      items.push({
        category: {
          id: UNCATEGORIZED_SLUG,
          slug: UNCATEGORIZED_SLUG,
          label: "Uncategorized",
          description: "",
          icon: "package",
          isActive: true,
          sortOrder: 999,
          content: emptyStructuredContent(),
          createdAt: "",
          updatedAt: "",
        },
        totalCount: orphanTotal,
      });
    }

    return items;
  }, [catalog.categories, totalByCategory]);

  const selectCategory = useCallback(
    (slug: string) => {
      pendingCategorySlugRef.current = slug;
      setSelectedCategorySlug(slug);
      setCategoryUrl(slug);
    },
    [setCategoryUrl],
  );

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    const pending = pendingCategorySlugRef.current;

    scheduleStateUpdate(() => {
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
      const preferred =
        categoryNav.find((row) => row.totalCount > 0) ?? categoryNav[0];
      setSelectedCategorySlug(preferred.category.slug);
      setCategoryUrl(preferred.category.slug);
    });
  }, [categoryNav, searchParams, setCategoryUrl]);

  const selectedNav = categoryNav.find(
    (row) => row.category.slug === selectedCategorySlug,
  );

  const filteredCategoryNav = useMemo(() => {
    if (!categoryQuery.trim()) return categoryNav;
    return categoryNav.filter(({ category }) =>
      matchesQuery(categorySearchHaystack(category), categoryQuery),
    );
  }, [categoryNav, categoryQuery]);

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

  const categoryProducts = useMemo(() => {
    if (!selectedCategorySlug) return [];
    return products
      .filter((product) => product.categorySlug === selectedCategorySlug)
      .sort((left, right) => compareAlphabetically(left.name, right.name));
  }, [products, selectedCategorySlug]);

  const productsMatchingSearch = useMemo(() => {
    if (!productQuery.trim()) return categoryProducts;
    return categoryProducts.filter((product) =>
      matchesQuery(productSearchHaystack(product), productQuery),
    );
  }, [categoryProducts, productQuery]);

  const filterCounts = useMemo(
    () => ({
      all: productsMatchingSearch.length,
      no_variants: countByProductListFilter(productsMatchingSearch, "no_variants"),
      partial_stock: countByProductListFilter(productsMatchingSearch, "partial_stock"),
      all_out_of_stock: countByProductListFilter(
        productsMatchingSearch,
        "all_out_of_stock",
      ),
      fully_stocked: countByProductListFilter(productsMatchingSearch, "fully_stocked"),
      featured: countByProductListFilter(productsMatchingSearch, "featured"),
      hidden: countByProductListFilter(productsMatchingSearch, "hidden"),
    }),
    [productsMatchingSearch],
  );

  const tableRows = useMemo(
    () =>
      productsMatchingSearch.filter((product) =>
        matchesProductListFilter(product, listFilter),
      ),
    [productsMatchingSearch, listFilter],
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminFetch(`/api/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success(`Deleted "${deleteTarget.name}"`);
      closeDeleteConfirm();
      closePanels();
      router.refresh();
    } catch (error) {
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : "Failed to delete product.",
      );
    }
  }

  const tableColumns: AdminTableColumn<AdminProductSummary>[] = [
    {
      id: "product",
      header: "Product",
      sortable: true,
      sortAccessor: (product) => product.name,
        cell: (product) => (
          <div className="flex items-center gap-2 py-0.5">
            <ProductThumb product={product} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--color-ink-900)]">
                {product.name || "Untitled product"}
              </p>
              <p className="truncate text-[11px] text-[var(--color-ink-500)]">
                {product.brand.name || product.brand.slug} · {product.slug}
              </p>
            </div>
          </div>
        ),
    },
    {
      id: "variants",
      header: "Variants",
      hideOnMobile: true,
      sortable: true,
      sortAccessor: (product) => product.variantCount,
        cell: (product) => (
          <span className="text-xs font-semibold text-[var(--color-ink-900)]">
            {product.variantCount}{" "}
            <span className="font-normal text-[var(--color-ink-500)]">
              · {formatVariantStockSummary(product)}
            </span>
          </span>
        ),
    },
    {
      id: "price",
      header: "From",
      align: "right",
      sortable: true,
      sortAccessor: (product) => product.minPriceRupees ?? 0,
        cell: (product) => (
          <span className="text-xs font-semibold text-[var(--color-ink-900)]">
            {product.minPriceRupees !== undefined
              ? formatPrice(product.minPriceRupees)
              : "—"}
          </span>
        ),
    },
    {
      id: "status",
      header: "Status",
      hideOnMobile: true,
      cell: (product) => (
        <div className="flex flex-wrap gap-1">
          {variantStockStatusPills(product).map((pill) => (
            <StatusPill key={pill.label} tone={pill.tone}>
              {pill.label}
            </StatusPill>
          ))}
          {product.isFeatured && <StatusPill tone="dark">Featured</StatusPill>}
          {!product.isActive && <StatusPill tone="warn">Disabled</StatusPill>}
        </div>
      ),
    },
    {
      id: "storefront",
      header: "Storefront",
      hideOnMobile: true,
      cell: (product) => (
        <ProductStorefrontToggle
          productId={product.id}
          productName={product.name}
          isActive={product.isActive}
          onUpdated={() => router.refresh()}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (product) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          {canUpdate ? (
            <>
              <RowActionButton
                icon={<Pencil size={13} />}
                label="Edit"
                onClick={() => openEdit(product.id)}
              />
              <RowActionButton
                icon={<Boxes size={13} />}
                label="Manage variants"
                onClick={() => openVariants(product.id)}
              />
            </>
          ) : null}
          {canDelete ? (
            <RowActionButton
              icon={<Trash2 size={13} />}
              label="Delete"
              onClick={() => openDeleteConfirm(product)}
              tone="danger"
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <WorkspaceFrame minHeight={false}>
        {!canUpdate ? (
          <WorkspaceReadOnlyBanner message="Read-only — you can browse products but not edit listings or variants." />
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <CategorySidebar
            items={filteredCategoryNav}
            selectedSlug={selectedCategorySlug}
            onSelect={selectCategory}
            categoryQuery={categoryQuery}
            onCategoryQueryChange={setCategoryQueryUrl}
            isFiltered={categoryQuery.trim().length > 0}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <WorkspaceCatalogPaneHeader
              title={
                selectedNav ? (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <LucideIconRenderer
                      name={selectedNav.category.icon}
                      size={14}
                      strokeWidth={2.2}
                      className="shrink-0 text-[var(--color-accent-700)]"
                      aria-hidden
                    />
                    <h2 className="truncate text-xs font-semibold text-[var(--color-ink-900)]">
                      {selectedNav.category.label}
                    </h2>
                  </div>
                ) : (
                  <h2 className="text-xs font-semibold text-[var(--color-ink-900)]">Products</h2>
                )
              }
              subtitle={
                selectedNav
                  ? `${tableRows.length} shown · ${selectedNav.totalCount} total`
                  : "Select a category to manage products."
              }
              search={
                <CatalogSearchField
                  value={productQuery}
                  onChange={setProductQueryUrl}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="min-w-0 flex-1 sm:max-w-[14rem] sm:flex-none"
                />
              }
              action={
                canCreate ? (
                  <Suspense fallback={null}>
                    <ProductCreateWizard catalog={catalog} variant="toolbar" />
                  </Suspense>
                ) : undefined
              }
              filters={
                <>
                <WorkspaceFilterChip
                  label="All"
                  count={filterCounts.all}
                  isActive={listFilter === "all"}
                  onClick={() => setListFilterUrl("all")}
                />
                <WorkspaceFilterChip
                  label="No variants"
                  count={filterCounts.no_variants}
                  isActive={listFilter === "no_variants"}
                  onClick={() => setListFilterUrl("no_variants")}
                />
                <WorkspaceFilterChip
                  label="Partial stock"
                  count={filterCounts.partial_stock}
                  isActive={listFilter === "partial_stock"}
                  onClick={() => setListFilterUrl("partial_stock")}
                />
                <WorkspaceFilterChip
                  label="All OOS"
                  count={filterCounts.all_out_of_stock}
                  isActive={listFilter === "all_out_of_stock"}
                  onClick={() => setListFilterUrl("all_out_of_stock")}
                />
                <WorkspaceFilterChip
                  label="Fully stocked"
                  count={filterCounts.fully_stocked}
                  isActive={listFilter === "fully_stocked"}
                  onClick={() => setListFilterUrl("fully_stocked")}
                />
                <WorkspaceFilterChip
                  label="Featured"
                  count={filterCounts.featured}
                  isActive={listFilter === "featured"}
                  onClick={() => setListFilterUrl("featured")}
                />
                <WorkspaceFilterChip
                  label="Disabled"
                  count={filterCounts.hidden}
                  isActive={listFilter === "hidden"}
                  onClick={() => setListFilterUrl("hidden")}
                />
                </>
              }
            />

            <div className="min-h-0 flex-1 overflow-y-auto p-2 [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&_table]:text-xs [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-[10px]">
              <AdminTable
                rows={tableRows}
                columns={tableColumns}
                rowKey={(product) => product.id}
                emptyState={
                  products.length === 0
                    ? canCreate
                      ? "No products yet. Click New product to add one."
                      : "No products yet."
                    : productQuery.trim() || listFilter !== "all"
                      ? "No products match your search or filters."
                      : "No products in this category."
                }
              />
            </div>
          </div>
        </div>
      </WorkspaceFrame>

      <ProductEditDrawer
        productId={editId}
        catalog={catalog}
        isOpen={editId !== null}
        onClose={closePanels}
        onSaved={() => router.refresh()}
      />

      <ProductManageVariantsDrawer
        productId={variantsId}
        catalog={catalog}
        isOpen={variantsId !== null}
        onClose={closePanels}
        onUpdated={() => router.refresh()}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete product?"
        message={
          <>
            Permanently delete <strong>{deleteTarget?.name}</strong> and all its
            variants?
          </>
        }
        tone="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={closeDeleteConfirm}
      />
    </>
  );
}

function CategorySidebar({
  items,
  selectedSlug,
  onSelect,
  categoryQuery,
  onCategoryQueryChange,
  isFiltered,
}: {
  items: CategoryNavItem[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  categoryQuery: string;
  onCategoryQueryChange: (value: string) => void;
  isFiltered: boolean;
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
          aria-label="Product categories"
          className="-mx-1 flex-1 overflow-y-auto"
        >
          {items.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-[var(--color-ink-500)]">
              No categories match your search.
            </p>
          ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map(({ category, totalCount }) => {
              const isSelected = category.slug === selectedSlug;

              return (
                <li key={category.slug}>
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
                      {totalCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          )}
        </nav>
      </aside>

      <div className="shrink-0 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 py-2 lg:hidden">
        <CatalogSearchField
          value={categoryQuery}
          onChange={onCategoryQueryChange}
          placeholder="Search categories…"
          aria-label="Search categories"
          className="mb-2 w-full"
        />
        <nav
          aria-label="Product categories"
          className="-mx-1 flex gap-1 overflow-x-auto"
        >
          {items.length === 0 ? (
            <p className="px-1 text-[11px] text-[var(--color-ink-500)]">
              No categories match.
            </p>
          ) : (
          items.map(({ category, totalCount }) => {
            const isSelected = category.slug === selectedSlug;

            return (
              <button
                key={category.slug}
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
                <span className="tabular-nums text-[9px] opacity-80">{totalCount}</span>
              </button>
            );
          })
          )}
        </nav>
      </div>
    </>
  );
}

function ProductStorefrontToggle({
  productId,
  productName,
  isActive: initialActive,
  onUpdated,
}: {
  productId: string;
  productName: string;
  isActive: boolean;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const [isActive, setIsActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    scheduleStateUpdate(() => {
      setIsActive(initialActive);
    });
  }, [initialActive, productId]);

  async function handleToggle() {
    const next = !isActive;
    setSaving(true);
    try {
      await adminFetch(`/api/products/${productId}`, {
        method: "PUT",
        json: { isActive: next },
      });
      setIsActive(next);
      toast.success(
        next
          ? `"${productName}" is visible on the storefront`
          : `"${productName}" is hidden from the storefront`,
      );
      onUpdated();
    } catch (error) {
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : "Failed to update product visibility.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label={
        isActive
          ? `Disable ${productName} on storefront`
          : `Enable ${productName} on storefront`
      }
      disabled={saving}
      onClick={() => void handleToggle()}
      className={classNames(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        saving ? "cursor-wait opacity-60" : "cursor-pointer",
        isActive ? "bg-[var(--color-ink-900)]" : "bg-[var(--color-ink-200)]",
      )}
    >
      <span
        className={classNames(
          "absolute size-4 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform",
          isActive ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function RowActionButton({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-1 rounded-[var(--radius-md)] border px-2 py-1 text-[11px] font-semibold transition-colors",
        tone === "danger"
          ? "border-[var(--color-rose-200)] text-[var(--color-rose-700)] hover:bg-[var(--color-rose-50)]"
          : "border-[var(--color-ink-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function ProductThumb({ product }: { product: AdminProductSummary }) {
  if (product.heroImage) {
    return (
      <Image
        src={product.heroImage.variants.thumb}
        alt={product.heroImage.alt || product.name}
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-[var(--radius-md)] object-cover"
      />
    );
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
      {getInitials(product.brand.name || product.name)}
    </span>
  );
}
