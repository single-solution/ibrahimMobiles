"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/admin/forms/FormSection";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { SelectField } from "@/components/admin/forms/SelectField";
import { Switch } from "@/components/admin/forms/Switch";
import { SaveBar } from "@/components/admin/forms/SaveBar";
import { useToast } from "@/components/admin/Toast";
import type { Brand } from "@/types";

interface NewProductFormProps {
  brands: Brand[];
}

export function NewProductForm({ brands }: NewProductFormProps) {
  const router = useRouter();
  const toast = useToast();

  function handleSave() {
    toast.success("Product created");
    setTimeout(() => router.push("/admin/products"), 600);
  }

  function handleDiscard() {
    router.push("/admin/products");
  }

  return (
    <>
      <div className="space-y-1 pt-3">
        <FormSection
          title="Basic info"
          description="Start with the model name, brand and slug. You'll add variants on the next step."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Model name" placeholder="e.g. iPhone 16 Pro" />
            <SelectField
              label="Brand"
              options={brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Slug" placeholder="iphone-16-pro-256-titanium" hint="Used in URL" />
            <TextField label="Release year" type="number" defaultValue={new Date().getFullYear()} />
          </div>
          <Switch
            label="Featured on homepage"
            description="Show in the 'Latest stock arrived' carousel."
          />
        </FormSection>

        <FormSection
          title="Imagery"
          description="Upload a hero image and a small gallery — disabled in this demo."
        >
          <div className="grid place-items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--color-ink-700)]">
              Drag-and-drop images here
            </p>
            <p className="text-xs text-[var(--color-ink-500)]">
              JPG, PNG or WebP up to 8 MB. Disabled in the demo.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info("Image upload is disabled in the demo")}
            >
              Choose files
            </Button>
          </div>
        </FormSection>

        <FormSection
          title="Highlights"
          description="Bulleted list of the model's key features. One per line."
        >
          <TextArea
            label="Highlights"
            rows={5}
            placeholder={
              "Face ID\nA17 Pro chip\nUSB-C\nTriple 48 MP camera"
            }
          />
        </FormSection>

        <FormSection title="SEO" description="Page-level metadata for search engines.">
          <TextField label="Meta title" placeholder="iPhone 16 Pro — pre-owned, graded" />
          <TextArea label="Meta description" rows={3} />
        </FormSection>
      </div>

      <SaveBar
        onSave={handleSave}
        onDiscard={handleDiscard}
        saveLabel="Create product"
        hint="After creating, you'll be taken to the variants editor."
      />
    </>
  );
}
