"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FIELD_LIMITS, MAX_PRODUCT_RELEASE_YEAR, MIN_PRODUCT_RELEASE_YEAR } from "@store/shared";
import { PRODUCT_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { SelectField } from "@/components/forms/SelectField";
import { Switch } from "@/components/forms/Switch";
import { SaveBar } from "@/components/forms/SaveBar";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import type { AdminBrand, AdminProductSummary } from "@/types/admin";

interface NewProductFormProps {
  brands: AdminBrand[];
}

const CATEGORY_OPTIONS = [
  { value: "phone", label: "Phone" },
  { value: "accessory", label: "Accessory" },
  { value: "gadget", label: "Gadget" },
];

const ACCESSORY_TYPE_OPTIONS = [
  { value: "charger", label: "Charger" },
  { value: "cable", label: "Cable" },
  { value: "case", label: "Case" },
  { value: "earbuds", label: "Earbuds" },
  { value: "screen-protector", label: "Screen protector" },
  { value: "power-bank", label: "Power bank" },
  { value: "other", label: "Other" },
];

export function NewProductForm({ brands }: NewProductFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [modelName, setModelName] = useState("");
  const [slug, setSlug] = useState("");
  const [brandId, setBrandId] = useState<string>(brands[0]?.id ?? "");
  const [category, setCategory] = useState<"phone" | "accessory" | "gadget">("phone");
  const [accessoryType, setAccessoryType] = useState<string>("charger");
  const [gadgetType, setGadgetType] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [galleryUrlsRaw, setGalleryUrlsRaw] = useState("");
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [highlightsRaw, setHighlightsRaw] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (brands.length === 0) {
      toast.danger("No brands available — create one before adding products.");
      return;
    }
    setIsSubmitting(true);
    try {
      const galleryUrls = galleryUrlsRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const highlights = highlightsRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const product = await adminFetch<AdminProductSummary>(`/api/products`, {
        method: "POST",
        json: {
          modelName,
          slug: slug || undefined,
          brandId,
          category,
          accessoryType: category === "accessory" ? accessoryType : undefined,
          gadgetType: category === "gadget" ? gadgetType : undefined,
          imageUrl,
          galleryUrls,
          releaseYear,
          highlights,
          isFeatured,
          isActive,
        },
      });
      toast.success(`Created "${product.modelName}"`);
      router.push(`/products/${product.id}`);
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof AdminApiError ? error.message : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDiscard() {
    router.push("/products");
  }

  return (
    <form onSubmit={handleSave}>
      <div className="space-y-1 pt-3">
        <FormSection
          title="Basic info"
          description="Start with the model name, brand and slug. You'll add variants after creating."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Model name"
              placeholder="e.g. iPhone 16 Pro"
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
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Slug"
              placeholder="iphone-16-pro-256-titanium"
              hint="Used in URL — auto-generated from model name when blank"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={PRODUCT_FIELD_LIMITS.slug}
            />
            <TextField
              label="Release year"
              type="number"
              value={releaseYear}
              onChange={(event) => setReleaseYear(Number(event.target.value) || 0)}
              required
              min={MIN_PRODUCT_RELEASE_YEAR}
              max={MAX_PRODUCT_RELEASE_YEAR}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as "phone" | "accessory" | "gadget")
              }
              options={CATEGORY_OPTIONS}
            />
            {category === "accessory" ? (
              <SelectField
                label="Accessory type"
                value={accessoryType}
                onChange={(event) => setAccessoryType(event.target.value)}
                options={ACCESSORY_TYPE_OPTIONS}
              />
            ) : category === "gadget" ? (
              <TextField
                label="Gadget type"
                value={gadgetType}
                onChange={(event) => setGadgetType(event.target.value)}
                placeholder="console, smartwatch, laptop…"
                maxLength={FIELD_LIMITS.shortLabel}
              />
            ) : (
              <span className="hidden" />
            )}
          </div>
          <Switch
            label="Featured on homepage"
            description="Show in the 'Latest stock arrived' carousel."
            checked={isFeatured}
            onCheckedChange={setIsFeatured}
          />
          <Switch
            label="Active on storefront"
            description="Inactive products are hidden from buyers but kept in the admin catalog."
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </FormSection>

        <FormSection
          title="Imagery"
          description="Paste a hero image URL and any additional gallery URLs (one per line). File uploads land in a later phase."
        >
          <TextField
            label="Hero image URL"
            placeholder="https://…/photo.jpg"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            required
            maxLength={PRODUCT_FIELD_LIMITS.imageUrl}
          />
          <TextArea
            label="Gallery URLs"
            rows={4}
            placeholder={"https://…/front.jpg\nhttps://…/back.jpg"}
            value={galleryUrlsRaw}
            onChange={(event) => setGalleryUrlsRaw(event.target.value)}
            hint="One URL per line."
          />
        </FormSection>

        <FormSection
          title="Highlights"
          description="Bulleted list of the model's key features. One per line, max 8."
        >
          <TextArea
            label="Highlights"
            rows={5}
            placeholder={"Face ID\nA17 Pro chip\nUSB-C\nTriple 48 MP camera"}
            value={highlightsRaw}
            onChange={(event) => setHighlightsRaw(event.target.value)}
          />
        </FormSection>
      </div>

      <SaveBar
        onSave={() => void handleSave()}
        onDiscard={handleDiscard}
        saveLabel={isSubmitting ? "Creating…" : "Create product"}
        hint="After creating, you'll be taken to the variants editor."
      />
    </form>
  );
}
