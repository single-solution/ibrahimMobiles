"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/admin/Tabs";
import { Drawer } from "@/components/admin/Drawer";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { SelectField } from "@/components/admin/forms/SelectField";
import { useToast } from "@/components/admin/Toast";
import type { GradeDescriptor, StockTypeDescriptor } from "@/types";

interface TaxonomiesViewProps {
  grades: GradeDescriptor[];
  stockTypes: StockTypeDescriptor[];
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "var(--color-grade-aplus)",
  A: "var(--color-grade-a)",
  B: "var(--color-grade-b)",
  C: "var(--color-grade-c)",
};

const TONE_COLORS: Record<StockTypeDescriptor["tone"], string> = {
  accent: "var(--color-accent-600)",
  neutral: "#94a3b8",
  info: "#0284c7",
  warn: "#d97706",
  danger: "#dc2626",
  dark: "var(--color-ink-900)",
};

export function TaxonomiesView({ grades, stockTypes }: TaxonomiesViewProps) {
  const [editingGrade, setEditingGrade] = useState<GradeDescriptor | null>(null);
  const [editingStock, setEditingStock] = useState<StockTypeDescriptor | null>(null);
  const toast = useToast();

  return (
    <>
      <Tabs
        tabs={[
          {
            id: "grades",
            label: "Condition grades",
            count: grades.length,
            content: (
              <ul className="grid gap-3 md:grid-cols-2">
                {grades.map((grade) => (
                  <li
                    key={grade.grade}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid size-9 place-items-center rounded-[var(--radius-md)] text-sm font-bold text-white"
                          style={{ backgroundColor: GRADE_COLORS[grade.grade] }}
                        >
                          {grade.grade}
                        </span>
                        <div>
                          <p className="text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
                            {grade.shortLabel}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                            Grade {grade.grade}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Edit grade"
                        onClick={() => setEditingGrade(grade)}
                        className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-ink-700)]">
                      {grade.description}
                    </p>
                    <dl className="mt-3 grid gap-2 text-xs">
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                          Cosmetic
                        </dt>
                        <dd className="text-[var(--color-ink-700)]">{grade.cosmeticNotes}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                          Functional
                        </dt>
                        <dd className="text-[var(--color-ink-700)]">{grade.functionalNotes}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: "stock-types",
            label: "Stock types",
            count: stockTypes.length,
            content: (
              <ul className="grid gap-3 md:grid-cols-2">
                {stockTypes.map((stockType) => (
                  <li
                    key={stockType.stockType}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: TONE_COLORS[stockType.tone] }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                            {stockType.label}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                            {stockType.shortLabel} · tone {stockType.tone}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Edit stock type"
                        onClick={() => setEditingStock(stockType)}
                        className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-ink-700)]">
                      {stockType.description}
                    </p>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />

      <Drawer
        isOpen={editingGrade !== null}
        onClose={() => setEditingGrade(null)}
        title={editingGrade ? `Edit grade ${editingGrade.grade}` : ""}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditingGrade(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => {
                toast.success(`Grade ${editingGrade?.grade} updated`);
                setEditingGrade(null);
              }}
            >
              Save grade
            </Button>
          </div>
        }
      >
        {editingGrade && (
          <div className="space-y-4">
            <TextField label="Short label" defaultValue={editingGrade.shortLabel} />
            <TextArea label="Description" defaultValue={editingGrade.description} rows={2} />
            <TextArea label="Cosmetic notes" defaultValue={editingGrade.cosmeticNotes} rows={2} />
            <TextArea
              label="Functional notes"
              defaultValue={editingGrade.functionalNotes}
              rows={2}
            />
          </div>
        )}
      </Drawer>

      <Drawer
        isOpen={editingStock !== null}
        onClose={() => setEditingStock(null)}
        title={editingStock ? `Edit ${editingStock.label}` : ""}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditingStock(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => {
                toast.success(`${editingStock?.label} stock type updated`);
                setEditingStock(null);
              }}
            >
              Save stock type
            </Button>
          </div>
        }
      >
        {editingStock && (
          <div className="space-y-4">
            <TextField label="Label" defaultValue={editingStock.label} />
            <TextField label="Short label" defaultValue={editingStock.shortLabel} />
            <TextArea label="Description" defaultValue={editingStock.description} rows={3} />
            <SelectField
              label="Tone"
              defaultValue={editingStock.tone}
              options={[
                { value: "accent", label: "Accent (positive)" },
                { value: "neutral", label: "Neutral" },
                { value: "info", label: "Info (blue)" },
                { value: "warn", label: "Warn (amber)" },
                { value: "danger", label: "Danger (red)" },
                { value: "dark", label: "Dark (premium)" },
              ]}
              hint="Colors the badge across the storefront."
            />
          </div>
        )}
      </Drawer>
    </>
  );
}
