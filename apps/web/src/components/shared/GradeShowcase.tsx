"use client";

import Link from "next/link";
import { Camera, PlayCircle, ShieldCheck } from "lucide-react";

import { formatWarrantyPeriod, resolveWarrantyDays, toYouTubeEmbedUrl, type Product } from "@store/shared";

import { GradeBadge } from "@/components/shared/GradeBadge";
import { StructuredContentFull } from "@/components/shared/StructuredContent";
import { gradeGlossaryHref } from "@/lib/catalog/glossaryPaths";
import { useSelectedVariantId } from "@/components/shared/VariantContext";
import { useGrade } from "@/lib/core/storefrontReferenceContext";
import { useGlobalEagerLoad } from "@/lib/useGlobalEagerLoad";

/**
 * Per-grade detail strip beneath a product's variants (notes, warranty, inspection video).
 */
interface GradeShowcaseProps {
	product: Product;
	variant?: "mobile" | "desktop";
}

export function GradeShowcase({ product, variant = "desktop" }: GradeShowcaseProps) {
	const selectedVariantId = useSelectedVariantId();
	const variants = product.variants;
	const selected = variants.find((candidate) => candidate.id === selectedVariantId) ?? null;
	const descriptor = useGrade(product.categorySlug, selected?.gradeSlug ?? "");

	if (!selected?.id || !descriptor) {
		return null;
	}

	/* Fallback hex is `--color-ink-700` so missing-data grades still stay
     inside the palette. */
	const accentColor = descriptor.color || "#1a3f44";
	const accentSoftBackground = `${hexToRgba(accentColor, 0.1)}`;

	if (variant === "mobile") {
		return (
			<section className="app-section cv-auto">
				<div className="app-section-eyebrow flex items-center justify-between gap-2">
					<span>Grade · {descriptor.label}</span>
					<Link
						href={gradeGlossaryHref(product.categorySlug, selected.gradeSlug)}
						className="tap text-[11px] font-medium text-[var(--color-accent-700)] underline-offset-2 hover:underline"
					>
						Learn more
					</Link>
				</div>
				{/* Concentric: inner GradeBullet --radius-md (8) + p-3.5 (14)
            content gutter → outer 22 ≈ --radius-2xl (24, within 2px). */}
				<div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
					<VideoFrame label={descriptor.label} accentColor={accentColor} videoUrl={descriptor.video} isCompact />
					<div className="space-y-3 p-3.5" style={{ backgroundColor: accentSoftBackground }}>
						<StructuredContentFull
							content={descriptor.content}
							fallback={descriptor.notes}
							iconColor={accentColor}
							iconSize={13}
							iconSizeClass="size-[13px]"
							className="max-w-prose text-[13px] leading-snug text-[var(--color-ink-700)]"
							bulletItemClassName="max-w-prose text-[12.5px] text-[var(--color-ink-700)]"
						/>
						<GradeBullet
							icon={<ShieldCheck size={13} />}
							title="Warranty on this unit"
							body={`${formatWarrantyPeriod(resolveWarrantyDays(selected))} warranty · 15-day moneyback guarantee.`}
						/>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="cv-auto mt-16 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-8">
			<VideoFrame label={descriptor.label} accentColor={accentColor} videoUrl={descriptor.video} />
			<div>
				<div className="flex items-center gap-3">
					<GradeBadge categorySlug={product.categorySlug} gradeSlug={selected.gradeSlug} size="md" />
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">Selected grade</p>
						<p className="text-2xl font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">{descriptor.label}</p>
						<Link
							href={gradeGlossaryHref(product.categorySlug, selected.gradeSlug)}
							className="tap mt-1 inline-block text-xs font-medium text-[var(--color-accent-700)] underline-offset-2 hover:underline"
						>
							What is {descriptor.label}?
						</Link>
					</div>
				</div>
				<StructuredContentFull
					content={descriptor.content}
					fallback={descriptor.notes}
					iconColor={accentColor}
					iconSize={14}
					iconSizeClass="size-[14px]"
					className="mt-4 max-w-prose text-base leading-relaxed text-[var(--color-ink-700)]"
					bulletItemClassName="max-w-prose text-[13.5px] text-[var(--color-ink-700)]"
				/>
				<div className="mt-5 grid grid-cols-1 gap-2.5">
					<GradeBullet
						icon={<ShieldCheck size={14} />}
						title="Warranty on this unit"
						body={`${formatWarrantyPeriod(resolveWarrantyDays(selected))} warranty · 15-day moneyback guarantee.`}
					/>
				</div>
			</div>
		</section>
	);
}

interface VideoFrameProps {
	label: string;
	accentColor: string;
	videoUrl?: string;
	isCompact?: boolean;
}

function VideoFrame({ label, accentColor, videoUrl, isCompact }: VideoFrameProps) {
	const embedUrl = toYouTubeEmbedUrl(videoUrl);
	const globalEager = useGlobalEagerLoad();
	return (
		<div className={`relative overflow-hidden bg-[var(--color-ink-900)] ${isCompact ? "aspect-video w-full" : "aspect-[4/3] rounded-[var(--radius-lg)]"}`}>
			{embedUrl ? (
				<iframe
					src={embedUrl}
					title={`${label} inspection video`}
					loading={globalEager ? "eager" : "lazy"}
					referrerPolicy="strict-origin-when-cross-origin"
					allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen
					className="absolute inset-0 size-full"
				/>
			) : videoUrl ? (
				<video src={videoUrl} controls preload="none" className="absolute inset-0 size-full object-cover" />
			) : (
				<>
					<div
						aria-hidden
						className="absolute inset-0 opacity-40"
						style={{
							backgroundImage:
								"radial-gradient(circle at 30% 30%, var(--color-on-dark-20), transparent 55%), radial-gradient(circle at 70% 70%, var(--color-on-dark-10), transparent 55%)",
						}}
					/>
					<div
						aria-hidden
						className="absolute inset-0"
						style={{
							backgroundImage:
								"linear-gradient(135deg, var(--color-on-dark-05) 0 1px, transparent 1px 14px), linear-gradient(45deg, var(--color-on-dark-05) 0 1px, transparent 1px 14px)",
						}}
					/>
					<div className="absolute inset-0 flex flex-col justify-between p-4 text-[var(--color-on-dark)]">
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-on-dark-25)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
								<Camera size={11} />
								Sample inspection
							</span>
							<span
								className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-on-dark)]"
								style={{ backgroundColor: accentColor }}
							>
								{label}
							</span>
						</div>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-[11px] text-[var(--color-on-dark-soft)]">
								<span className="size-1.5 animate-pulse rounded-full bg-[var(--color-danger-400)]" />
								REC · 00:14
							</div>
							<span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-dark-muted)]">In-store · Inspection</span>
						</div>
					</div>
					<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
						<button
							type="button"
							aria-label="Play sample inspection video"
							className="grid place-items-center rounded-full bg-[var(--color-on-dark-15)] p-3 text-[var(--color-on-dark)] transition hover:bg-[var(--color-on-dark-25)]"
						>
							<PlayCircle size={isCompact ? 32 : 44} strokeWidth={1.6} />
						</button>
					</div>
				</>
			)}
		</div>
	);
}

interface GradeBulletProps {
	icon: React.ReactNode;
	title: string;
	body: string;
}

function GradeBullet({ icon, title, body }: GradeBulletProps) {
	return (
		<div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-3">
			<span className="mt-0.5 text-[var(--color-accent-700)]">{icon}</span>
			<div className="min-w-0 flex-1">
				<p className="text-[13px] font-semibold text-[var(--color-ink-900)]">{title}</p>
				<p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-600)]">{body}</p>
			</div>
		</div>
	);
}

/** Convert `#rrggbb` to `rgba(r,g,b,a)` for soft background tints.
 *  Fallback is `--color-ink-700` (#1a3f44) so palette stays intact. */
function hexToRgba(hex: string, alpha: number): string {
	const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) {
		return `rgba(26,63,68,${alpha})`;
	}
	const num = Number.parseInt(match[1], 16);
	const r = (num >> 16) & 0xff;
	const g = (num >> 8) & 0xff;
	const b = num & 0xff;
	return `rgba(${r},${g},${b},${alpha})`;
}
