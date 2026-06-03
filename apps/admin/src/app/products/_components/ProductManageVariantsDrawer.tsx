"use client";

import { useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";
import { Drawer } from "@/components/ui/Drawer";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { useToast } from "@/components/ui/Toast";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import type { AdminProduct } from "@/types/models";

import { ProductWizardStep2 } from "./ProductWizardStep2";

interface ProductManageVariantsDrawerProps {
  productId: string | null;
  catalog: ProductWizardCatalog;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ProductManageVariantsDrawer({
  productId,
  catalog,
  isOpen,
  onClose,
  onUpdated,
}: ProductManageVariantsDrawerProps) {
  const toast = useToast();
  const [product, setProduct] = useState<AdminProduct | null>(null);

  useEffect(() => {
    if (!isOpen || !productId) {
      scheduleStateUpdate(() => {
        setProduct(null);
      });
      return;
    }
    let cancelled = false;
    apiFetch<AdminProduct>(`/api/products/${productId}`)
      .then((loaded) => {
        if (!cancelled) setProduct(loaded);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.danger(
          error instanceof ApiError
            ? error.message
            : "Failed to load product.",
        );
        onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open + productId; toast/onClose are unstable
  }, [isOpen, productId]);

  function handleSaved(updated?: AdminProduct) {
    if (updated) {
      setProduct(updated);
    }
    onUpdated();
  }

  return (
    <Drawer
      isOpen={isOpen && product !== null}
      onClose={onClose}
      title="Manage variants"
      description={product?.name}
      width="2xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-0"
    >
      {product && (
        <ProductWizardStep2
          product={product}
          catalog={catalog}
          purpose="manage"
          onClose={onClose}
          onSkip={onClose}
          onSaved={handleSaved}
        />
      )}
    </Drawer>
  );
}
