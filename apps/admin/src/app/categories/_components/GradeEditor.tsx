"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { StructuredContent } from "@store/shared";
import { emptyStructuredContent, normalizeStructuredContent, coloredPillStyle } from "@store/shared";

import { Button } from "@store/ui";
import { Drawer } from "@/components/ui/Drawer";
import { StructuredContentEditor } from "@/components/forms/StructuredContentEditor";
import { VideoUpload } from "@/components/shared/uploads";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/api";
import { GRADE_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import type { AdminCategory, AdminGrade } from "@/types/models";

import { PreviewPanel } from "./previewPanel";
import { GradeBadgePreview, GradeShowcasePreview, type GradeDraft } from "./previews";

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
	content: StructuredContent;
}

function emptyForm(): FormState {
	return {
		label: "",
		notes: "",
		color: "#1f2937",
		video: "",
		content: emptyStructuredContent(),
	};
}

function formFromGrade(grade: AdminGrade): FormState {
	return {
		label: grade.label,
		notes: grade.notes,
		color: grade.color,
		video: grade.video,
		content: normalizeStructuredContent(grade.content, grade.notes),
	};
}

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

export function GradeEditor({ isOpen, onClose, grade, category, onSaved }: GradeEditorProps) {
	const toast = useToast();
	const [form, setForm] = useState<FormState>(() => (grade ? formFromGrade(grade) : emptyForm()));
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
			content: deferredForm.content,
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
				await apiFetch<AdminGrade>(`/api/grades/${grade.id}`, {
					method: "PUT",
					json: {
						label: form.label.trim(),
						notes: form.notes.trim(),
						color: form.color,
						video: form.video.trim(),
						content: form.content,
					},
				});
				toast.success("Grade updated.");
			} else {
				await apiFetch<AdminGrade>("/api/grades", {
					method: "POST",
					json: {
						categorySlug: category.slug,
						label: form.label.trim(),
						notes: form.notes.trim(),
						color: form.color,
						video: form.video.trim(),
						content: form.content,
					},
				});
				toast.success("Grade created.");
			}
			onSaved();
			onClose();
		} catch (error) {
			const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Failed to save grade.";
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
					<Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>
						Cancel
					</Button>
					<Button variant="primary" size="sm" type="submit" form="grade-editor-form" isLoading={submitting}>
						{grade ? "Save changes" : "Create grade"}
					</Button>
				</div>
			}
		>
			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
				<form id="grade-editor-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div>
						<label htmlFor="grade-label" className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
							Label
						</label>
						<input
							id="grade-label"
							type="text"
							value={form.label}
							onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
							maxLength={GRADE_FIELD_LIMITS.label}
							required
							placeholder="e.g. Grade A, Pristine"
							autoComplete="off"
							className="block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[14px] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none"
						/>
					</div>
					<StructuredContentEditor
						value={form.content}
						onChange={(content) =>
							setForm((prev) => ({
								...prev,
								content,
								notes: content.summary.slice(0, GRADE_FIELD_LIMITS.notes),
							}))
						}
						summaryLabel="Notes"
						summaryPlaceholder="What customers can expect at this grade."
						summaryRows={5}
						maxSummaryLength={GRADE_FIELD_LIMITS.notes}
						bulletsHint="Optional bullets shown on the PDP grade showcase."
					/>
					<div>
						<label htmlFor="grade-color" className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
							Badge color
						</label>
						<div className="flex items-center gap-3">
							<input
								id="grade-color"
								type="color"
								value={form.color}
								onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
								className="size-10 cursor-pointer rounded border border-[var(--color-ink-200)] bg-[var(--color-surface)]"
							/>
							<input
								type="text"
								value={form.color}
								onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
								pattern="#[0-9a-fA-F]{6}"
								maxLength={7}
								placeholder="#1F2937"
								spellCheck={false}
								autoComplete="off"
								className="w-28 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-2 text-[13px] uppercase placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none"
							/>
							<span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]" style={coloredPillStyle(form.color)}>
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
