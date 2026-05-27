"use client";

import { useDeferredValue, useMemo } from "react";

import type { SeoMeta } from "@store/shared";
import { seoScoreTone } from "@store/shared";
import { classNames } from "@store/shared";

import {
  resolveCatalogSeo,
  type CatalogSeoInput,
} from "@/lib/seo/resolveCatalogSeo";
import { useSeoSettings } from "@/lib/seo/useSeoSettings";
import { SeoChecklistView } from "@/app/settings/_components/SeoChecklistView";
import { SeoPanel } from "@/app/settings/_components/SeoPanel";
import { SerpPreview } from "@/app/settings/_components/SerpPreview";

interface CatalogSeoPanelProps {
  value: SeoMeta;
  onChange: (next: SeoMeta) => void;
  entity: CatalogSeoInput;
  contextLabel?: string;
}

export function CatalogSeoPanel({
  value,
  onChange,
  entity,
  contextLabel,
}: CatalogSeoPanelProps) {
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

  const scoreBadge =
    checklist && settings ? (
      <span
        className={classNames(
          "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
          seoScoreTone(checklist.score) === "success"
            ? "bg-emerald-100 text-emerald-800"
            : seoScoreTone(checklist.score) === "warn"
              ? "bg-amber-100 text-amber-800"
              : "bg-rose-100 text-rose-800",
        )}
      >
        {checklist.score}
      </span>
    ) : null;

  const previewSlot =
    resolved && settings ? (
      <div className="space-y-3">
        <SerpPreview resolved={resolved} siteUrl={settings.siteUrl} />
        {checklist ? <SeoChecklistView result={checklist} /> : null}
      </div>
    ) : loading ? (
      <p className="text-xs text-[var(--color-ink-500)]">Loading SEO preview…</p>
    ) : null;

  return (
    <SeoPanel
      value={value}
      onChange={onChange}
      contextLabel={contextLabel}
      previewSlot={previewSlot}
      headerExtra={scoreBadge}
    />
  );
}
