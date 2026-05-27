"use client";

import { MapPin, Share2, Sparkles, Video } from "lucide-react";
import { STORE_SETTING_GROUPS } from "@store/shared";
import { FormSection } from "@/components/forms/FormSection";
import { TextField } from "@/components/forms/TextField";
import { FormGrid, SettingsTabHero, type SettingsHeroMetric, type SettingsHeroMetricTone } from "@/app/settings/_components/settingsWorkspaceUi";
import { SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

export function SocialSettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const tone = (value: string): SettingsHeroMetricTone => (value.trim() ? "good" : "off");
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Facebook",
      value: draft.socialFacebook ? "Linked" : "Off",
      tone: tone(draft.socialFacebook),
      icon: Share2,
    },
    {
      label: "Instagram",
      value: draft.socialInstagram ? "Linked" : "Off",
      tone: tone(draft.socialInstagram),
      icon: Share2,
    },
    {
      label: "TikTok",
      value: draft.socialTiktok ? "Linked" : "Off",
      tone: tone(draft.socialTiktok),
      icon: Sparkles,
    },
    {
      label: "YouTube",
      value: draft.socialYoutube ? "Linked" : "Off",
      tone: tone(draft.socialYoutube),
      icon: Video,
    },
    {
      label: "Maps",
      value: draft.socialGoogleMaps ? "Linked" : "Off",
      tone: tone(draft.socialGoogleMaps),
      icon: MapPin,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.social}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={
        <SettingsTabHero
          description="Linked profiles appear in the footer and on the About page. Leave a row blank to hide that platform."
          metrics={heroMetrics}
        />
      }
    >
      <FormSection title="Social profiles" description="Linked from the footer and about page.">
        <FormGrid>
          <TextField
            label="Facebook URL"
            type="url"
            value={draft.socialFacebook}
            onChange={(event) => setField("socialFacebook", event.target.value)}
            placeholder="https://facebook.com/yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Instagram URL"
            type="url"
            value={draft.socialInstagram}
            onChange={(event) => setField("socialInstagram", event.target.value)}
            placeholder="https://instagram.com/yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="TikTok URL"
            type="url"
            value={draft.socialTiktok}
            onChange={(event) => setField("socialTiktok", event.target.value)}
            placeholder="https://tiktok.com/@yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="YouTube URL"
            type="url"
            value={draft.socialYoutube}
            onChange={(event) => setField("socialYoutube", event.target.value)}
            placeholder="https://youtube.com/@yourstore"
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
          <TextField
            label="Google Maps URL"
            type="url"
            value={draft.socialGoogleMaps}
            onChange={(event) => setField("socialGoogleMaps", event.target.value)}
            placeholder="https://goo.gl/maps/…"
            hint="Used by the 'Get directions' link on the About page."
            inputMode="url"
            disabled={!canUpdate}
            containerClassName="max-w-md"
          />
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}
