"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/Drawer";
import { Tabs } from "@/components/Tabs";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { SelectField } from "@/components/forms/SelectField";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import {
  CATEGORY_FIELD_LIMITS,
  GRADE_FIELD_LIMITS,
} from "@/lib/api/fieldLimits";
import type { AdminCategory, AdminGrade } from "@/types/admin";

interface CategoriesViewProps {
  categories: AdminCategory[];
  grades: AdminGrade[];
}

const GRADE_TONE_OPTIONS = [
  { value: "accent", label: "Accent (positive)" },
  { value: "neutral", label: "Neutral" },
  { value: "info", label: "Info (blue)" },
  { value: "warn", label: "Warn (amber)" },
  { value: "danger", label: "Danger (red)" },
  { value: "dark", label: "Dark (premium)" },
];

const TRUST_CHIPS_MAX_COUNT = CATEGORY_FIELD_LIMITS.trustChipCount;

export function CategoriesView({ categories, grades }: CategoriesViewProps) {
  return (
    <Tabs
      tabs={[
        {
          id: "categories",
          label: "Shop categories",
          count: categories.length,
          content: <CategoriesPanel categories={categories} grades={grades} />,
        },
        {
          id: "grades",
          label: "Condition grades",
          count: grades.length,
          content: <GradesPanel grades={grades} />,
        },
      ]}
    />
  );
}

