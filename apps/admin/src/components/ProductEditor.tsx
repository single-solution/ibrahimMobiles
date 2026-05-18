"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { SelectField } from "@/components/forms/SelectField";
import { Switch } from "@/components/forms/Switch";
import { SaveBar } from "@/components/forms/SaveBar";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { PRODUCT_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import {
  FIELD_LIMITS,
  STORAGE_OPTIONS,
  formatPrice,
  formatStorage,
  MAX_PRODUCT_RELEASE_YEAR,
  MIN_PRODUCT_RELEASE_YEAR,
} from "@store/shared";
import type { AdminBrand, AdminGrade, AdminProduct, AdminVariant } from "@/types/admin";

interface ProductEditorProps {
  product: AdminProduct;
  brands: AdminBrand[];
  grades: AdminGrade[];
}

type VariantDrawerState =
  | { mode: "new" }
  | { mode: "edit"; variant: AdminVariant }
  | null;

const ACCESSORY_TYPE_OPTIONS = [
  { value: "charger", label: "Charger" },
  { value: "cable", label: "Cable" },
  { value: "case", label: "Case" },
  { value: "earbuds", label: "Earbuds" },
  { value: "screen-protector", label: "Screen protector" },
  { value: "power-bank", label: "Power bank" },
  { value: "other", label: "Other" },
];

const CONNECTOR_OPTIONS = [
  { value: "usb-c", label: "USB-C" },
  { value: "lightning", label: "Lightning" },
  { value: "micro-usb", label: "Micro-USB" },
  { value: "wireless", label: "Wireless" },
  { value: "n-a", label: "Not applicable" },
];

export function ProductEditor({ product, brands, grades }: ProductEditorProps) {
  const router = useRouter();
  const toast = useToast();

  const [modelName, setModelName] = useState(product.modelName);
  const [slug, setSlug] = useState(product.slug);
  const [brandId, setBrandId] = useState(product.brand.id);
  const [accessoryType, setAccessoryType] = useState(product.accessoryType ?? "charger");
  const [gadgetType, setGadgetType] = useState(product.gadgetType ?? "");
  const [imageUrl, setImageUrl] = useState(product.imageUrl);
  const [galleryUrlsRaw, setGalleryUrlsRaw] = useState(product.galleryUrls.join("\n"));
  const [releaseYear, setReleaseYear] = useState(product.releaseYear);
  const [highlightsRaw, setHighlightsRaw] = useState(product.highlights.join("\n"));
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);
  const [isActive, setIsActive] = useState(product.isActive);
  const [isSaving, setIsSaving] = useState(false);

  const [variantDrawer, setVariantDrawer] = useState<VariantDrawerState>(null);
  const [variantToDelete, setVariantToDelete] = useState<AdminVariant | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const galleryUrls = galleryUrlsRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const highlights = highlightsRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      await adminFetch(`/api/products/${product.id}`, {
        method: "PUT",
        json: {
          modelName,
          slug,
          brandId,
          accessoryType: product.category === "accessory" ? accessoryType : undefined,
          gadgetType: product.category === "gadget" ? gadgetType : undefined,
          imageUrl,
          galleryUrls,
          releaseYear,
          highlights,
          isFeatured,
          isActive,
        },
      });
      toast.success(`"${modelName}" saved`);
      refresh();
    } catch (error) {
      toast.danger(error instanceof AdminApiError ? error.message : "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setModelName(product.modelName);
    setSlug(product.slug);
    setBrandId(product.brand.id);
    setAccessoryType(product.accessoryType ?? "charger");
    setGadgetType(product.gadgetType ?? "");
    setImageUrl(product.imageUrl);
    setGalleryUrlsRaw(product.galleryUrls.join("\n"));
    setReleaseYear(product.releaseYear);
    setHighlightsRaw(product.highlights.join("\n"));
    setIsFeatured(product.isFeatured);
    setIsActive(product.isActive);
    toast.info("Changes discarded");
  }

  async function handleDeleteVariant() {
    if (!variantToDelete) {
      return;
    }
    try {
      await adminFetch(
        `/api/products/${product.id}/variants/${variantToDelete.id}`,
        { method: "DELETE" },
      );
      toast.warn("Variant removed");
      setVariantToDelete(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete variant");
    }
  }

  async function handleArchive() {
    try {
      await adminFetch(`/api/products/${product.id}`, {
        method: "PUT",
        json: { isArchived: true, isActive: false },
      });
      toast.warn(`"${product.modelName}" archived`);
      setIsArchiveConfirmOpen(false);
      router.push("/products");
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to archive product");
    }
  }

  return (
    <>
      <div className="space-y-1 pt-3">
        <FormSection
          title="Basic info"
          description="Model name, brand and slug used across the storefront."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Model name"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              required
              maxLength={PRODUCT_FIELD_LIMITS.modelName}
            />
            <SelectField
              label="Brand"
              value={brandId}
              onChange={(event) => setBrandId(event.target.value)}
              options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              hint="Used in URLs: /shop/{slug}"
              maxLength={PRODUCT_FIELD_LIMITS.slug}
            />
            <TextField
              label="Release year"
              type="number"
              value={releaseYear}
              onChange={(event) => setReleaseYear(Number(event.target.value) || 0)}
              min={MIN_PRODUCT_RELEASE_YEAR}
              max={MAX_PRODUCT_RELEASE_YEAR}
            />
          </div>
          {product.category === "accessory" ? (
            <SelectField
              label="Accessory type"
              value={accessoryType}
              onChange={(event) => setAccessoryType(event.target.value)}
              options={ACCESSORY_TYPE_OPTIONS}
            />
          ) : product.category === "gadget" ? (
            <TextField
              label="Gadget type"
              value={gadgetType}
              onChange={(event) => setGadgetType(event.target.value)}
              maxLength={FIELD_LIMITS.shortLabel}
            />
          ) : null}
          <Switch
            label="Featured on homepage"
            description="Show this model in the 'Latest stock arrived' carousel."
            checked={isFeatured}
            onCheckedChange={setIsFeatured}
          />
          <Switch
            label="Active on storefront"
            description="Inactive products are hidden from buyers."
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </FormSection>

        <FormSection
          title="Imagery"
          description="Hero image and gallery URLs (one per line). The hero image is used as the card thumbnail."
        >
          <TextField
            label="Hero image URL"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            required
            maxLength={PRODUCT_FIELD_LIMITS.imageUrl}
          />
          <TextArea
            label="Gallery URLs"
            rows={4}
            value={galleryUrlsRaw}
            onChange={(event) => setGalleryUrlsRaw(event.target.value)}
            hint="One URL per line."
          />
        </FormSection>

        <FormSection
          title="Highlights"
          description="Short bullet points shown on the product detail page."
        >
          <TextArea
            label="Highlights (one per line)"
            value={highlightsRaw}
            onChange={(event) => setHighlightsRaw(event.target.value)}
            rows={5}
          />
        </FormSection>

        <FormSection
          title="Variants"
          description="Each variant is a unique unit. Buyers see them as separate cards on the shop page."
        >
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-ink-100)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 text-[var(--color-ink-500)]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em]">
                    Variant
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em]">
                    Specs
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em]">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em]">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-ink-100)]">
                {product.variants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-xs text-[var(--color-ink-500)]">
                      No variants yet. Click &ldquo;Add variant&rdquo; to create one.
                    </td>
                  </tr>
                ) : (
                  product.variants.map((variant) => {
                    const grade = grades.find((current) => current.grade === variant.grade);
                    return (
                      <tr key={variant.id}>
                        <td className="px-3 py-2.5">
                          <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                            {grade?.label ?? variant.grade} · {variant.colorName}
                          </p>
                          <p className="text-[11px] text-[var(--color-ink-500)]">{variant.id}</p>
                        </td>
                        <td className="px-3 py-2.5 text-[var(--color-ink-700)]">
                          {summariseSpecs(product.category, variant)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-ink-900)]">
                          {formatPrice(variant.priceRupees)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            <StatusPill tone={variant.isInStock ? "success" : "danger"}>
                              {variant.isInStock ? "In stock" : "Sold out"}
                            </StatusPill>
                            {variant.isPtaApproved ? <StatusPill tone="accent">PTA</StatusPill> : null}
                            {variant.isGenuine ? <StatusPill tone="accent">Genuine</StatusPill> : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Edit variant"
                              onClick={() => setVariantDrawer({ mode: "edit", variant })}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setVariantDrawer({ mode: "new" })}
          >
            Add variant
          </Button>
        </FormSection>

        <FormSection
          title="Danger zone"
          description="Archived products are hidden from buyers. You can restore later by editing the row in the archived view."
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-rose-900">Archive this product</p>
              <p className="text-xs text-rose-700/80">
                Hides it from the storefront and inactive lists. You can restore later.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setIsArchiveConfirmOpen(true)}>
              Archive product
            </Button>
          </div>
        </FormSection>
      </div>

      <SaveBar
        onSave={() => void handleSave()}
        onDiscard={handleDiscard}
        saveLabel={isSaving ? "Saving…" : "Save changes"}
        hint={`Editing ${product.modelName}.`}
      />

      {variantDrawer ? (
        <VariantDrawer
          state={variantDrawer}
          product={product}
          grades={grades}
          onClose={() => setVariantDrawer(null)}
          onSaved={() => {
            setVariantDrawer(null);
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={variantToDelete !== null}
        title="Delete variant?"
        message={
          <>
            This will permanently remove the {variantToDelete?.colorName} variant from {product.modelName}.
          </>
        }
        tone="danger"
        confirmLabel="Delete variant"
        onConfirm={handleDeleteVariant}
        onCancel={() => setVariantToDelete(null)}
      />

      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        title="Archive product?"
        message={
          <>
            <strong>{product.modelName}</strong> will be hidden from the storefront. You can
            restore from the archived view.
          </>
        }
        tone="danger"
        confirmLabel="Archive product"
        onConfirm={handleArchive}
        onCancel={() => setIsArchiveConfirmOpen(false)}
      />
    </>
  );
}

function summariseSpecs(category: AdminProduct["category"], variant: AdminVariant): string {
  if (category === "phone") {
    const parts: string[] = [];
    if (variant.storageGb) {
      parts.push(formatStorage(variant.storageGb));
    }
    if (variant.ramGb) {
      parts.push(`${variant.ramGb} GB RAM`);
    }
    if (variant.batteryHealthMinPercent && variant.batteryHealthMaxPercent) {
      parts.push(`Battery ${variant.batteryHealthMinPercent}–${variant.batteryHealthMaxPercent}%`);
    }
    return parts.join(" · ") || "—";
  }
  if (category === "accessory") {
    const parts: string[] = [];
    if (variant.connector) {
      parts.push(variant.connector);
    }
    if (variant.wattage) {
      parts.push(`${variant.wattage} W`);
    }
    if (variant.lengthMeters) {
      parts.push(`${variant.lengthMeters} m`);
    }
    return parts.join(" · ") || "—";
  }
  return variant.notes ?? "—";
}

interface VariantDrawerProps {
  state: { mode: "new" } | { mode: "edit"; variant: AdminVariant };
  product: AdminProduct;
  grades: AdminGrade[];
  onClose: () => void;
  onSaved: () => void;
}

function VariantDrawer({ state, product, grades, onClose, onSaved }: VariantDrawerProps) {
  const toast = useToast();
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.variant : null;

  const [grade, setGrade] = useState<string>(initial?.grade ?? grades[0]?.grade ?? "genuine");
  const [colorName, setColorName] = useState(initial?.colorName ?? "");
  const [priceRupees, setPriceRupees] = useState<number>(initial?.priceRupees ?? 0);
  const [originalPriceRupees, setOriginalPriceRupees] = useState<number>(
    initial?.originalPriceRupees ?? 0,
  );
  const [warrantyMonths, setWarrantyMonths] = useState<number>(initial?.warrantyMonths ?? 6);
  const [isInStock, setIsInStock] = useState(initial?.isInStock ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [storageGb, setStorageGb] = useState<number>(initial?.storageGb ?? 128);
  const [ramGb, setRamGb] = useState<number>(initial?.ramGb ?? 6);
  const [batteryMin, setBatteryMin] = useState<number>(initial?.batteryHealthMinPercent ?? 85);
  const [batteryMax, setBatteryMax] = useState<number>(initial?.batteryHealthMaxPercent ?? 92);
  const [isPtaApproved, setIsPtaApproved] = useState(initial?.isPtaApproved ?? false);

  const [connector, setConnector] = useState<string>(initial?.connector ?? "usb-c");
  const [wattage, setWattage] = useState<number>(initial?.wattage ?? 0);
  const [lengthMeters, setLengthMeters] = useState<number>(initial?.lengthMeters ?? 0);
  const [isGenuine, setIsGenuine] = useState(initial?.isGenuine ?? false);

  const [isSaving, setIsSaving] = useState(false);

  const allowedGrades = grades;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const payload: Record<string, unknown> = {
      grade,
      colorName,
      priceRupees,
      originalPriceRupees,
      warrantyMonths,
      isInStock,
      notes: notes || undefined,
    };
    if (product.category === "phone") {
      payload.storageGb = storageGb;
      payload.ramGb = ramGb;
      payload.batteryHealthMinPercent = batteryMin;
      payload.batteryHealthMaxPercent = batteryMax;
      payload.isPtaApproved = isPtaApproved;
    } else if (product.category === "accessory") {
      payload.connector = connector;
      if (wattage > 0) {
        payload.wattage = wattage;
      }
      if (lengthMeters > 0) {
        payload.lengthMeters = lengthMeters;
      }
      payload.isGenuine = isGenuine;
    }

    try {
      if (isEdit && initial) {
        await adminFetch(`/api/products/${product.id}/variants/${initial.id}`, {
          method: "PUT",
          json: payload,
        });
        toast.success("Variant updated");
      } else {
        await adminFetch(`/api/products/${product.id}/variants`, {
          method: "POST",
          json: payload,
        });
        toast.success("Variant added");
      }
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save variant");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={isEdit ? "Edit variant" : "Add variant"}
      description={
        isEdit
          ? "Update specs, pricing and stock status for this variant."
          : "Add a new unit (different grade, storage, color or connector)."
      }
      width="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="variant-form"
            isLoading={isSaving}
          >
            {isEdit ? "Save variant" : "Add variant"}
          </Button>
        </div>
      }
    >
      <form id="variant-form" onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Grade"
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          options={allowedGrades.map((descriptor) => ({
            value: descriptor.grade,
            label: descriptor.label,
          }))}
        />

        <TextField
          label="Color"
          value={colorName}
          onChange={(event) => setColorName(event.target.value)}
          required
          maxLength={FIELD_LIMITS.shortLabel}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Selling price"
            type="number"
            value={priceRupees}
            onChange={(event) => setPriceRupees(Number(event.target.value) || 0)}
            trailingAddon="Rs"
            required
            min={0}
          />
          <TextField
            label="Original price"
            type="number"
            value={originalPriceRupees}
            onChange={(event) => setOriginalPriceRupees(Number(event.target.value) || 0)}
            trailingAddon="Rs"
            required
            min={0}
          />
        </div>

        <TextField
          label="Warranty (months)"
          type="number"
          value={warrantyMonths}
          onChange={(event) => setWarrantyMonths(Number(event.target.value) || 0)}
          min={0}
          max={60}
        />

        <Switch
          label="In stock"
          description="Toggle off to mark this variant as sold out."
          checked={isInStock}
          onCheckedChange={setIsInStock}
        />

        {product.category === "phone" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Storage"
                value={String(storageGb)}
                onChange={(event) => setStorageGb(Number(event.target.value) || 0)}
                options={STORAGE_OPTIONS.map((gigabytes) => ({
                  value: String(gigabytes),
                  label: formatStorage(gigabytes),
                }))}
              />
              <TextField
                label="RAM (GB)"
                type="number"
                value={ramGb}
                onChange={(event) => setRamGb(Number(event.target.value) || 0)}
                min={0}
                max={256}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Battery min %"
                type="number"
                value={batteryMin}
                onChange={(event) => setBatteryMin(Number(event.target.value) || 0)}
                trailingAddon="%"
                min={0}
                max={100}
              />
              <TextField
                label="Battery max %"
                type="number"
                value={batteryMax}
                onChange={(event) => setBatteryMax(Number(event.target.value) || 0)}
                trailingAddon="%"
                min={0}
                max={100}
              />
            </div>
            <Switch
              label="PTA approved"
              description="Marks this unit as PTA approved on storefront cards."
              checked={isPtaApproved}
              onCheckedChange={setIsPtaApproved}
            />
          </>
        ) : null}

        {product.category === "accessory" ? (
          <>
            <SelectField
              label="Connector"
              value={connector}
              onChange={(event) => setConnector(event.target.value)}
              options={CONNECTOR_OPTIONS}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Wattage"
                type="number"
                value={wattage}
                onChange={(event) => setWattage(Number(event.target.value) || 0)}
                trailingAddon="W"
                min={0}
                hint="Leave 0 if not applicable."
              />
              <TextField
                label="Cable length"
                type="number"
                value={lengthMeters}
                onChange={(event) => setLengthMeters(Number(event.target.value) || 0)}
                trailingAddon="m"
                min={0}
                hint="Leave 0 if not applicable."
              />
            </div>
            <Switch
              label="Genuine OEM"
              description="Marks this accessory as a genuine first-party part."
              checked={isGenuine}
              onCheckedChange={setIsGenuine}
            />
          </>
        ) : null}

        <TextArea
          label="Notes (shown on detail page)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={FIELD_LIMITS.operatorNote}
        />
      </form>
    </Drawer>
  );
}
