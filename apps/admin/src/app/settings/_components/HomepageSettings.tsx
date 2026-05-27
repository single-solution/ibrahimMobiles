"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Loader2 } from "lucide-react";

import {
  STORE_SETTING_GROUPS,
  classNames,
  parseCsvList,
  type StoreSettings,
} from "@store/shared";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { useToast } from "@/components/ui/Toast";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import type { AdminCategory, AdminGrade } from "@/types/admin";

interface HomepageSettingsProps {
  draft: StoreSettings;
  saved: StoreSettings;
  setField<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]): void;
  onSaved(settings: StoreSettings): void;
  canUpdate: boolean;
  /**
   * Wrapper that owns the save/discard footer; injected from the parent
   * so this section keeps the same dirty-tracking semantics as every
   * other settings tab without duplicating the API call.
   */
  renderSaveable: (props: {
    fields: ReadonlyArray<keyof StoreSettings>;
    children: ReactNode;
  }) => ReactNode;
}

const HERO_LIMIT_MIN = 4;
const HERO_LIMIT_MAX = 24;

export function HomepageSettings({
  draft,
  setField,
  canUpdate,
  renderSaveable,
}: HomepageSettingsProps) {
  const toast = useToast();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [grades, setGrades] = useState<AdminGrade[]>([]);
  const [taxonomyState, setTaxonomyState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    let cancelled = false;
    scheduleStateUpdate(() => {
      setTaxonomyState("loading");
    });
    (async () => {
      try {
        const [catRes, gradeRes] = await Promise.all([
          fetch("/api/categories?limit=100"),
          fetch("/api/grades?limit=100"),
        ]);
        if (!catRes.ok || !gradeRes.ok) {
          throw new Error(
            `Taxonomy load failed (categories ${catRes.status}, grades ${gradeRes.status})`,
          );
        }
        const catBody = (await catRes.json()) as { items: AdminCategory[] };
        const gradeBody = (await gradeRes.json()) as { items: AdminGrade[] };
        if (cancelled) return;
        setCategories(catBody.items);
        setGrades(gradeBody.items);
        setTaxonomyState("ready");
      } catch (error) {
        if (cancelled) return;
        setTaxonomyState("error");
        toast.danger(
          error instanceof Error
            ? error.message
            : "Couldn't load categories and grades.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const selectedCategorySlugs = useMemo(
    () => new Set(parseCsvList(draft.homeHeroCategorySlugs)),
    [draft.homeHeroCategorySlugs],
  );
  const selectedGradeSlugs = useMemo(
    () => new Set(parseCsvList(draft.homeHeroGradeSlugs)),
    [draft.homeHeroGradeSlugs],
  );

  // Only show active categories — inactive ones aren't surfaced anywhere on
  // the storefront, so offering them here would just confuse the admin.
  const visibleCategories = useMemo(
    () =>
      categories
        .filter((cat) => cat.isActive)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [categories],
  );

  // Group grades by category to keep the picker scannable when a store has
  // many categories. We respect the visible-category set so a grade tied to
  // an archived category doesn't leak in via the picker.
  const gradesByCategory = useMemo(() => {
    const allowedSlugs = new Set(visibleCategories.map((c) => c.slug));
    const grouped = new Map<string, AdminGrade[]>();
    for (const grade of grades) {
      if (!allowedSlugs.has(grade.categorySlug)) continue;
      const bucket = grouped.get(grade.categorySlug) ?? [];
      bucket.push(grade);
      grouped.set(grade.categorySlug, bucket);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.label.localeCompare(b.label));
    }
    return grouped;
  }, [grades, visibleCategories]);

  const commitCsv = useCallback(
    (field: "homeHeroCategorySlugs" | "homeHeroGradeSlugs", slugs: string[]) => {
      const cleaned = Array.from(new Set(slugs.filter(Boolean))).sort();
      setField(field, cleaned.join(","));
    },
    [setField],
  );

  function toggleCategory(slug: string) {
    if (!canUpdate) return;
    const next = new Set(selectedCategorySlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    commitCsv("homeHeroCategorySlugs", Array.from(next));
    // Tidy up grade selections so we don't keep a slug from a category the
    // admin just removed from the hero scope. (The storefront filter still
    // does the right thing, but the chip would look stale.)
    if (!next.has(slug)) {
      const dropped = (gradesByCategory.get(slug) ?? []).map((g) => g.slug);
      if (dropped.length > 0) {
        const droppedSet = new Set(dropped);
        const survivors = Array.from(selectedGradeSlugs).filter((s) => {
          if (!droppedSet.has(s)) return true;
          // Keep a grade slug that's still reachable via another selected
          // category — the storefront grade filter is category-agnostic.
          const stillReachable = visibleCategories.some(
            (cat) =>
              next.has(cat.slug) &&
              (gradesByCategory.get(cat.slug) ?? []).some((g) => g.slug === s),
          );
          return stillReachable;
        });
        commitCsv("homeHeroGradeSlugs", survivors);
      }
    }
  }

  function toggleGrade(slug: string) {
    if (!canUpdate) return;
    const next = new Set(selectedGradeSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    commitCsv("homeHeroGradeSlugs", Array.from(next));
  }

  function clearCategories() {
    if (!canUpdate) return;
    commitCsv("homeHeroCategorySlugs", []);
    commitCsv("homeHeroGradeSlugs", []);
  }

  function clearGrades() {
    if (!canUpdate) return;
    commitCsv("homeHeroGradeSlugs", []);
  }

  const heroLimit = Number.isFinite(draft.homeHeroLimit)
    ? draft.homeHeroLimit
    : 12;
  const heroLimitClamped = Math.min(
    Math.max(Math.round(heroLimit), HERO_LIMIT_MIN),
    HERO_LIMIT_MAX,
  );
  const heroLimitInvalid = heroLimit !== heroLimitClamped;

  return (
    <>
      {renderSaveable({
        fields: STORE_SETTING_GROUPS.homepage,
        children: (
          <>
            <FormSection
              title="Hero gallery size"
              description="The fan-shaped gallery at the top of the storefront cycles through this many recently-updated, in-stock products."
            >
              <TextField
                label="Number of products"
                type="number"
                value={Number.isFinite(heroLimit) ? String(heroLimit) : ""}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setField(
                    "homeHeroLimit",
                    Number.isFinite(next) ? next : HERO_LIMIT_MIN,
                  );
                }}
                min={HERO_LIMIT_MIN}
                max={HERO_LIMIT_MAX}
                inputMode="numeric"
                placeholder="12"
                hint={`Between ${HERO_LIMIT_MIN} and ${HERO_LIMIT_MAX}. More products means a longer cycle and a slightly heavier first-paint.`}
                errorText={
                  heroLimitInvalid
                    ? `Will be clamped to ${heroLimitClamped} on save.`
                    : undefined
                }
                disabled={!canUpdate}
              />
            </FormSection>

            <FormSection
              title="Categories"
              description="Pick the categories the hero may pull from. Leave every chip unchecked to surface products from every active category."
            >
              <TaxonomyPickerHeader
                count={selectedCategorySlugs.size}
                total={visibleCategories.length}
                emptyMessage="All active categories"
                onClear={
                  selectedCategorySlugs.size > 0 ? clearCategories : undefined
                }
                canEdit={canUpdate}
              />
              {taxonomyState === "loading" ? (
                <TaxonomyPickerLoading />
              ) : taxonomyState === "error" ? (
                <TaxonomyPickerError message="Couldn't load categories." />
              ) : visibleCategories.length === 0 ? (
                <TaxonomyEmpty message="No active categories yet — add one in the Categories workspace." />
              ) : (
                <ChipGrid>
                  {visibleCategories.map((cat) => (
                    <SelectablePill
                      key={cat.slug}
                      label={cat.label}
                      meta={cat.slug}
                      selected={selectedCategorySlugs.has(cat.slug)}
                      onToggle={() => toggleCategory(cat.slug)}
                      disabled={!canUpdate}
                    />
                  ))}
                </ChipGrid>
              )}
            </FormSection>

            <FormSection
              title="Grades"
              description="Optional — when set, the hero only shows products with at least one variant in one of these grades. Useful for spotlighting your best stock."
            >
              <TaxonomyPickerHeader
                count={selectedGradeSlugs.size}
                total={Array.from(gradesByCategory.values()).reduce(
                  (sum, list) => sum + list.length,
                  0,
                )}
                emptyMessage="Any grade"
                onClear={selectedGradeSlugs.size > 0 ? clearGrades : undefined}
                canEdit={canUpdate}
              />
              {taxonomyState === "loading" ? (
                <TaxonomyPickerLoading />
              ) : taxonomyState === "error" ? (
                <TaxonomyPickerError message="Couldn't load grades." />
              ) : gradesByCategory.size === 0 ? (
                <TaxonomyEmpty message="No grades defined yet — open Categories → Grades to add some." />
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleCategories.map((cat) => {
                    const list = gradesByCategory.get(cat.slug);
                    if (!list || list.length === 0) return null;
                    return (
                      <div key={cat.slug} className="flex flex-col gap-1.5">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                          {cat.label}
                        </p>
                        <ChipGrid>
                          {list.map((grade) => (
                            <SelectablePill
                              key={`${cat.slug}-${grade.slug}`}
                              label={grade.label}
                              meta={grade.slug}
                              selected={selectedGradeSlugs.has(grade.slug)}
                              onToggle={() => toggleGrade(grade.slug)}
                              disabled={!canUpdate}
                            />
                          ))}
                        </ChipGrid>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>
          </>
        ),
      })}
    </>
  );
}

function ChipGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function SelectablePill({
  label,
  meta,
  selected,
  onToggle,
  disabled,
}: {
  label: string;
  meta?: string;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={classNames(
        "group inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        selected
          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-800)] shadow-[var(--shadow-sm)] ring-2 ring-[var(--color-accent-400)]/25"
          : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:border-[var(--color-accent-500)] hover:text-[var(--color-ink-900)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="truncate">{label}</span>
      {meta ? (
        <span
          className={classNames(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-mono tracking-wider uppercase",
            selected
              ? "bg-white/15 text-white/85"
              : "bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]",
          )}
        >
          {meta}
        </span>
      ) : null}
    </button>
  );
}

function TaxonomyPickerHeader({
  count,
  total,
  emptyMessage,
  onClear,
  canEdit,
}: {
  count: number;
  total: number;
  emptyMessage: string;
  onClear?: () => void;
  canEdit: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px] text-[var(--color-ink-500)]">
      <span>
        {count === 0 ? emptyMessage : `${count} of ${total} selected`}
      </span>
      {canEdit && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-[var(--color-accent-700)] hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function TaxonomyPickerLoading() {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas)] px-3 py-2.5 text-[11px] text-[var(--color-ink-500)]">
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Loading taxonomy…
    </div>
  );
}

function TaxonomyPickerError({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-rose-200 bg-rose-50/60 px-3 py-2.5 text-[11px] text-rose-700">
      {message}
    </div>
  );
}

function TaxonomyEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas)] px-3 py-2.5 text-[11px] text-[var(--color-ink-500)]">
      {message}
    </div>
  );
}
