"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/admin/forms/FormSection";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { SelectField } from "@/components/admin/forms/SelectField";
import { Switch } from "@/components/admin/forms/Switch";
import { ImagePicker } from "@/components/admin/forms/ImagePicker";
import { SaveBar } from "@/components/admin/forms/SaveBar";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusPill } from "@/components/admin/StatusPill";
import { useToast } from "@/components/admin/Toast";
import { stockTypeDescriptors } from "@/data/stockTypes";
import { gradeDescriptors } from "@/data/grades";
import {
  formatBatteryRange,
  formatPrice,
  formatStorage,
  classNames,
} from "@/lib/utils";
import type { Brand, Phone, PhoneVariant } from "@/types";

interface ProductEditorProps {
  phone: Phone;
  brands: Brand[];
}

export function ProductEditor({ phone, brands }: ProductEditorProps) {
  const toast = useToast();
  const [editingVariant, setEditingVariant] = useState<PhoneVariant | "new" | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<PhoneVariant | null>(null);

  function handleSave() {
    toast.success(`"${phone.modelName}" saved`);
  }

  function handleDiscard() {
    toast.info("Changes discarded");
  }

  function handleVariantSave() {
    toast.success(editingVariant === "new" ? "Variant added" : "Variant updated");
    setEditingVariant(null);
  }

  function handleVariantDelete() {
    if (!variantToDelete) return;
    toast.warn(`Variant "${variantToDelete.id}" removed`);
    setVariantToDelete(null);
  }

  return (
    <>
      <div className="space-y-1 pt-3">
        <FormSection
          title="Basic info"
          description="Model name, brand and slug used across the storefront."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Model name" defaultValue={phone.modelName} />
            <SelectField
              label="Brand"
              defaultValue={phone.brandSlug}
              options={brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Slug"
              defaultValue={phone.slug}
              hint="Used in URLs: /shop/{slug}"
            />
            <TextField
              label="Release year"
              type="number"
              defaultValue={phone.releaseYear}
            />
          </div>
          <Switch
            label="Featured on homepage"
            description="Show this model in the 'Latest stock arrived' carousel."
            defaultChecked={phone.isFeatured}
          />
        </FormSection>

        <FormSection
          title="Imagery"
          description="Hero image and gallery. The first image is used as the card thumbnail."
        >
          <ImagePicker
            label="Gallery"
            imageUrls={[phone.imageUrl, ...phone.galleryUrls]}
            brandSlug={phone.brandSlug}
            brandName={phone.brandSlug}
            modelName={phone.modelName}
            onAddPlaceholder={() => toast.info("Image upload is disabled in the demo")}
          />
        </FormSection>

        <FormSection
          title="Highlights"
          description="Short bullet points shown on the product detail page."
        >
          <TextArea
            label="Highlights (one per line)"
            defaultValue={phone.highlights.join("\n")}
            rows={5}
          />
        </FormSection>

        <FormSection
          title="Variants"
          description="Each variant is a unique unit. Buyers see them as separate cards on the shop page and can compare them side-by-side."
        >
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 text-[var(--color-ink-500)]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em]">
                    Variant
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em]">
                    Stock type
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em]">
                    Battery
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em]">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em]">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-ink-100)]">
                {phone.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                        {variant.grade} grade · {variant.colorName}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-500)]">
                        {formatStorage(variant.storageGb)} · {variant.ramGb} GB RAM
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-ink-700)]">
                      {variant.stockType}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-ink-700)]">
                      {formatBatteryRange(variant.batteryHealthRange)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-ink-900)]">
                      {formatPrice(variant.priceRupees)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill tone={variant.isInStock ? "success" : "danger"}>
                          {variant.isInStock ? "In stock" : "Sold out"}
                        </StatusPill>
                        {variant.isPtaApproved && <StatusPill tone="accent">PTA</StatusPill>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Edit variant"
                          onClick={() => setEditingVariant(variant)}
                          className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete variant"
                          onClick={() => setVariantToDelete(variant)}
                          className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setEditingVariant("new")}
          >
            Add variant
          </Button>
        </FormSection>

        <FormSection title="SEO" description="Page-level metadata for search engines.">
          <TextField
            label="Meta title"
            defaultValue={`${phone.modelName} — pre-owned, graded`}
            hint="Recommended: 50–60 characters"
          />
          <TextArea
            label="Meta description"
            defaultValue={phone.highlights.join(" · ")}
            rows={3}
          />
        </FormSection>

        <FormSection
          title="Danger zone"
          description="Destructive actions. These also won't persist in the demo."
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-rose-900">Archive this product</p>
              <p className="text-xs text-rose-700/80">
                Hides it from the storefront. You can restore later.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => toast.warn(`"${phone.modelName}" archived`)}
            >
              Archive product
            </Button>
          </div>
        </FormSection>
      </div>

      <SaveBar
        onSave={handleSave}
        onDiscard={handleDiscard}
        hint={`Editing ${phone.modelName}. Demo console — Save shows a toast but nothing persists.`}
      />

      <Drawer
        isOpen={editingVariant !== null}
        onClose={() => setEditingVariant(null)}
        title={editingVariant === "new" ? "Add variant" : "Edit variant"}
        description={
          editingVariant === "new"
            ? "Add a new unit (different grade, stock type, storage or color)."
            : "Update specs, pricing and stock status for this variant."
        }
        width="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingVariant(null)}
              type="button"
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleVariantSave} type="button">
              {editingVariant === "new" ? "Add variant" : "Save variant"}
            </Button>
          </div>
        }
      >
        <VariantForm
          variant={typeof editingVariant === "object" ? editingVariant : null}
        />
      </Drawer>

      <ConfirmDialog
        isOpen={variantToDelete !== null}
        title="Delete variant?"
        message={
          <>
            This will permanently remove the {variantToDelete?.grade} grade ·{" "}
            {variantToDelete?.colorName} variant from {phone.modelName}.
          </>
        }
        tone="danger"
        confirmLabel="Delete variant"
        onConfirm={handleVariantDelete}
        onCancel={() => setVariantToDelete(null)}
      />
    </>
  );
}

