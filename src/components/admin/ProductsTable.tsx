"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, Copy, MoreHorizontal, Pencil } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import type { Brand, Phone } from "@/types";
import { formatPrice } from "@/lib/utils";

interface ProductsTableProps {
  phones: Phone[];
  brands: Brand[];
}

export function ProductsTable({ phones, brands }: ProductsTableProps) {
  const toast = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Phone | null>(null);

  const brandLookup = new Map(brands.map((brand) => [brand.slug, brand]));

  function searchAccessor(phone: Phone) {
    const brand = brandLookup.get(phone.brandSlug);
    return [phone.modelName, brand?.name ?? "", phone.slug].join(" ");
  }

  function getMinPrice(phone: Phone) {
    return Math.min(...phone.variants.map((variant) => variant.priceRupees));
  }

  function getMaxPrice(phone: Phone) {
    return Math.max(...phone.variants.map((variant) => variant.priceRupees));
  }

  function handleDuplicate(phone: Phone) {
    setOpenMenuId(null);
    toast.success(`Duplicated "${phone.modelName}"`);
  }

  function handleArchiveConfirm() {
    if (!archiveTarget) return;
    toast.warn(`Archived "${archiveTarget.modelName}"`);
    setArchiveTarget(null);
  }

  const columns: DataTableColumn<Phone>[] = [
    {
      id: "product",
      header: "Product",
      cell: (phone) => {
        const brand = brandLookup.get(phone.brandSlug);
        return (
          <Link
            href={`/admin/products/${phone.id}`}
            className="flex items-center gap-3 hover:text-[var(--color-ink-900)]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
              {brand?.name.slice(0, 2) ?? "??"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                {phone.modelName}
              </p>
              <p className="truncate text-xs text-[var(--color-ink-500)]">
                {brand?.name ?? phone.brandSlug} · {phone.slug}
              </p>
            </div>
          </Link>
        );
      },
    },
    {
      id: "variants",
      header: "Variants",
      hideOnMobile: true,
      cell: (phone) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {phone.variants.length}{" "}
          <span className="font-normal text-[var(--color-ink-500)]">
            ({phone.variants.filter((variant) => variant.isInStock).length} in stock)
          </span>
        </span>
      ),
    },
    {
      id: "price",
      header: "Price range",
      align: "right",
      cell: (phone) => {
        const minimum = getMinPrice(phone);
        const maximum = getMaxPrice(phone);
        return (
          <span className="text-sm font-semibold text-[var(--color-ink-900)]">
            {minimum === maximum
              ? formatPrice(minimum)
              : `${formatPrice(minimum)} – ${formatPrice(maximum)}`}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      hideOnMobile: true,
      cell: (phone) => {
        const inStock = phone.variants.some((variant) => variant.isInStock);
        return (
          <div className="flex flex-wrap gap-1">
            <StatusPill tone={inStock ? "success" : "danger"}>
              {inStock ? "In stock" : "Sold out"}
            </StatusPill>
            {phone.isFeatured && <StatusPill tone="dark">Featured</StatusPill>}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "60px",
      cell: (phone) => (
        <div className="relative inline-block">
          <button
            type="button"
            aria-label="Row actions"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenMenuId(openMenuId === phone.id ? null : phone.id);
            }}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <MoreHorizontal size={16} />
          </button>
          {openMenuId === phone.id && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] py-1 text-sm shadow-[var(--shadow-lg)]"
              onClick={(event) => event.stopPropagation()}
            >
              <Link
                href={`/admin/products/${phone.id}`}
                className="flex items-center gap-2 px-3 py-2 text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]"
                onClick={() => setOpenMenuId(null)}
              >
                <Pencil size={13} />
                Edit
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]"
                onClick={() => handleDuplicate(phone)}
              >
                <Copy size={13} />
                Duplicate
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  setOpenMenuId(null);
                  setArchiveTarget(phone);
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
        rows={phones}
        columns={columns}
        rowKey={(phone) => phone.id}
        searchAccessor={searchAccessor}
        searchPlaceholder="Search by model, brand, slug…"
        pageSize={8}
      />

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archive product?"
        message={
          <>
            Archiving will hide <strong>{archiveTarget?.modelName}</strong> and its variants from
            the storefront. You can restore it later from the archive view.
          </>
        }
        tone="danger"
        confirmLabel="Archive product"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </>
  );
}
