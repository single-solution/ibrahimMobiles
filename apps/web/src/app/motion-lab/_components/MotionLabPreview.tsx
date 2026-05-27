"use client";

import { PresetCalmCinematic } from "./presets/PresetCalmCinematic";
import { PresetGeometricMesh } from "./presets/PresetGeometricMesh";
import { PresetHybridPremium } from "./presets/PresetHybridPremium";
import { PresetKineticPunch } from "./presets/PresetKineticPunch";
import { PresetScrollStory } from "./presets/PresetScrollStory";

export function MotionLabPreview({ presetId }: { presetId: string }) {
  switch (presetId) {
    case "calm-cinematic":
      return <PresetCalmCinematic />;
    case "kinetic-punch":
      return <PresetKineticPunch />;
    case "hybrid-premium":
      return <PresetHybridPremium />;
    case "geometric-mesh":
      return <PresetGeometricMesh />;
    case "scroll-story":
      return <PresetScrollStory />;
    default:
      return (
        <p className="p-8 text-center text-sm text-[var(--color-ink-500)]">
          Unknown preset.
        </p>
      );
  }
}
