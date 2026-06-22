"use client";

import { useGrade } from "@/lib/core/storefrontReferenceContext";
import { ColoredPill, type ColoredPillTone } from "@/components/shared/ColoredPill";

interface GradeBadgeProps {
	/** Owning category slug — `Variant.gradeSlug` is unique only within this scope. */
	categorySlug: string;
	/** The variant's grade slug. */
	gradeSlug: string;
	size?: "sm" | "md" | "lg";
	/**
	 * Light vs dark host surface. We default to a soft-tinted chip so that
	 * grids of mixed grades read as a calm palette instead of a rainbow.
	 * Pass `surface="dark"` when the badge sits on `--color-ink-900` (home
	 * grades band) so the tint flips for legibility.
	 */
	surface?: "light" | "dark";
	/** Force the loud full-saturation chip — reserved for hero / single-grade callouts. */
	tone?: ColoredPillTone;
	className?: string;
}

const SIZE_CLASSES = {
	sm: "h-5 min-w-5 px-1.5 text-[10px]",
	md: "h-6 min-w-6 px-2 text-[11px]",
	lg: "h-7 min-w-7 px-2.5 text-xs",
} as const;

/**
 * Renders a coloured chip for the variant's grade, using the admin-authored
 * label + hex colour from the `Grade` collection. Falls back gracefully to
 * the raw slug when the descriptor can't be resolved (storybook, brief
 * pre-hydration window) — the badge stays readable even with no data.
 */
export function GradeBadge({ categorySlug, gradeSlug, size = "md", surface = "light", tone, className }: GradeBadgeProps) {
	const descriptor = useGrade(categorySlug, gradeSlug);
	const label = descriptor?.label ?? gradeSlug;
	/* Fallback hex resolves to `--color-ink-700` so any grade missing
     metadata still reads inside the brand palette. */
	const color = descriptor?.color ?? "#1a3f44";

	const sizeClass = SIZE_CLASSES[size];
	const classes = ["justify-center rounded-[var(--radius-md)] font-bold uppercase tracking-tight leading-none shadow-[var(--shadow-sm)]", sizeClass, className]
		.filter(Boolean)
		.join(" ");

	const resolvedTone: ColoredPillTone = tone ?? (surface === "dark" ? "soft-dark" : "soft-light");

	return (
		<ColoredPill backgroundColor={color} tone={resolvedTone} className={classes} aria-label={`Grade ${label}`}>
			{label}
		</ColoredPill>
	);
}