interface VariantFormProps {
  variant: PhoneVariant | null;
}

function VariantForm({ variant }: VariantFormProps) {
  const stockTypeOptions = stockTypeDescriptors.map((descriptor) => ({
    value: descriptor.stockType,
    label: descriptor.label,
  }));

  const gradeOptions = gradeDescriptors.map((descriptor) => ({
    value: descriptor.grade,
    label: `${descriptor.grade} — ${descriptor.shortLabel}`,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Stock type"
          defaultValue={variant?.stockType ?? "genuine"}
          options={stockTypeOptions}
        />
        <SelectField
          label="Condition grade"
          defaultValue={variant?.grade ?? "A"}
          options={gradeOptions}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Storage"
          defaultValue={String(variant?.storageGb ?? 128)}
          options={[64, 128, 256, 512, 1024].map((gb) => ({
            value: String(gb),
            label: gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`,
          }))}
        />
        <TextField label="RAM (GB)" type="number" defaultValue={variant?.ramGb ?? 6} />
      </div>

      <TextField label="Color" defaultValue={variant?.colorName ?? ""} />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Selling price (PKR)"
          type="number"
          defaultValue={variant?.priceRupees ?? 0}
          trailingAddon="Rs"
        />
        <TextField
          label="Original price (PKR)"
          type="number"
          defaultValue={variant?.originalPriceRupees ?? 0}
          trailingAddon="Rs"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Battery min %"
          type="number"
          defaultValue={variant?.batteryHealthRange.minPercent ?? 85}
          trailingAddon="%"
        />
        <TextField
          label="Battery max %"
          type="number"
          defaultValue={variant?.batteryHealthRange.maxPercent ?? 92}
          trailingAddon="%"
        />
      </div>

      <TextField
        label="Warranty (months)"
        type="number"
        defaultValue={variant?.warrantyMonths ?? 6}
      />

      <Switch
        label="PTA approved"
        description="Marks this unit as PTA approved on storefront cards."
        defaultChecked={variant?.isPtaApproved ?? false}
      />

      <Switch
        label="In stock"
        description="Toggle off to mark this variant as sold out."
        defaultChecked={variant?.isInStock ?? true}
      />

      <TextArea
        label="Notes (shown on detail page)"
        defaultValue={variant?.notes ?? ""}
        rows={3}
      />

      <div className={classNames("rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-3 text-xs text-[var(--color-ink-500)]")}>
        Variant ID will be generated from grade, storage and color, e.g.{" "}
        <span className="font-mono text-[var(--color-ink-700)]">
          {variant?.id ?? "iphone-14-genuine-128-blue"}
        </span>
      </div>
    </div>
  );
}
