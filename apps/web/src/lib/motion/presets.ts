export type MotionStyleTag = "scroll-cinematic" | "kinetic-type" | "geometric";
export type MotionVibeTag = "calm" | "punchy" | "editorial" | "hybrid";

export interface MotionPresetMeta {
  id: string;
  name: string;
  tagline: string;
  styles: MotionStyleTag[];
  vibe: MotionVibeTag;
  /** What you'll feel when this wins site-wide. */
  bestFor: string;
}

export const MOTION_PRESETS: MotionPresetMeta[] = [
  {
    id: "calm-cinematic",
    name: "Calm cinematic",
    tagline: "Slow parallax, breathing space, premium trust.",
    styles: ["scroll-cinematic"],
    vibe: "calm",
    bestFor: "Hero + product trust — feels expensive and honest.",
  },
  {
    id: "kinetic-punch",
    name: "Kinetic punch",
    tagline: "Letters slam in fast — bold, modern, confident.",
    styles: ["kinetic-type"],
    vibe: "punchy",
    bestFor: "Headlines and CTAs — memorable first impression.",
  },
  {
    id: "hybrid-premium",
    name: "Hybrid premium",
    tagline: "Calm type + living geometry — our recommended blend.",
    styles: ["kinetic-type", "geometric"],
    vibe: "hybrid",
    bestFor: "Whole storefront — light but stands out.",
  },
  {
    id: "geometric-mesh",
    name: "Geometric mesh",
    tagline: "Morphing gradients + grid lines — tech-forward calm.",
    styles: ["geometric"],
    vibe: "editorial",
    bestFor: "Backgrounds site-wide — always alive, never loud.",
  },
  {
    id: "scroll-story",
    name: "Scroll story",
    tagline: "Headline morphs as you scroll — one hero, many promises.",
    styles: ["scroll-cinematic", "kinetic-type"],
    vibe: "calm",
    bestFor: "Homepage hero only — Apple-style narrative.",
  },
];

export const MOTION_LAB_STORAGE_KEY = "ibrahim-mobiles-motion-preset";
