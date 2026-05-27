"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { compareAlphabetically, isValidId } from "@store/shared";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { TabList } from "@/components/ui/Tabs";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import {
  useAdminUrlParams,
} from "@/lib/url/useAdminUrlParams";
import { useToast } from "@/components/ui/Toast";
import type { ProductWizardCatalog } from "@/lib/products/loadProductWizardCatalog";
import type { AdminAttribute, AdminGrade, AdminProduct } from "@/types/admin";

import { VariantCard, VariantDetailFooter } from "./VariantCard";
import { VariantSidebarTile } from "./VariantSidebarTile";
import { WizardEmptyHint } from "./productWizardUi";
import {
  adminVariantToDraft,
  emptyVariantDraft,
  errorsByPath,
  mergeVariantDraftAttributes,
  newVariantUid,
  validateVariantDrafts,
  type CategorySurface,
  type ProductValidationError,
  type VariantDraft,
} from "./productFormState";

interface GradeSectionState {
  gradeSlug: string;
  combinations: VariantDraft[];
}

interface ProductWizardStep2Props {
  isOpen: boolean;
  product: AdminProduct | null;
  catalog: ProductWizardCatalog;
  onClose: () => void;
  onSkip: () => void;
  onSaved: (product?: AdminProduct) => void;
  /** `wizard` = after create; `manage` = catalog row action. */
  purpose?: "wizard" | "manage";
}

function buildGradeSections(
  product: AdminProduct,
  grades: AdminGrade[],
): GradeSectionState[] {
  const byGrade = new Map<string, VariantDraft[]>();
  for (const variant of product.variants) {
    const bucket = byGrade.get(variant.gradeSlug) ?? [];
    bucket.push(adminVariantToDraft(variant));
    byGrade.set(variant.gradeSlug, bucket);
  }

  return [...grades]
    .sort((left, right) => compareAlphabetically(left.label, right.label))
    .map((grade) => ({
      gradeSlug: grade.slug,
      combinations: byGrade.get(grade.slug) ?? [],
    }))
    .concat(
      [...byGrade.keys()]
        .filter((gradeSlug) => !grades.some((grade) => grade.slug === gradeSlug))
        .sort((left, right) => left.localeCompare(right))
        .map((gradeSlug) => ({
          gradeSlug,
          combinations: byGrade.get(gradeSlug) ?? [],
        })),
    );
}

function combinationSignature(variant: VariantDraft): string {
  const merged = mergeVariantDraftAttributes(variant);
  const entries = Object.entries(merged)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, value]) => [
      slug,
      Array.isArray(value) ? [...value].sort() : value,
    ]);
  return `${variant.gradeSlug}::${JSON.stringify(entries)}`;
}

