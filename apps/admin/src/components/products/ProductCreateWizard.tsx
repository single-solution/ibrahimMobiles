"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { WorkspacePrimaryAction } from "@/components/workspace/adminWorkspaceUi";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import { useAdminUrlParams } from "@/lib/url/useAdminUrlParams";
import type { AdminProduct } from "@/types/admin";

import { ProductWizardStep1 } from "./ProductWizardStep1";
import { ProductWizardStep2 } from "./ProductWizardStep2";

type WizardPhase = "closed" | "step1" | "step2";

interface ProductCreateWizardProps {
  catalog: ProductWizardCatalog;
  /** `toolbar` = compact button in the products workspace header. */
  variant?: "header" | "sidebar" | "toolbar";
}

export function ProductCreateWizard({
  catalog,
  variant = "header",
}: ProductCreateWizardProps) {
  const router = useRouter();
  const { searchParams, replace } = useAdminUrlParams();
  const [phase, setPhase] = useState<WizardPhase>("closed");
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const pendingWizardRef = useRef<string | null>(null);

  const closeWizard = useCallback(() => {
    pendingWizardRef.current = null;
    setPhase("closed");
    setProduct(null);
    replace({ wizard: null, newProduct: null, create: null });
  }, [replace]);

  const finish = useCallback(() => {
    closeWizard();
    router.refresh();
  }, [closeWizard, router]);

  const openStep1 = useCallback(() => {
    pendingWizardRef.current = "1";
    setProduct(null);
    setPhase("step1");
    replace({ wizard: "1", newProduct: null });
  }, [replace]);

  const openStep2 = useCallback(
    (created: AdminProduct) => {
      pendingWizardRef.current = "2";
      setProduct(created);
      setPhase("step2");
      replace({ wizard: "2", newProduct: created.id, create: null });
    },
    [replace],
  );

  useEffect(() => {
    const wizard = searchParams.get("wizard");
    const createLegacy = searchParams.get("create");
    const targetWizard = wizard ?? (createLegacy === "1" ? "1" : null);

    if (pendingWizardRef.current !== null) {
      if (targetWizard === pendingWizardRef.current) {
        pendingWizardRef.current = null;
      } else {
        return;
      }
    }

    if (createLegacy === "1" && !wizard) {
      replace({ wizard: "1", create: null });
      return;
    }

    if (targetWizard === "2") {
      const productId = searchParams.get("newProduct");
      if (!productId) {
        scheduleStateUpdate(() => setPhase("closed"));
        return;
      }
      if (product?.id === productId) {
        scheduleStateUpdate(() => setPhase("step2"));
        return;
      }
      let cancelled = false;
      adminFetch<AdminProduct>(`/api/products/${productId}`)
        .then((loaded) => {
          if (!cancelled) {
            setProduct(loaded);
            setPhase("step2");
          }
        })
        .catch(() => {
          if (!cancelled) closeWizard();
        });
      return () => {
        cancelled = true;
      };
    }

    scheduleStateUpdate(() => {
      if (targetWizard === "1") {
        setProduct(null);
        setPhase("step1");
        return;
      }

      setPhase("closed");
      setProduct(null);
    });
  }, [searchParams, replace, product?.id, closeWizard]);

  function handleCreated(created: AdminProduct) {
    openStep2(created);
  }

  const trigger =
    variant === "toolbar" ? (
      <WorkspacePrimaryAction label="New product" icon={Plus} onClick={openStep1} />
    ) : variant === "sidebar" ? (
      <div className="mx-2 mb-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="w-full"
          leadingIcon={<Plus size={15} aria-hidden />}
          onClick={openStep1}
        >
          Add product
        </Button>
      </div>
    ) : (
      <Button
        type="button"
        variant="primary"
        size="md"
        leadingIcon={<Plus size={15} />}
        onClick={openStep1}
      >
        Add product
      </Button>
    );

  return (
    <>
      {trigger}

      <ProductWizardStep1
        isOpen={phase === "step1"}
        catalog={catalog}
        onClose={closeWizard}
        onCreated={handleCreated}
      />

      <ProductWizardStep2
        isOpen={phase === "step2"}
        product={product}
        catalog={catalog}
        onClose={finish}
        onSkip={finish}
        onSaved={finish}
      />
    </>
  );
}
