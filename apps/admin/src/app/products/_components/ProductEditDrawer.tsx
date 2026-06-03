"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { CatalogSeoPanel } from "@/app/settings/_components/CatalogSeoPanel";
import { ImageGallery } from "@/components/shared/uploads";
import {
  uploadGalleryImages,
  type GalleryImage,
} from "@/components/shared/uploads/imageStaging";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/api";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import type { SeoMeta } from "@store/shared";
import type { AdminProduct } from "@/types/models";

import { collectProductImageErrors } from "./productFormState";
import { Stepper } from "@/components/ui/Stepper";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CategoryOptionButton, WizardFieldError, WizardSection } from "./productWizardUi";
import { ProductWizardStep2 } from "./ProductWizardStep2";

interface ProductEditDrawerProps {
  productId: string | null;
  catalog: ProductWizardCatalog;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductEditDrawer({
  productId,
  catalog,
  isOpen,
  onClose,
  onSaved,
}: ProductEditDrawerProps) {
  const router = useRouter();
  const toast = useToast();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [pendingCategorySlug, setPendingCategorySlug] = useState<string | null>(null);
  const [brandSlug, setBrandSlug] = useState("");
  const [pendingBrandSlug, setPendingBrandSlug] = useState<string | null>(null);
  const [seo, setSeo] = useState<SeoMeta>({});
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const category = useMemo(
    () =>
      categorySlug
        ? catalog.categories.find((row) => row.slug === categorySlug) ?? null
        : null,
    [catalog.categories, categorySlug],
  );

  const brands = categorySlug
    ? (catalog.brandsByCategory[categorySlug] ?? [])
    : [];

  useEffect(() => {
    if (!isOpen || !productId) {
      return;
    }
    let cancelled = false;
    scheduleStateUpdate(() => {
      setLoading(true);
    });
    apiFetch<AdminProduct>(`/api/products/${productId}`)
      .then((loaded) => {
        if (cancelled) return;
        setProduct(loaded);
        setName(loaded.name);
        setCategorySlug(loaded.categorySlug);
        setBrandSlug(loaded.brand.slug);
        setSeo(loaded.seo ?? {});
        setImages((loaded.images ?? []) as GalleryImage[]);
        setImagesError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.danger(
          error instanceof ApiError
            ? error.message
            : "Failed to load product.",
        );
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, productId, onClose, toast]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>, isNext = false) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!product || saving) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.danger("Product name is required.");
      return;
    }
    const imageProblems = collectProductImageErrors(images);
    if (imageProblems.length > 0) {
      const message = imageProblems[0].message;
      setImagesError(message);
      toast.danger(message);
      return;
    }
    setImagesError(null);
    setSaving(true);
    try {
      const uploaded = await uploadGalleryImages(images, {
        subjectKind: "products",
        subjectId: product.id,
      });
      // Shell + photos live behind two endpoints; save them in sequence so a
      // shell failure (e.g. duplicate name) doesn't leave the gallery in a
      // mismatched state.
      await apiFetch<AdminProduct>(`/api/products/${product.id}`, {
        method: "PUT",
        json: { name: trimmed, categorySlug, brandSlug, seo },
      });
      await apiFetch<AdminProduct>(`/api/products/${product.id}/images`, {
        method: "PUT",
        json: { images: uploaded },
      });
      if (!isNext) {
        toast.success("Product updated.");
        onSaved();
        onClose();
      } else {
        router.refresh();
        setStep((s) => Math.min(totalSteps, s + 1));
      }
    } catch (error) {
      toast.danger(
        error instanceof ApiError
          ? error.message
          : "Failed to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    { id: 1, label: "Details & Photos" },
    { id: 2, label: "Variants" },
    { id: 3, label: "SEO & Entity" },
  ];

  const renderFooter = () => (
    <div className="safe-bottom shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-4 py-3 md:px-5 md:py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-[var(--color-ink-500)]">
          Step {step} of {totalSteps}
        </div>
        <div className="flex items-center gap-2">
          {step === 1 ? (
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="product-edit-drawer"
              isLoading={saving}
              disabled={loading || !product}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="product-edit-drawer"
              isLoading={saving}
              disabled={loading || !product}
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit product"
      description={product?.name ?? (loading ? "Loading…" : undefined)}
      width="2xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-0"
      topBar={
        <div className="flex justify-center py-2">
          <Stepper steps={steps} currentStep={step} className="max-w-md" />
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-5 animate-pulse p-4 md:p-6">
          <WizardSection title="Details">
            <div className="flex flex-col gap-1">
              <div className="h-3 w-12 bg-[var(--color-ink-200)] rounded" />
              <div className="h-10 w-full bg-[var(--color-ink-100)] rounded-md" />
            </div>
            <div className="mt-2 h-3 w-32 bg-[var(--color-ink-200)] rounded" />
          </WizardSection>
          <WizardSection title="Brand">
            <div className="flex flex-wrap gap-1.5">
              <div className="h-7 w-16 bg-[var(--color-ink-100)] rounded-full" />
              <div className="h-7 w-20 bg-[var(--color-ink-100)] rounded-full" />
              <div className="h-7 w-14 bg-[var(--color-ink-100)] rounded-full" />
            </div>
          </WizardSection>
          <WizardSection title="Photos">
            <div className="mb-2 h-3 w-64 bg-[var(--color-ink-200)] rounded" />
            <div className="flex gap-2">
              <div className="size-20 bg-[var(--color-ink-100)] rounded-md" />
              <div className="size-20 bg-[var(--color-ink-100)] rounded-md border border-dashed" />
            </div>
          </WizardSection>
        </div>
      ) : product ? (
        <>
          {(step === 1 || step === 3) && (
            <form id="product-edit-drawer" onSubmit={(e) => {
              handleSubmit(e, step < totalSteps);
            }} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
                <div className="flex flex-col gap-5">
                  {step === 1 && (
                    <>
                      <WizardSection title="Category">
                        <div className="flex flex-wrap gap-1.5">
                          {catalog.categories.map((c) => (
                            <CategoryOptionButton
                              key={c.id}
                              category={c}
                              isSelected={categorySlug === c.slug}
                              onSelect={() => {
                                if (categorySlug !== c.slug) {
                                  if (categorySlug && product.categorySlug === categorySlug) {
                                    setPendingCategorySlug(c.slug);
                                  } else {
                                    setCategorySlug(c.slug);
                                    if (!catalog.brandsByCategory[c.slug]?.some(b => b.slug === brandSlug)) {
                                      setBrandSlug("");
                                    }
                                  }
                                }
                              }}
                            />
                          ))}
                        </div>
                      </WizardSection>

                      <WizardSection title="Details">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                    Name
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    placeholder="e.g. Product name"
                    autoComplete="off"
                    className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[15px] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none"
                  />
                </label>
              </WizardSection>

              <WizardSection title="Brand">
                <div className="flex flex-wrap gap-1.5">
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        if (brandSlug !== brand.slug) {
                          if (brandSlug && product.brand.slug === brandSlug) {
                            setPendingBrandSlug(brand.slug);
                          } else {
                            setBrandSlug(brand.slug);
                          }
                        }
                      }}
                      className={
                        "rounded-full border px-2.5 py-1 text-[13px] font-semibold transition " +
                        (brandSlug === brand.slug
                          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                          : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)]")
                      }
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
                {!brandSlug && (
                  <WizardFieldError message="Pick a brand." />
                )}
              </WizardSection>

              <WizardSection title="Photos">
                <p className="mb-2 text-[11.5px] text-[var(--color-ink-500)]">
                  One gallery for the whole product — shared by every variant.
                </p>
                <ImageGallery
                  value={images}
                  onChange={(next) => {
                    setImages(next);
                    setImagesError(null);
                  }}
                  altTextBase={name || product.name}
                  subjectKind="products"
                  subjectId={product.id}
                  maxImages={8}
                  compact
                  dense
                />
                <WizardFieldError message={imagesError ?? undefined} />
              </WizardSection>
            </>
          )}

          {step === 3 && (
            <CatalogSeoPanel
              value={seo}
              onChange={setSeo}
              contextLabel={`Product · ${product.brand.name} ${name}`}
              entity={{
                type: "product",
                entity: {
                  slug: product.slug,
                  name,
                  brandName: product.brand.name,
                  categorySlug: product.categorySlug,
                  brand: { slug: product.brand.slug, name: product.brand.name },
                  category: category
                    ? {
                        slug: category.slug,
                        label: category.label,
                        description: category.description,
                      }
                    : undefined,
                  images: product.images,
                  variants: product.variants.map((v) => ({
                    id: v.id,
                    gradeSlug: v.gradeSlug,
                  })),
                },
              }}
            />
          )}
                </div>
              </div>
              {renderFooter()}
            </form>
          )}

          {step === 2 && (
            <ProductWizardStep2
              product={product}
              catalog={catalog}
              onClose={onClose}
              onSkip={() => { setStep(3); router.refresh(); }}
              onSaved={(latest) => {
                if (latest) setProduct(latest);
                setStep(3);
                router.refresh();
              }}
              purpose="manage"
              stepLabel={`Step 2 of ${totalSteps}`}
              onBack={() => setStep(1)}
              nextLabel="Next"
            />
          )}
        </>
      ) : null}

      <ConfirmDialog
        isOpen={pendingCategorySlug !== null}
        title="Change Category"
        message="Changing the category will reset the product's variants and might unselect the brand if it does not belong to the new category. Are you sure you want to proceed?"
        confirmLabel="Change category"
        tone="danger"
        onConfirm={() => {
          if (pendingCategorySlug) {
            setCategorySlug(pendingCategorySlug);
            if (!catalog.brandsByCategory[pendingCategorySlug]?.some(b => b.slug === brandSlug)) {
              setBrandSlug("");
            }
          }
          setPendingCategorySlug(null);
        }}
        onCancel={() => setPendingCategorySlug(null)}
      />

      <ConfirmDialog
        isOpen={pendingBrandSlug !== null}
        title="Change Brand"
        message="Are you sure you want to change the brand of this product?"
        confirmLabel="Change brand"
        tone="danger"
        onConfirm={() => {
          if (pendingBrandSlug) {
            setBrandSlug(pendingBrandSlug);
          }
          setPendingBrandSlug(null);
        }}
        onCancel={() => setPendingBrandSlug(null)}
      />
    </Drawer>
  );
}
