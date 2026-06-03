"use client";

import { ExternalLink, Eye, Globe2, ImagePlus, Smile, Sparkles } from "lucide-react";
import { STORE_SETTING_GROUPS } from "@store/shared";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { BrandImageUpload } from "@/components/shared/uploads/BrandImageUpload";
import { FormGrid, SettingsTabHero, type SettingsHeroMetric } from "@/app/settings/_components/settingsWorkspaceUi";
import { SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

export function StoreDetailsSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const hasName = draft.siteName.trim().length > 0;
  const hasTagline = draft.siteTagline.trim().length > 0;
  const hasUrl = draft.publicSiteUrl.trim().length > 0;
  const brandAssetCount = [
    draft.brandLogoLight,
    draft.brandLogoDark,
    draft.brandFaviconLight,
    draft.brandFaviconDark,
  ].filter((value) => value.trim().length > 0).length;
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Site name",
      value: hasName ? draft.siteName : "Not set",
      tone: hasName ? "good" : "warn",
      icon: Sparkles,
    },
    {
      label: "Tagline",
      value: hasTagline ? draft.siteTagline : "Not set",
      tone: hasTagline ? "good" : "warn",
      icon: Smile,
    },
    {
      label: "Storefront URL",
      value: hasUrl ? draft.publicSiteUrl : "Auto (env)",
      tone: hasUrl ? "good" : "neutral",
      icon: Globe2,
    },
    {
      label: "Brand assets",
      value: brandAssetCount > 0 ? `${brandAssetCount} of 4 uploaded` : "Wordmark only",
      hint:
        brandAssetCount === 0
          ? "Header & footer show the site name only"
          : brandAssetCount === 4
            ? "Logo + favicon in both light and dark"
            : "Some surfaces still fall back to the wordmark",
      tone: brandAssetCount === 4 ? "good" : brandAssetCount > 0 ? "neutral" : "off",
      icon: ImagePlus,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.branding}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={
        <SettingsTabHero
          metrics={heroMetrics}
          actions={
            hasUrl ? (
              <a
                href={draft.publicSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-800)] hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-800)]"
              >
                <Eye size={13} /> Open storefront
                <ExternalLink size={11} className="opacity-60" />
              </a>
            ) : null
          }
        />
      }
    >
      <FormSection
        title="Site identity"
        description="The name and tagline that show up across the storefront, page titles, and the AI assistant greeting."
      >
        <FormGrid>
          <TextField
            label="Site name"
            value={draft.siteName}
            onChange={(event) => setField("siteName", event.target.value)}
            placeholder="e.g. Ibrahim Mobiles"
            hint="Appears in the navbar, page titles, emails, and assistant greetings."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Storefront URL"
            type="url"
            value={draft.publicSiteUrl}
            onChange={(event) => setField("publicSiteUrl", event.target.value)}
            placeholder="https://ibrahimmobiles.com"
            inputMode="url"
            autoComplete="url"
            hint="Leave blank to fall back to the deploy environment URL."
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
        <TextArea
          label="Site tagline"
          rows={2}
          value={draft.siteTagline}
          onChange={(event) => setField("siteTagline", event.target.value)}
          placeholder="Short one-liner that sits under the site name."
          disabled={!canUpdate}
          containerClassName="max-w-2xl"
        />
      </FormSection>

      <FormSection
        title="Brand assets"
        description="Logo and favicon for light and dark surfaces. Leave any tile empty and the storefront falls back to the wordmark — no icon. Square-ish PNG/WebP transparent files render best."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <BrandImageUpload
            label="Logo · light surface"
            hint="Top header, login, light pages. Transparent background recommended."
            value={draft.brandLogoLight}
            onChange={(value) => setField("brandLogoLight", value)}
            previewTone="light"
            subjectKind="brand-logo-light"
            disabled={!canUpdate}
          />
          <BrandImageUpload
            label="Logo · dark surface"
            hint="Footer & any dark hero block. Falls back to the light logo if blank."
            value={draft.brandLogoDark}
            onChange={(value) => setField("brandLogoDark", value)}
            previewTone="dark"
            subjectKind="brand-logo-dark"
            disabled={!canUpdate}
          />
          <BrandImageUpload
            label="Favicon · light theme"
            hint="Browser tab icon for users on light system themes."
            value={draft.brandFaviconLight}
            onChange={(value) => setField("brandFaviconLight", value)}
            previewTone="light"
            subjectKind="brand-favicon-light"
            disabled={!canUpdate}
          />
          <BrandImageUpload
            label="Favicon · dark theme"
            hint="Browser tab icon for users on dark system themes."
            value={draft.brandFaviconDark}
            onChange={(value) => setField("brandFaviconDark", value)}
            previewTone="dark"
            subjectKind="brand-favicon-dark"
            disabled={!canUpdate}
          />
        </div>
      </FormSection>
    </SaveableSection>
  );
}
