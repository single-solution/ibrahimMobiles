"use client";

import { useEffect, useState } from "react";

import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { useToast } from "@/components/ui/Toast";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import type { AdminProduct } from "@/types/admin";

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
    adminFetch<AdminProduct>(`/api/products/${productId}`)
      .then((loaded) => {
        if (!cancelled) setProduct(loaded);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.danger(
          error instanceof AdminApiError
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
    <ProductWizardStep2
      isOpen={isOpen && product !== null}
      product={product}
      catalog={catalog}
      purpose="manage"
      onClose={onClose}
      onSkip={onClose}
      onSaved={handleSaved}
    />
  );
}
