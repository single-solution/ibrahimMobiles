"use client";

import { useEffect, useMemo, useState } from "react";

import { Drawer } from "@/components/Drawer";
import { CatalogSeoPanel } from "@/components/seo/CatalogSeoPanel";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import type { SeoMeta } from "@store/shared";
import type { AdminProduct } from "@/types/admin";

import { WizardFieldError, WizardSection } from "./productWizardUi";

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
  const toast = useToast();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [seo, setSeo] = useState<SeoMeta>({});
  const [saving, setSaving] = useState(false);

  const category = useMemo(
    () =>
      product
        ? catalog.categories.find((row) => row.slug === product.categorySlug) ?? null
        : null,
    [catalog.categories, product],
  );

  const brands = product
    ? (catalog.brandsByCategory[product.categorySlug] ?? [])
    : [];

  useEffect(() => {
    if (!isOpen || !productId) {
      return;
    }
    let cancelled = false;
    scheduleStateUpdate(() => {
      setLoading(true);
    });
    adminFetch<AdminProduct>(`/api/products/${productId}`)
      .then((loaded) => {
        if (cancelled) return;
        setProduct(loaded);
        setName(loaded.name);
        setBrandSlug(loaded.brand.slug);
        setSeo(loaded.seo ?? {});
      })
      .catch((error) => {
        if (cancelled) return;
        toast.danger(
          error instanceof AdminApiError
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!product || saving) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.danger("Product name is required.");
      return;
    }
    setSaving(true);
    try {
      await adminFetch<AdminProduct>(`/api/products/${product.id}`, {
        method: "PUT",
        json: { name: trimmed, brandSlug, seo },
      });
      toast.success("Product updated.");
      onSaved();
      onClose();
    } catch (error) {
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : "Failed to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit product"
      description={product?.name ?? (loading ? "Loading…" : undefined)}
      width="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-edit-drawer"
            disabled={saving || loading || !product}
            className="rounded-md bg-[var(--color-accent-600)] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      {loading && (
        <p className="text-sm text-[var(--color-ink-500)]">Loading product…</p>
      )}
      {product && !loading && (
        <form id="product-edit-drawer" onSubmit={handleSubmit} className="flex flex-col gap-5">
          <WizardSection title="Details">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[15px] focus:border-[var(--color-accent-500)] focus:outline-none"
              />
            </label>
            <p className="mt-2 text-[11.5px] text-[var(--color-ink-500)]">
              Category:{" "}
              <span className="font-semibold text-[var(--color-ink-800)]">
                {category?.label ?? product.categorySlug}
              </span>
            </p>
          </WizardSection>

          <WizardSection title="Brand">
            <div className="flex flex-wrap gap-1.5">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setBrandSlug(brand.slug)}
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
                variants: product.variants,
              },
            }}
          />
        </form>
      )}
    </Drawer>
  );
}
