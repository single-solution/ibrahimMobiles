"use client";

import { Truck } from "lucide-react";
import { FormSection } from "@/components/forms/FormSection";
import { SettingsTabHero, type SettingsHeroMetric } from "@/app/settings/_components/settingsWorkspaceUi";
import { NumberField, SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

export function DeliverySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const threshold = Math.max(0, Math.floor(draft.freeDeliveryThresholdRupees));
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Free delivery from",
      value: threshold > 0 ? `Rs ${threshold.toLocaleString("en-PK")}+` : "Disabled",
      hint: threshold > 0 ? "Cart totals above this ship free" : "Every order pays delivery",
      tone: threshold > 0 ? "good" : "off",
      icon: Truck,
    },
  ];
  return (
    <SaveableSection
      fields={["freeDeliveryThresholdRupees"] as const}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={<SettingsTabHero metrics={heroMetrics} />}
    >
      <FormSection
        title="Delivery rules"
        description="Free-delivery threshold applied to every storefront order."
      >
        <NumberField
          label="Free delivery over (Rs)"
          value={draft.freeDeliveryThresholdRupees}
          onChange={(value) => setField("freeDeliveryThresholdRupees", value)}
          trailingAddon="Rs"
          placeholder="e.g. 5000"
          hint="Cart totals at or above this amount ship for free. Set to 0 to charge delivery on every order."
          disabled={!canUpdate}
        />
      </FormSection>
    </SaveableSection>
  );
}
