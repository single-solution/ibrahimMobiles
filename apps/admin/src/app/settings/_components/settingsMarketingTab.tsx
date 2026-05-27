"use client";

import { Gauge, Share2, Sparkles } from "lucide-react";
import { STORE_SETTING_GROUPS } from "@store/shared";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { FormGrid, SettingsTabHero, type SettingsHeroMetric, type SettingsHeroMetricTone } from "@/app/settings/_components/settingsWorkspaceUi";
import { SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

const META_PIXEL_PATTERN = /^\d{6,20}$/;
const GA4_PATTERN = /^G-[A-Z0-9]{4,20}$/;
const GTM_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;
const TIKTOK_PATTERN = /^[A-Z0-9]{16,40}$/;

function pixelStatus(value: string, pattern: RegExp): {
  tone: SettingsHeroMetricTone;
  label: string;
  validation?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) return { tone: "off", label: "Off" };
  if (!pattern.test(trimmed)) {
    return { tone: "warn", label: "Invalid", validation: "Format doesn't match — pixel won't load." };
  }
  return { tone: "good", label: "Active" };
}

export function MarketingSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const meta = pixelStatus(draft.metaPixelId, META_PIXEL_PATTERN);
  const ga = pixelStatus(draft.googleAnalyticsId, GA4_PATTERN);
  const gtm = pixelStatus(draft.googleTagManagerId, GTM_PATTERN);
  const tiktok = pixelStatus(draft.tiktokPixelId, TIKTOK_PATTERN);
  const heroMetrics: SettingsHeroMetric[] = [
    { label: "Meta Pixel", value: meta.label, tone: meta.tone, icon: Share2 },
    { label: "Google Analytics 4", value: ga.label, tone: ga.tone, icon: Gauge },
    { label: "Tag Manager", value: gtm.label, tone: gtm.tone, icon: Gauge },
    { label: "TikTok Pixel", value: tiktok.label, tone: tiktok.tone, icon: Sparkles },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.marketing}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={
        <SettingsTabHero
          description="Pixel IDs are validated as you type. Empty fields stay disabled — no scripts are injected."
          metrics={heroMetrics}
        />
      }
    >
      <FormSection
        title="Tracking pixels"
        description="Paste each ID from its respective console. The storefront only loads pixels with valid IDs."
      >
        <FormGrid>
          <TextField
            label="Meta (Facebook) Pixel ID"
            value={draft.metaPixelId}
            onChange={(event) => setField("metaPixelId", event.target.value)}
            placeholder="e.g. 123456789012345"
            inputMode="numeric"
            hint="6–20 digits. Find it in Events Manager → Data sources."
            errorText={meta.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Google Analytics 4 measurement ID"
            value={draft.googleAnalyticsId}
            onChange={(event) => setField("googleAnalyticsId", event.target.value.toUpperCase())}
            placeholder="G-XXXXXXXXXX"
            hint="Looks like G- followed by 4–20 letters/digits."
            errorText={ga.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Google Tag Manager container ID"
            value={draft.googleTagManagerId}
            onChange={(event) => setField("googleTagManagerId", event.target.value.toUpperCase())}
            placeholder="GTM-XXXXXXX"
            hint="Use this if you'd rather drive tags through GTM."
            errorText={gtm.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="TikTok Pixel ID"
            value={draft.tiktokPixelId}
            onChange={(event) => setField("tiktokPixelId", event.target.value.toUpperCase())}
            placeholder="e.g. CXXXXXXXXXXXXXXXX"
            hint="16–40 alphanumeric characters. Found in TikTok Events Manager."
            errorText={tiktok.validation}
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}
