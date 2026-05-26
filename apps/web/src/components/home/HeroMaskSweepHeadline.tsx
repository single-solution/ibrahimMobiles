/**
 * Hero lockup — INSPECTED (outline, smaller) + TRUSTED (pakGreen fill,
 * larger). A single lime bar sweeps L→R on both lines in sync: erases the
 * strong outline on INSPECTED while painting the fill onto TRUSTED.
 * Both words use scaleY(1.4) anchored outward so they never collide.
 *
 * Typography: system grotesque stack (SF Pro on Apple, Segoe UI on
 * Windows, Roboto on Android, Inter elsewhere) at weight 900. We
 * intentionally avoid the storefront sans (`var(--font-sans)` →
 * Bricolage Grotesque) because its weight axis caps at 800. The
 * display token (Anton) is wrong too — tall condensed face, not a
 * grotesque.
 *
 * WebKit text-stroke is applied via inline style because the Tailwind
 * arbitrary class `[-webkit-text-stroke:...]` is parsed as a
 * negative-prefixed class and doesn't emit the property.
 */

import type { CSSProperties } from "react";

const HEADLINE_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Inter", Roboto, system-ui, sans-serif';

type HeroMaskVariant = "mobile" | "desktop";

interface HeroMaskSweepHeadlineProps {
  variant: HeroMaskVariant;
}

interface WordSpec {
  fontSize: number;
  letterSpacing: string;
}

/** Vertical stretch on each word — doubled-up scale that gives the
 *  poster look without growing the type horizontally. */
const SCALE_Y = 1.4;
/** Matches `line-height` on `baseStyle`. */
const LINE_HEIGHT = 0.86;

/**
 * scaleY visually extends the rendered glyph past its layout box.
 * Without compensation, the flex parent's `justify-evenly` measures
 * the unscaled box and leaves a smaller visual gap above `Inspected.`
 * (origin: bottom → overflow upward) and below `Trusted.` (origin:
 * top → overflow downward) than between the other groups. We push
 * the layout box out by the exact overflow amount so the rendered
 * headline claims its true visual footprint.
 */
function scaleOverflow(fontSize: number): number {
  return Math.ceil(fontSize * LINE_HEIGHT * (SCALE_Y - 1));
}

/**
 * Mobile sizing is constrained by physical viewport width. `TRUSTED`
 * uses `whiteSpace: nowrap`, so its rendered width must fit inside
 * `min(viewport_width) - 2 * section_padding_x`. With the section's
 * `px-4` (16px each side) and a 360px minimum viewport (iPhone 12
 * mini), available content width is ~328px. SF Pro Display Black at
 * weight 900 renders 7 caps × ~0.6em wide; with -0.07em tracking,
 * `TRUSTED` at fontSize 84 lands at ~322px — fits with a small
 * margin. Desktop sizes are unchanged from the canvas-approved
 * layout.
 */
/** Outline word only — tracking notably looser than TRUSTED so the
 *  small counter in "P" stays clear of neighbouring S/E strokes at
 *  weight 900 (transparent fill means any overlap reads as a visible
 *  intersection inside the bowl). TRUSTED keeps the tight -0.07em
 *  for narrow viewports because it's filled and overlaps just merge. */
const INSPECTED_SPEC: Record<HeroMaskVariant, WordSpec> = {
  mobile: { fontSize: 54, letterSpacing: "-0.01em" },
  desktop: { fontSize: 104, letterSpacing: "-0.02em" },
};

const TRUSTED_SPEC: Record<HeroMaskVariant, WordSpec> = {
  mobile: { fontSize: 84, letterSpacing: "-0.07em" },
  desktop: { fontSize: 168, letterSpacing: "-0.04em" },
};

function baseStyle(spec: WordSpec): CSSProperties {
  return {
    fontFamily: HEADLINE_FONT_STACK,
    fontWeight: 900,
    textTransform: "uppercase",
    lineHeight: 0.86,
    whiteSpace: "nowrap",
    display: "block",
    fontSize: spec.fontSize,
    letterSpacing: spec.letterSpacing,
  };
}

function outlineStyle(spec: WordSpec, strokeWidth: number, opacity = 1): CSSProperties {
  return {
    ...baseStyle(spec),
    color: "transparent",
    WebkitTextStroke: `${strokeWidth}px var(--color-ink-900)`,
    paintOrder: "stroke fill",
    opacity,
  };
}

function fillStyle(spec: WordSpec): CSSProperties {
  return {
    ...baseStyle(spec),
    color: "var(--color-pak-green)",
  };
}

function MaskSweepLine({
  mode,
  ghostStyle,
  fullStyle,
  children,
}: {
  mode: "paint" | "erase";
  ghostStyle: CSSProperties;
  fullStyle: CSSProperties;
  children: string;
}) {
  const fullAnim =
    mode === "paint" ? "hero-mask-sweep__full--paint" : "hero-mask-sweep__full--erase";

  return (
    <span className="hero-mask-sweep-line relative inline-block" aria-hidden>
      <span style={ghostStyle}>{children}</span>
      <span
        className={`hero-mask-sweep__full absolute inset-0 ${fullAnim}`}
        style={fullStyle}
      >
        {children}
      </span>
      <span className="hero-mask-sweep__bar" />
    </span>
  );
}

export function HeroMaskSweepHeadline({ variant }: HeroMaskSweepHeadlineProps) {
  const inspectedSpec = INSPECTED_SPEC[variant];
  const trustedSpec = TRUSTED_SPEC[variant];

  return (
    <h1 className="flex flex-col items-center">
      <span className="sr-only">Inspected Trusted</span>
      <span
        className="inline-block"
        style={{
          transform: `scaleY(${SCALE_Y})`,
          transformOrigin: "50% 100%",
          marginTop: scaleOverflow(inspectedSpec.fontSize),
        }}
      >
        <MaskSweepLine
          mode="erase"
          ghostStyle={outlineStyle(inspectedSpec, variant === "mobile" ? 0.8 : 1, 0.35)}
          fullStyle={outlineStyle(inspectedSpec, variant === "mobile" ? 1 : 1.4)}
        >
          Inspected
        </MaskSweepLine>
      </span>
      <span
        className="inline-block"
        style={{
          transform: `scaleY(${SCALE_Y})`,
          transformOrigin: "50% 0%",
          marginBottom: scaleOverflow(trustedSpec.fontSize),
        }}
      >
        <MaskSweepLine
          mode="paint"
          ghostStyle={outlineStyle(trustedSpec, variant === "mobile" ? 1 : 1.4, 0.35)}
          fullStyle={fillStyle(trustedSpec)}
        >
          Trusted
        </MaskSweepLine>
      </span>
    </h1>
  );
}