function CategoriesPanel({
  categories,
  grades,
}: {
  categories: AdminCategory[];
  grades: AdminGrade[];
}) {
  const [editing, setEditing] = useState<AdminCategory | null>(null);

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs text-[var(--color-ink-500)]">
          Three fixed shop categories. Use the toggles to control which appear on the storefront,
          and edit the per-category copy + grade matrix.
        </p>

        <ul className="grid gap-3 md:grid-cols-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
                    {category.pluralLabel}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                    /shop/{category.pathSegment} · {category.isActive ? "active" : "hidden"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Edit category"
                  onClick={() => setEditing(category)}
                  className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
                >
                  <Pencil size={13} />
                </button>
              </div>
              <p className="mt-3 text-sm text-[var(--color-ink-700)]">{category.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {category.applicableGrades.map((gradeId) => {
                  const grade = grades.find((current) => current.grade === gradeId);
                  return (
                    <span
                      key={gradeId}
                      className="rounded-full bg-[var(--color-canvas-deep)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-700)]"
                    >
                      {grade?.shortLabel ?? gradeId}
                    </span>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {category.trustChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-ink-100)] px-2 py-0.5 text-[10px] text-[var(--color-ink-600)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editing ? (
        <CategoryDrawer
          category={editing}
          allGrades={grades}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

interface CategoryDrawerProps {
  category: AdminCategory;
  allGrades: AdminGrade[];
  onClose: () => void;
}

function CategoryDrawer({ category, allGrades, onClose }: CategoryDrawerProps) {
  const router = useRouter();
  const toast = useToast();

  const [label, setLabel] = useState(category.label);
  const [pluralLabel, setPluralLabel] = useState(category.pluralLabel);
  const [tagline, setTagline] = useState(category.tagline);
  const [emptyHint, setEmptyHint] = useState(category.emptyHint);
  const [isActive, setIsActive] = useState(category.isActive);
  const [applicableGrades, setApplicableGrades] = useState<string[]>(category.applicableGrades);
  const [trustChipsRaw, setTrustChipsRaw] = useState<string>(category.trustChips.join(", "));
  const [isSaving, setIsSaving] = useState(false);

  function toggleGrade(gradeId: string) {
    setApplicableGrades((current) =>
      current.includes(gradeId) ? current.filter((id) => id !== gradeId) : [...current, gradeId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const trustChips = trustChipsRaw
      .split(",")
      .map((chip) => chip.trim())
      .filter((chip) => chip.length > 0)
      .slice(0, TRUST_CHIPS_MAX_COUNT);
    try {
      await adminFetch(`/api/categories/${category.id}`, {
        method: "PUT",
        json: {
          label,
          pluralLabel,
          tagline,
          emptyHint,
          isActive,
          applicableGrades,
          trustChips,
        },
      });
      toast.success(`${pluralLabel} updated`);
      onClose();
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to update category");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={`Edit ${category.pluralLabel}`}
      description="Update the storefront copy and which grades show under this category."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="category-form"
            isLoading={isSaving}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Singular label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          required
          maxLength={CATEGORY_FIELD_LIMITS.label}
        />
        <TextField
          label="Plural label"
          value={pluralLabel}
          onChange={(event) => setPluralLabel(event.target.value)}
          required
          maxLength={CATEGORY_FIELD_LIMITS.label}
        />
        <TextArea
          label="Tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          rows={2}
          required
          maxLength={CATEGORY_FIELD_LIMITS.tagline}
        />
        <TextArea
          label="Empty hint"
          value={emptyHint}
          onChange={(event) => setEmptyHint(event.target.value)}
          rows={2}
          required
          maxLength={CATEGORY_FIELD_LIMITS.emptyHint}
          hint="Shown when a search returns no results in this category."
        />
        <TextField
          label="Trust chips"
          value={trustChipsRaw}
          onChange={(event) => setTrustChipsRaw(event.target.value)}
          hint="Comma-separated. Max 6 chips, 60 chars each."
        />

        <div className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]">
            Applicable grades
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-ink-500)]">
            Drives the grade filter on the storefront for this category.
          </p>
          <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {allGrades.map((grade) => {
              const isOn = applicableGrades.includes(grade.grade);
              return (
                <label
                  key={grade.grade}
                  className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2.5 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggleGrade(grade.grade)}
                    className="size-3.5 rounded border-[var(--color-ink-300)] accent-[var(--color-accent-700)]"
                  />
                  <span className="font-medium text-[var(--color-ink-900)]">{grade.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <Switch
          label="Active on storefront"
          description="Hidden categories are not browsable but admin-editable."
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </form>
    </Drawer>
  );
}

function GradesPanel({ grades }: { grades: AdminGrade[] }) {
  const [editing, setEditing] = useState<AdminGrade | null>(null);

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs text-[var(--color-ink-500)]">
          Six condition grades, ordered best → worst. Edit the labels and copy here — they appear
          on every product card and PDP across the storefront.
        </p>

        <ul className="grid gap-3 md:grid-cols-2">
          {grades.map((grade) => (
            <li
              key={grade.grade}
              className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
                    {grade.label}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                    {grade.shortLabel} · tone {grade.tone}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Edit grade"
                  onClick={() => setEditing(grade)}
                  className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
                >
                  <Pencil size={13} />
                </button>
              </div>
              <p className="mt-3 text-sm text-[var(--color-ink-700)]">{grade.description}</p>
              <dl className="mt-3 grid gap-2 text-xs">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                    Cosmetic
                  </dt>
                  <dd className="text-[var(--color-ink-700)]">{grade.cosmeticNotes}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                    Functional
                  </dt>
                  <dd className="text-[var(--color-ink-700)]">{grade.functionalNotes}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      {editing ? <GradeDrawer grade={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

interface GradeDrawerProps {
  grade: AdminGrade;
  onClose: () => void;
}

function GradeDrawer({ grade, onClose }: GradeDrawerProps) {
  const router = useRouter();
  const toast = useToast();

  const [label, setLabel] = useState(grade.label);
  const [shortLabel, setShortLabel] = useState(grade.shortLabel);
  const [description, setDescription] = useState(grade.description);
  const [cosmeticNotes, setCosmeticNotes] = useState(grade.cosmeticNotes);
  const [functionalNotes, setFunctionalNotes] = useState(grade.functionalNotes);
  const [tone, setTone] = useState<string>(grade.tone);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await adminFetch(`/api/grades/${grade.id}`, {
        method: "PUT",
        json: { label, shortLabel, description, cosmeticNotes, functionalNotes, tone },
      });
      toast.success(`${label} grade updated`);
      onClose();
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to update grade");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={`Edit ${grade.label}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="grade-form"
            isLoading={isSaving}
          >
            Save grade
          </Button>
        </div>
      }
    >
      <form id="grade-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          required
          maxLength={GRADE_FIELD_LIMITS.label}
        />
        <TextField
          label="Short label"
          value={shortLabel}
          onChange={(event) => setShortLabel(event.target.value)}
          required
          maxLength={GRADE_FIELD_LIMITS.shortLabel}
        />
        <TextArea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          required
          maxLength={GRADE_FIELD_LIMITS.description}
        />
        <TextArea
          label="Cosmetic notes"
          value={cosmeticNotes}
          onChange={(event) => setCosmeticNotes(event.target.value)}
          rows={2}
          required
          maxLength={GRADE_FIELD_LIMITS.cosmeticNotes}
        />
        <TextArea
          label="Functional notes"
          value={functionalNotes}
          onChange={(event) => setFunctionalNotes(event.target.value)}
          rows={2}
          required
          maxLength={GRADE_FIELD_LIMITS.functionalNotes}
        />
        <SelectField
          label="Tone"
          value={tone}
          onChange={(event) => setTone(event.target.value)}
          options={GRADE_TONE_OPTIONS}
          hint="Colors the badge across the storefront."
        />
      </form>
    </Drawer>
  );
}
