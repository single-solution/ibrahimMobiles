"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { BRAND_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import { getInitials } from "@/lib/initials";
import type { AdminBrand } from "@/types/admin";

interface BrandsTableProps {
  brands: AdminBrand[];
}

type DrawerState = { mode: "new" } | { mode: "edit"; brand: AdminBrand } | null;

export function BrandsTable({ brands }: BrandsTableProps) {
  const router = useRouter();
  const toast = useToast();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [brandToDelete, setBrandToDelete] = useState<AdminBrand | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!brandToDelete) {
      return;
    }
    try {
      await adminFetch<void>(`/api/brands/${brandToDelete.id}`, { method: "DELETE" });
      toast.warn(`"${brandToDelete.name}" deleted`);
      setBrandToDelete(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete brand");
    }
  }

  const columns: DataTableColumn<AdminBrand>[] = [
    {
      id: "name",
      header: "Brand",
      cell: (brand) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-700)]">
            {getInitials(brand.name)}
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
      id: "status",
      header: "Status",
      align: "right",
      cell: (brand) => (
        <span
          className={
            brand.isActive
              ? "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-700)]"
              : "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-400)]"
          }
        >
          {brand.isActive ? "Active" : "Hidden"}
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
            onClick={() => setDrawer({ mode: "edit", brand })}
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
        rowKey={(brand) => brand.id}
        searchAccessor={(brand) => `${brand.name} ${brand.slug} ${brand.tagline}`}
        searchPlaceholder="Search brands…"
        toolbar={
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setDrawer({ mode: "new" })}
          >
            Add brand
          </Button>
        }
      />

      {drawer ? (
        <BrandDrawer
          state={drawer}
          isSavingExternal={isPending}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={brandToDelete !== null}
        title="Delete brand?"
        message={
          <>
            Deleting <strong>{brandToDelete?.name}</strong> will remove it from the catalog. This
            cannot be undone.
          </>
        }
        tone="danger"
        confirmLabel="Delete brand"
        onConfirm={handleDelete}
        onCancel={() => setBrandToDelete(null)}
      />
    </>
  );
}

interface BrandDrawerProps {
  state: { mode: "new" } | { mode: "edit"; brand: AdminBrand };
  isSavingExternal: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function BrandDrawer({ state, isSavingExternal, onClose, onSaved }: BrandDrawerProps) {
  const toast = useToast();
  const isEdit = state.mode === "edit";
  const brand = isEdit ? state.brand : null;

  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [tagline, setTagline] = useState(brand?.tagline ?? "");
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEdit && brand) {
        await adminFetch(`/api/brands/${brand.id}`, {
          method: "PUT",
          json: { name, slug, tagline, isActive },
        });
        toast.success("Brand updated");
      } else {
        await adminFetch(`/api/brands`, {
          method: "POST",
          json: { name, slug, tagline, isActive },
        });
        toast.success("Brand created");
      }
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save brand");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={isEdit ? "Edit brand" : "Add brand"}
      description={
        isEdit
          ? "Update name, slug or tagline."
          : "Create a new manufacturer for the catalog."
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="brand-form"
            isLoading={isSubmitting || isSavingExternal}
          >
            {isEdit ? "Save changes" : "Create brand"}
          </Button>
        </div>
      }
    >
      <form id="brand-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Brand name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Apple"
          required
          maxLength={BRAND_FIELD_LIMITS.name}
        />
        <TextField
          label="Slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="apple"
          hint="Lower-case, used in URLs (auto-generated from name when blank)"
          maxLength={BRAND_FIELD_LIMITS.slug}
        />
        <TextArea
          label="Tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          rows={2}
          placeholder="iPhone — refurbished and ready"
          required
          maxLength={BRAND_FIELD_LIMITS.tagline}
        />
        <Switch
          label="Active"
          description="Inactive brands are hidden from the storefront."
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </form>
    </Drawer>
  );
}
