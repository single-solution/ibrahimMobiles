"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, MoreHorizontal, Pencil } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { StatusPill } from "@/components/StatusPill";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { getInitials } from "@/lib/initials";
import { formatPrice } from "@store/shared";
import type { AdminProductSummary } from "@/types/admin";

interface ProductsTableProps {
  products: AdminProductSummary[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter();
  const toast = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProductSummary | null>(null);

  function searchAccessor(product: AdminProductSummary) {
    return [product.modelName, product.brand.name, product.slug].join(" ");
  }

  async function handleArchive() {
    if (!archiveTarget) {
      return;
    }
    try {
      await adminFetch(`/api/products/${archiveTarget.id}`, {
        method: "PUT",
        json: { isArchived: true, isActive: false },
      });
      toast.warn(`Archived "${archiveTarget.modelName}"`);
      setArchiveTarget(null);
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to archive product");
    }
  }

  const columns: DataTableColumn<AdminProductSummary>[] = [
    {
      id: "product",
      header: "Product",
      cell: (product) => (
        <Link
          href={`/products/${product.id}`}
          className="flex items-center gap-3 hover:text-[var(--color-ink-900)]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
            {getInitials(product.brand.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
              {product.modelName}
            </p>
            <p className="truncate text-xs text-[var(--color-ink-500)]">
              {product.brand.name || product.brand.slug} · {product.slug}
            </p>
          </div>
        </Link>
      ),
    },
    {
      id: "category",
      header: "Category",
      hideOnMobile: true,
      cell: (product) => (
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-600)]">
          {product.category}
          {product.accessoryType ? ` · ${product.accessoryType}` : ""}
          {product.gadgetType ? ` · ${product.gadgetType}` : ""}
        </span>
      ),
    },
    {
      id: "variants",
      header: "Variants",
      hideOnMobile: true,
      cell: (product) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {product.variantCount}{" "}
          <span className="font-normal text-[var(--color-ink-500)]">
            ({product.inStockCount} in stock)
          </span>
        </span>
      ),
    },
    {
      id: "price",
      header: "From",
      align: "right",
      cell: (product) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {product.minPriceRupees !== undefined ? formatPrice(product.minPriceRupees) : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      hideOnMobile: true,
      cell: (product) => (
        <div className="flex flex-wrap gap-1">
          <StatusPill tone={product.inStockCount > 0 ? "success" : "danger"}>
            {product.inStockCount > 0 ? "In stock" : "Sold out"}
          </StatusPill>
          {product.isFeatured && <StatusPill tone="dark">Featured</StatusPill>}
          {!product.isActive && <StatusPill tone="warn">Hidden</StatusPill>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "60px",
      cell: (product) => (
        <div className="relative inline-block">
          <button
            type="button"
            aria-label="Row actions"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenMenuId(openMenuId === product.id ? null : product.id);
            }}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <MoreHorizontal size={16} />
          </button>
          {openMenuId === product.id && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] py-1 text-sm shadow-[var(--shadow-lg)]"
              onClick={(event) => event.stopPropagation()}
            >
              <Link
                href={`/products/${product.id}`}
                className="flex items-center gap-2 px-3 py-2 text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]"
                onClick={() => setOpenMenuId(null)}
              >
                <Pencil size={13} />
                Edit
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  setOpenMenuId(null);
                  setArchiveTarget(product);
                }}
              >
                <Archive size={13} />
                Archive
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={products}
        columns={columns}
        rowKey={(product) => product.id}
        searchAccessor={searchAccessor}
        searchPlaceholder="Search by model, brand, slug…"
        pageSize={10}
      />

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archive product?"
        message={
          <>
            Archiving will hide <strong>{archiveTarget?.modelName}</strong> and its variants from
            the storefront. You can unarchive it later from the archived view.
          </>
        }
        tone="danger"
        confirmLabel="Archive product"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </>
  );
}
