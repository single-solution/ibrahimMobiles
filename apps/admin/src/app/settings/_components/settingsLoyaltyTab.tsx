"use client";

import { Gift, Sparkles } from "lucide-react";
import { STORE_SETTING_GROUPS } from "@store/shared";
import { FormSection } from "@/components/forms/FormSection";
import { FormGrid, SettingsTabHero, type SettingsHeroMetric } from "@/app/settings/_components/settingsWorkspaceUi";
import { NumberField, SaveableSection } from "@/app/settings/_components/settingsSaveableSection";
import type { SectionProps } from "@/app/settings/_components/settingsSectionProps";

export function LoyaltySettings({ draft, saved, setField, onSaved, canUpdate }: SectionProps) {
  const heroMetrics: SettingsHeroMetric[] = [
    {
      label: "Earn rate",
      value: draft.loyaltyEarnPercent > 0 ? `${draft.loyaltyEarnPercent}% back` : "Off",
      hint: "Points awarded per Rupee on paid orders",
      tone: draft.loyaltyEarnPercent > 0 ? "good" : "off",
      icon: Gift,
    },
    {
      label: "Review bonus",
      value: `${draft.loyaltyReviewBonusPoints || 0} pts`,
      hint: "Awarded on verified reviews",
      tone: draft.loyaltyReviewBonusPoints > 0 ? "good" : "neutral",
      icon: Sparkles,
    },
    {
      label: "Referral bonus",
      value: `${draft.loyaltyReferralBonusPoints || 0} pts × 2`,
      hint: "Both sides on a successful referral",
      tone: draft.loyaltyReferralBonusPoints > 0 ? "good" : "neutral",
      icon: Gift,
    },
  ];
  return (
    <SaveableSection
      fields={STORE_SETTING_GROUPS.loyalty}
      draft={draft}
      saved={saved}
      setField={setField}
      onSaved={onSaved}
      canUpdate={canUpdate}
      hero={<SettingsTabHero metrics={heroMetrics} />}
    >
      <FormSection
        title="Loyalty programme"
        description="Earn rate and bonus values shown on the account dashboard and checkout."
      >
        <FormGrid cols={3}>
          <NumberField
            label="Earn rate (% of order total)"
            value={draft.loyaltyEarnPercent}
            onChange={(value) => setField("loyaltyEarnPercent", value)}
            trailingAddon="%"
            placeholder="e.g. 1"
            hint="Points earned per Rupee on a paid order."
            disabled={!canUpdate}
          />
          <NumberField
            label="Review bonus (pts)"
            value={draft.loyaltyReviewBonusPoints}
            onChange={(value) => setField("loyaltyReviewBonusPoints", value)}
            placeholder="e.g. 50"
            hint="Awarded once when a customer submits a verified review."
            disabled={!canUpdate}
          />
          <NumberField
            label="Referral bonus per side (pts)"
            value={draft.loyaltyReferralBonusPoints}
            onChange={(value) => setField("loyaltyReferralBonusPoints", value)}
            placeholder="e.g. 100"
            hint="Both the referrer and the new customer get this many points."
            disabled={!canUpdate}
          />
        </FormGrid>
      </FormSection>
    </SaveableSection>
  );
}