export function ProductWizardStep2({
  isOpen,
  product,
  catalog,
  onClose,
  onSkip,
  onSaved,
  purpose = "wizard",
}: ProductWizardStep2Props) {
  const isManage = purpose === "manage";
  const { searchParams, replace } = useAdminUrlParams();
  const workspaceInitProductIdRef = useRef<string | null>(null);
  const toast = useToast();
  const [sections, setSections] = useState<GradeSectionState[]>([]);
  const [selectedGradeSlug, setSelectedGradeSlug] = useState<string | null>(null);
  const [selectedVariantUid, setSelectedVariantUid] = useState<string | null>(null);
  const [errors, setErrors] = useState<ProductValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const surface: CategorySurface | null = useMemo(() => {
    if (!product) return null;
    const category = catalog.categories.find((c) => c.slug === product.categorySlug);
    if (!category) return null;
    return {
      category,
      brands: catalog.brandsByCategory[product.categorySlug] ?? [],
      grades: catalog.gradesByCategory[product.categorySlug] ?? [],
      attributes: catalog.attributesByCategory[product.categorySlug] ?? [],
    };
  }, [product, catalog]);

  const grades = surface?.grades ?? [];
  const attributes = surface?.attributes ?? [];
  const errorMap = useMemo(() => errorsByPath(errors), [errors]);

  const resolveWorkspaceSelection = useCallback(
    (
      built: GradeSectionState[],
      categoryGrades: AdminGrade[],
      urlGrade: string | null,
      urlUid: string | null,
    ) => {
      const gradeFromUrl =
        urlGrade && built.some((row) => row.gradeSlug === urlGrade)
          ? urlGrade
          : null;
      const firstWithVariants = built.find((row) => row.combinations.length > 0);
      const gradeSlug =
        gradeFromUrl ??
        firstWithVariants?.gradeSlug ??
        categoryGrades[0]?.slug ??
        null;
      const section = built.find((row) => row.gradeSlug === gradeSlug);
      const uidFromUrl =
        urlUid && section?.combinations.some((row) => row.uid === urlUid)
          ? urlUid
          : null;
      const variantUid =
        uidFromUrl ?? section?.combinations[0]?.uid ?? null;
      return { gradeSlug, variantUid };
    },
    [],
  );

  const syncVariantWorkspaceUrl = useCallback(
    (gradeSlug: string | null, variantUid: string | null) => {
      if (!isManage) return;
      replace(
        {
          vgrade: gradeSlug,
          vuid: variantUid,
        },
        { historyOnly: true },
      );
    },
    [isManage, replace],
  );

  const resetWorkspace = useCallback(
    (
      nextProduct: AdminProduct,
      categoryGrades: AdminGrade[],
      urlGrade: string | null = null,
      urlUid: string | null = null,
    ) => {
      const built = buildGradeSections(nextProduct, categoryGrades);
      setSections(built);
      setErrors([]);
      const { gradeSlug, variantUid } = resolveWorkspaceSelection(
        built,
        categoryGrades,
        urlGrade,
        urlUid,
      );
      setSelectedGradeSlug(gradeSlug);
      setSelectedVariantUid(variantUid);
      syncVariantWorkspaceUrl(gradeSlug, variantUid);
    },
    [resolveWorkspaceSelection, syncVariantWorkspaceUrl],
  );

  useEffect(() => {
    if (!isOpen || !product) {
      if (!isOpen) workspaceInitProductIdRef.current = null;
      return;
    }
    if (workspaceInitProductIdRef.current === product.id) return;
    workspaceInitProductIdRef.current = product.id;

    const categoryGrades = catalog.gradesByCategory[product.categorySlug] ?? [];
    const urlGrade = isManage ? searchParams.get("vgrade") : null;
    const urlUid = isManage ? searchParams.get("vuid") : null;
    resetWorkspace(product, categoryGrades, urlGrade, urlUid);
    // Local selection is source of truth after init. `historyOnly` URL updates do
    // not refresh `useSearchParams`, so never mirror selection from stale params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id, catalog, resetWorkspace, isManage]);

  const flatCombinations = useMemo(() => {
    const rows: { gradeSlug: string; comboIndex: number; variant: VariantDraft }[] =
      [];
    for (const section of sections) {
      section.combinations.forEach((variant, comboIndex) => {
        rows.push({ gradeSlug: section.gradeSlug, comboIndex, variant });
      });
    }
    return rows;
  }, [sections]);

  const activeSection = sections.find(
    (section) => section.gradeSlug === selectedGradeSlug,
  );
  const activeVariants = activeSection?.combinations ?? [];
  const selectedVariant = activeVariants.find((row) => row.uid === selectedVariantUid);
  const selectedComboIndex = selectedVariant
    ? activeVariants.findIndex((row) => row.uid === selectedVariant.uid)
    : -1;

  const selectGrade = useCallback(
    (gradeSlug: string) => {
      setSelectedGradeSlug(gradeSlug);
      const section = sections.find((row) => row.gradeSlug === gradeSlug);
      const first = section?.combinations[0];
      const uid = first?.uid ?? null;
      setSelectedVariantUid(uid);
      syncVariantWorkspaceUrl(gradeSlug, uid);
    },
    [sections, syncVariantWorkspaceUrl],
  );

  function updateSection(
    gradeSlug: string,
    updater: (section: GradeSectionState) => GradeSectionState,
  ) {
    setSections((prev) =>
      prev.map((section) =>
        section.gradeSlug === gradeSlug ? updater(section) : section,
      ),
    );
  }

  function addCombination(gradeSlug: string) {
    const uid = newVariantUid();
    updateSection(gradeSlug, (section) => ({
      ...section,
      combinations: [
        ...section.combinations,
        { ...emptyVariantDraft(), uid, gradeSlug },
      ],
    }));
    setSelectedGradeSlug(gradeSlug);
    setSelectedVariantUid(uid);
    syncVariantWorkspaceUrl(gradeSlug, uid);
  }

  function updateCombination(
    gradeSlug: string,
    uid: string,
    next: VariantDraft,
  ) {
    const section = sections.find((row) => row.gradeSlug === gradeSlug);
    const comboIndex =
      section?.combinations.findIndex((row) => row.uid === uid) ?? -1;

    updateSection(gradeSlug, (row) => ({
      ...row,
      combinations: row.combinations.map((variant) =>
        variant.uid === uid ? { ...next, gradeSlug } : variant,
      ),
    }));

    if (comboIndex >= 0) {
      const errorPrefix = `grade.${gradeSlug}.combinations.${comboIndex}`;
      setErrors((prev) =>
        prev.filter((row) => !row.path.startsWith(errorPrefix)),
      );
    }
  }

  function removeCombination(gradeSlug: string, uid: string) {
    const section = sections.find((row) => row.gradeSlug === gradeSlug);
    if (!section) return;
    const index = section.combinations.findIndex((row) => row.uid === uid);
    const nextCombinations = section.combinations.filter((row) => row.uid !== uid);
    updateSection(gradeSlug, (row) => ({
      ...row,
      combinations: nextCombinations,
    }));
    if (selectedVariantUid === uid) {
      const neighbor =
        nextCombinations[index] ?? nextCombinations[index - 1] ?? null;
      const nextUid = neighbor?.uid ?? null;
      setSelectedVariantUid(nextUid);
      syncVariantWorkspaceUrl(gradeSlug, nextUid);
    }
  }

  function selectVariantUid(uid: string) {
    setSelectedVariantUid(uid);
    if (selectedGradeSlug) {
      syncVariantWorkspaceUrl(selectedGradeSlug, uid);
    }
  }

  function handleSkip() {
    if (submitting) return;
    onSkip();
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !product || !surface) return;

    if (flatCombinations.length === 0) {
      toast.danger("Add at least one variant in any grade, or skip for now.");
      return;
    }

    const seen = new Set<string>();
    for (const row of flatCombinations) {
      const template = { ...row.variant, gradeSlug: row.gradeSlug };
      const key = combinationSignature(template);
      if (seen.has(key)) {
        toast.danger("Two variants share the same grade and attributes.");
        return;
      }
      seen.add(key);
    }

    const variants = flatCombinations.map((row) => ({
      ...row.variant,
      gradeSlug: row.gradeSlug,
    }));

    const result = validateVariantDrafts(
      variants,
      surface,
      product.brand.slug,
      (index) => {
        const row = flatCombinations[index];
        return `grade.${row.gradeSlug}.combinations.${row.comboIndex}`;
      },
    );

    if (!result.ok) {
      setErrors(result.errors);
      toast.danger(
        result.errors.length === 1
          ? result.errors[0].message
          : `${result.errors.length} fields need attention.`,
      );
      return;
    }

    setErrors([]);
    setSubmitting(true);
    try {
      const keepVariantIds = new Set(
        variants.filter((row) => isValidId(row.uid)).map((row) => row.uid),
      );
      for (const existing of product.variants) {
        if (keepVariantIds.has(existing.id)) continue;
        await adminFetch<AdminProduct>(
          `/api/products/${product.id}/variants/${existing.id}`,
          { method: "DELETE" },
        );
      }

      for (let index = 0; index < result.payload.variants.length; index += 1) {
        const variant = result.payload.variants[index];
        const draftRow = variants[index];
        const payload = { ...variant };
        await (isValidId(draftRow.uid)
          ? adminFetch<AdminProduct>(
              `/api/products/${product.id}/variants/${draftRow.uid}`,
              { method: "PUT", json: payload },
            )
          : adminFetch<AdminProduct>(
              `/api/products/${product.id}/variants`,
              { method: "POST", json: payload },
            ));
      }
      const reloadedProduct = await adminFetch<AdminProduct>(
        `/api/products/${product.id}`,
      );
      const latest = reloadedProduct;
      const savedCount = result.payload.variants.length;
      toast.success(
        savedCount === 1
          ? "1 variation saved."
          : `${savedCount} variations saved.`,
      );
      const categoryGrades =
        catalog.gradesByCategory[product.categorySlug] ?? [];
      resetWorkspace(
        latest,
        categoryGrades,
        selectedGradeSlug,
        selectedVariantUid,
      );
      onSaved(latest);
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save variations.";
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!product) {
    return null;
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={isManage ? "Manage variants" : "Add variations"}
      description={
        isManage ? product.name : `Step 2 of 2 — ${product.name}`
      }
      width="2xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-0"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isManage && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              className="mr-auto"
            >
              Skip for now
            </Button>
          )}
          <Button variant="ghost" size="sm" type="button" onClick={handleClose} disabled={submitting}>
            {isManage ? "Close" : "Cancel"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="product-wizard-step2"
            isLoading={submitting}
          >
            {isManage ? "Save changes" : "Save variations"}
          </Button>
        </div>
      }
    >
      <form
        id="product-wizard-step2"
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        {grades.length === 0 ? (
          <div className="px-6 py-5">
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-600)]">
              This category has no grades yet. Define grades under{" "}
              <Link href="/categories?tab=grades" className="font-semibold underline">
                Categories → Grades
              </Link>{" "}
              or skip and add variants later.
            </p>
            <div className="mt-4">
              <WizardEmptyHint>
                Product <strong>{product.name}</strong> is saved.
              </WizardEmptyHint>
            </div>
          </div>
        ) : (
          <>
            <TabList
              compact
              fillWhenFew
              stretchThreshold={5}
              aria-label="Grades"
              className="shrink-0 bg-[var(--color-surface)]"
              tabs={[
                ...grades.map((grade) => {
                  const section = sections.find((row) => row.gradeSlug === grade.slug);
                  return {
                    id: grade.slug,
                    label: grade.label,
                    count: section?.combinations.length ?? 0,
                  };
                }),
                ...sections
                  .filter(
                    (section) =>
                      section.combinations.length > 0 &&
                      !grades.some((grade) => grade.slug === section.gradeSlug),
                  )
                  .map((section) => ({
                    id: section.gradeSlug,
                    label: section.gradeSlug,
                    count: section.combinations.length,
                  })),
              ]}
              activeId={selectedGradeSlug ?? grades[0]?.slug ?? ""}
              onChange={selectGrade}
            />

            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <aside className="flex w-[17.5rem] shrink-0 flex-col border-r border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-2.5 xl:w-80">
                <p className="pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  Variants
                </p>
                <nav
                  aria-label="Variants in grade"
                  className="-mx-0.5 min-h-0 flex-1 overflow-y-auto"
                >
                  {activeVariants.length === 0 ? (
                    <p className="px-1 py-2 text-[11px] text-[var(--color-ink-500)]">
                      No variants in this grade.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {activeVariants.map((variant) => (
                        <VariantSidebarTile
                          key={variant.uid}
                          variant={variant}
                          attributes={attributes}
                          isSelected={variant.uid === selectedVariantUid}
                          onSelect={() => selectVariantUid(variant.uid)}
                        />
                      ))}
                    </ul>
                  )}
                </nav>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="mt-2 w-full border-dashed"
                  leadingIcon={<Plus size={13} aria-hidden />}
                  disabled={!selectedGradeSlug}
                  onClick={() =>
                    selectedGradeSlug && addCombination(selectedGradeSlug)
                  }
                >
                  New variant
                </Button>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {!selectedGradeSlug ? (
                  <p className="p-3 text-sm text-[var(--color-ink-500)]">
                    Select a grade above.
                  </p>
                ) : !selectedVariant ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-[var(--color-ink-800)]">
                      No variant selected
                    </p>
                    <p className="mt-1 max-w-xs text-[12px] text-[var(--color-ink-500)]">
                      Add a variant for{" "}
                      {grades.find((row) => row.slug === selectedGradeSlug)?.label}{" "}
                      or pick one from the sidebar.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      type="button"
                      className="mt-4"
                      leadingIcon={<Plus size={13} aria-hidden />}
                      onClick={() => addCombination(selectedGradeSlug)}
                    >
                      Add variant
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                      <VariantCard
                        index={selectedComboIndex}
                        variant={selectedVariant}
                        grades={grades}
                        attributes={attributes}
                        brandSlug={product.brand.slug}
                        errorByPath={errorMap}
                        productNameForAlt={product.name}
                        lockGradeSlug={selectedGradeSlug}
                        errorPathPrefix={`grade.${selectedGradeSlug}.combinations.${selectedComboIndex}`}
                        allowMultiAttributeSelect
                        embedded
                        onChange={(next) =>
                          updateCombination(
                            selectedGradeSlug,
                            selectedVariant.uid,
                            next,
                          )
                        }
                        onRemove={() =>
                          removeCombination(selectedGradeSlug, selectedVariant.uid)
                        }
                      />
                    </div>
                    <VariantDetailFooter
                      variant={selectedVariant}
                      errorPathPrefix={`grade.${selectedGradeSlug}.combinations.${selectedComboIndex}`}
                      errorByPath={errorMap}
                      onChange={(next) =>
                        updateCombination(
                          selectedGradeSlug,
                          selectedVariant.uid,
                          next,
                        )
                      }
                      onRemove={() =>
                        removeCombination(selectedGradeSlug, selectedVariant.uid)
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </form>
    </Drawer>
  );
}
