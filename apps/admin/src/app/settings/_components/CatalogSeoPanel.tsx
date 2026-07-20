"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "@store/ui";
import type { SeoMeta } from "@store/shared";

import { resolveCatalogSeo, type CatalogSeoInput } from "@/lib/seo/resolveCatalogSeo";
import { useSeoSettings } from "@/lib/seo/useSeoSettings";
import { apiFetch, ApiError } from "@/lib/api";
import { SeoChecklistView } from "@/app/settings/_components/SeoChecklistView";
import { SeoPanel } from "@/app/settings/_components/SeoPanel";
import { SerpPreview } from "@/app/settings/_components/SerpPreview";
import { SocialPreview } from "@/app/settings/_components/SocialPreview";
import { useToast } from "@/components/ui/Toast";

interface CatalogSeoPanelProps {
	value: SeoMeta;
	onChange: (next: SeoMeta) => void;
	entity: CatalogSeoInput;
	contextLabel?: string;
	productId?: string;
	onSeoRegenerated?: (seo: SeoMeta) => void;
}

function generationBadge(value: SeoMeta, entityType: CatalogSeoInput["type"]): React.ReactNode {
	if (entityType !== "product") {
		return null;
	}
	const hasTitleOverride = Boolean(value.title?.trim());
	const hasDescriptionOverride = Boolean(value.description?.trim());
	if (hasTitleOverride || hasDescriptionOverride) {
		return (
			<p className="text-xs text-[var(--color-ink-500)]">
				{hasTitleOverride && hasDescriptionOverride ? "Manual overrides active" : "Partial override — blank fields stay auto-generated"}
			</p>
		);
	}
	if (value.aiGeneratedAt) {
		return <p className="inline-flex rounded-full bg-[var(--color-canvas-deep)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent-800)]">AI-generated</p>;
	}
	return <p className="inline-flex rounded-full bg-[var(--color-canvas-deep)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent-800)]">Auto-generated from catalog data</p>;
}

export function CatalogSeoPanel({ value, onChange, entity, contextLabel, productId, onSeoRegenerated }: CatalogSeoPanelProps) {
	const toast = useToast();
	const [regenerating, setRegenerating] = useState(false);
	const { settings, loading } = useSeoSettings();
	const deferredEntity = useDeferredValue(entity);

	const preview = useMemo(() => {
		if (!settings) {
			return null;
		}
		return resolveCatalogSeo(deferredEntity, value, settings);
	}, [deferredEntity, value, settings]);

	const resolved = preview?.resolved;
	const checklist = preview?.checklist;

	async function handleRegenerate() {
		if (!productId || regenerating) {
			return;
		}
		setRegenerating(true);
		try {
			const result = await apiFetch<{
				ok: boolean;
				source: "ai" | "formula";
				message?: string;
				seo: SeoMeta;
			}>(`/api/products/${productId}/seo/regenerate`, { method: "POST" });
			onChange(result.seo);
			onSeoRegenerated?.(result.seo);
			if (result.source === "ai") {
				toast.success("SEO copy regenerated with AI.");
			} else {
				toast.info(result.message ?? "Formula SEO copy refreshed.");
			}
		} catch (error) {
			toast.danger(error instanceof ApiError ? error.message : "Failed to regenerate SEO.");
		} finally {
			setRegenerating(false);
		}
	}

	const previewSlot =
		resolved && settings ? (
			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					{generationBadge(value, entity.type)}
					{productId ? (
						<Button type="button" variant="secondary" size="sm" isLoading={regenerating} onClick={handleRegenerate}>
							Regenerate
						</Button>
					) : null}
				</div>
				{checklist ? <SeoChecklistView result={checklist} /> : null}
				<div className="grid gap-4 lg:grid-cols-2">
					<SerpPreview resolved={resolved} siteUrl={settings.siteUrl} />
					<SocialPreview resolved={resolved} siteUrl={settings.siteUrl} />
				</div>
			</div>
		) : loading ? (
			<p className="text-xs text-[var(--color-ink-500)]">Loading SEO preview…</p>
		) : null;

	return <SeoPanel value={value} onChange={onChange} contextLabel={contextLabel} previewSlot={previewSlot} checklist={checklist} />;
}
