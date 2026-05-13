"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { Switch } from "@/components/admin/forms/Switch";
import { useToast } from "@/components/admin/Toast";
import type { Brand } from "@/types";

interface BrandsTableProps {
  brands: Brand[];
}

export function BrandsTable({ brands }: BrandsTableProps) {
  const toast = useToast();
  const [editingBrand, setEditingBrand] = useState<Brand | "new" | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

  const columns: DataTableColumn<Brand>[] = [
    {
      id: "name",
      header: "Brand",
      cell: (brand) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-700)]">
            {brand.name.slice(0, 2)}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">{brand.name}</p>
            <p className="text-[11px] text-[var(--color-ink-500)]">/{brand.slug}</p>
          </div>
        </div>
      ),
    },
    {
      id: "tagline",
      header: "Tagline",
      hideOnMobile: true,
      cell: (brand) => (
        <span className="text-sm text-[var(--color-ink-700)]">{brand.tagline}</span>
      ),
    },
    {
      id: "phones",
      header: "Phones",
      align: "right",
      cell: (brand) => (
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">
          {brand.phoneCount}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "100px",
      cell: (brand) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit brand"
            onClick={() => setEditingBrand(brand)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete brand"
            onClick={() => setBrandToDelete(brand)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={brands}
        columns={columns}
        rowKey={(brand) => brand.slug}
        searchAccessor={(brand) => `${brand.name} ${brand.slug} ${brand.tagline}`}
        searchPlaceholder="Search brands…"
        toolbar={
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setEditingBrand("new")}
          >
            Add brand
          </Button>
        }
      />

      <Drawer
        isOpen={editingBrand !== null}
        onClose={() => setEditingBrand(null)}
        title={editingBrand === "new" ? "Add brand" : "Edit brand"}
        description={
          editingBrand === "new"
            ? "Create a new manufacturer for the catalog."
            : "Update name, slug or tagline."
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setEditingBrand(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => {
                toast.success(editingBrand === "new" ? "Brand created" : "Brand updated");
                setEditingBrand(null);
              }}
            >
              {editingBrand === "new" ? "Create brand" : "Save changes"}
            </Button>
          </div>
        }
      >
        <BrandForm brand={typeof editingBrand === "object" ? editingBrand : null} />
      </Drawer>

      <ConfirmDialog
        isOpen={brandToDelete !== null}
        title="Delete brand?"
        message={
          <>
            Deleting <strong>{brandToDelete?.name}</strong> will unassign{" "}
            {brandToDelete?.phoneCount} products. This cannot be undone.
          </>
        }
        tone="danger"
        confirmLabel="Delete brand"
        onConfirm={() => {
          if (brandToDelete) {
            toast.warn(`"${brandToDelete.name}" deleted`);
          }
          setBrandToDelete(null);
        }}
        onCancel={() => setBrandToDelete(null)}
      />
    </>
  );
}

interface BrandFormProps {
  brand: Brand | null;
}

function BrandForm({ brand }: BrandFormProps) {
  return (
    <div className="space-y-4">
      <TextField label="Brand name" defaultValue={brand?.name ?? ""} placeholder="Apple" />
      <TextField
        label="Slug"
        defaultValue={brand?.slug ?? ""}
        placeholder="apple"
        hint="Lower-case, used in URLs"
      />
      <TextArea
        label="Tagline"
        defaultValue={brand?.tagline ?? ""}
        rows={2}
        placeholder="iPhone — refurbished and ready"
      />
      <TextField
        label="Phone count override"
        type="number"
        defaultValue={brand?.phoneCount ?? 0}
        hint="Auto-calculated from products in production. Override here if needed."
      />
      <Switch
        label="Show on homepage carousel"
        description="Brands featured in the 'Pakistan's most-asked-for brands' strip."
        defaultChecked
      />
    </div>
  );
}
