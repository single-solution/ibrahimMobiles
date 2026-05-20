"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Drawer } from "@/components/Drawer";
import { VideoUpload } from "@/components/uploads";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { GRADE_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import type { AdminCategory, AdminGrade } from "@/types/admin";

import { PreviewPanel } from "./previewPanel";
import {
  GradeBadgePreview,
  GradeShowcasePreview,
  type GradeDraft,
} from "./previews";

interface GradeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  grade: AdminGrade | null;
  category: AdminCategory;
  onSaved: () => void;
}

interface FormState {
  label: string;
  notes: string;
  color: string;
  video: string;
}

function emptyForm(): FormState {
  return { label: "", notes: "", color: "#1f2937", video: "" };
}

function formFromGrade(grade: AdminGrade): FormState {
  return {
    label: grade.label,
    notes: grade.notes,
    color: grade.color,
    video: grade.video,
  };
}

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

export function GradeEditor({
  isOpen,
  onClose,
  grade,
  category,
  onSaved,
}: GradeEditorProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() =>
    grade ? formFromGrade(grade) : emptyForm(),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on drawer open; the drawer is the external system here
    setForm(grade ? formFromGrade(grade) : emptyForm());
  }, [isOpen, grade]);

  const deferredForm = useDeferredValue(form);
  const draft: GradeDraft = useMemo(
    () => ({
      label: deferredForm.label,
      notes: deferredForm.notes,
      color: deferredForm.color,
      video: deferredForm.video,
    }),
    [deferredForm],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!form.label.trim()) {
      toast.danger("Label is required.");
      return;
    }
    if (!form.notes.trim()) {
      toast.danger("Notes are required so customers know what to expect.");
      return;
    }
    if (!HEX_COLOR_REGEX.test(form.color)) {
      toast.danger("Color must be a #RRGGBB hex value.");
      return;
    }
    setSubmitting(true);
    try {
      if (grade) {
        await adminFetch<AdminGrade>(`/api/grades/${grade.id}`, {
          method: "PUT",
          json: {
            label: form.label.trim(),
            notes: form.notes.trim(),
            color: form.color,
            video: form.video.trim(),
          },
        });
        toast.success("Grade updated.");
      } else {
        await adminFetch<AdminGrade>("/api/grades", {
          method: "POST",
          json: {
            categorySlug: category.slug,
            label: form.label.trim(),
            notes: form.notes.trim(),
            color: form.color,
            video: form.video.trim(),
          },
        });
        toast.success("Grade created.");
      }
      onSaved();
      onClose();
    } catch (error) {
      const message =
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save grade.";
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={grade ? `Edit · ${grade.label}` : `New grade · ${category.label}`}
      description="Grade notes appear in the PDP showcase. A short inspection video builds trust before purchase."
      width="xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="grade-editor-form"
            disabled={submitting}
            className="rounded-md bg-[var(--color-accent-600)] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            {submitting ? "Saving…" : grade ? "Save changes" : "Create grade"}
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          id="grade-editor-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="grade-label"
              className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]"
            >
              Label
            </label>
            <input
              id="grade-label"
              type="text"
              value={form.label}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, label: e.target.value }))
              }
              maxLength={GRADE_FIELD_LIMITS.label}
              required
              className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[14px] focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label
                htmlFor="grade-notes"
                className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]"
              >
                Notes
              </label>
              <span className="text-[10.5px] text-[var(--color-ink-400)]">
                {form.notes.length}/{GRADE_FIELD_LIMITS.notes}
              </span>
            </div>
            <textarea
              id="grade-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              maxLength={GRADE_FIELD_LIMITS.notes}
              rows={6}
              required
              className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[13.5px] leading-relaxed focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="grade-color"
              className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]"
            >
              Badge color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="grade-color"
                type="color"
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                className="size-10 cursor-pointer rounded border border-[var(--color-ink-200)] bg-[var(--color-surface)]"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                pattern="#[0-9a-fA-F]{6}"
                maxLength={7}
                className="w-28 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[13px] uppercase focus:border-[var(--color-accent-500)] focus:outline-none"
              />
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white"
                style={{ backgroundColor: form.color }}
              >
                {form.label || "Grade"}
              </span>
            </div>
          </div>
          <VideoUpload
            value={form.video}
            onChange={(url) => setForm((prev) => ({ ...prev, video: url }))}
            subjectKind="grades"
            subjectId={`${category.slug}-${form.label || "new"}`}
            label="Inspection video"
            hint="Short walkaround so customers can see the grade in action (MP4 or WebM)."
          />
        </form>
        <PreviewPanel
          tiles={[
            {
              surfaceLabel: "Appears on: Product card badge",
              body: <GradeBadgePreview grade={draft} />,
            },
            {
              surfaceLabel: "Appears on: PDP grade showcase",
              body: <GradeShowcasePreview grade={draft} />,
            },
          ]}
        />
      </div>
    </Drawer>
  );
}
