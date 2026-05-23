/**
 * WCAG relative luminance helpers for colored pills (grade + attribute chips).
 * Picks light or dark label text based on background brightness.
 */

const DEFAULT_LIGHT_TEXT = "#ffffff";
const DEFAULT_DARK_TEXT = "#111827";

/** Luminance threshold — below this, use light (white) text. */
const DEFAULT_LUMINANCE_THRESHOLD = 0.45;

export interface ContrastTextOptions {
  lightText?: string;
  darkText?: string;
  /** 0–1; lower = more backgrounds count as "dark". Default 0.45. */
  threshold?: number;
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/**
 * Parses `#rgb` or `#rrggbb` (optional alpha ignored). Returns null if invalid.
 */
export function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const trimmed = input.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (!match) {
    return null;
  }
  const hex = match[1];
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/** `true` when the hex background is dark enough for light (white) label text. */
export function isDarkHexColor(
  backgroundColor: string,
  threshold = DEFAULT_LUMINANCE_THRESHOLD,
): boolean {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) {
    return false;
  }
  return relativeLuminance(rgb.r, rgb.g, rgb.b) < threshold;
}

/** Returns `#ffffff` or `#111827` (overridable) for readable pill labels. */
export function contrastTextColorForBackground(
  backgroundColor: string,
  options?: ContrastTextOptions,
): string {
  const threshold = options?.threshold ?? DEFAULT_LUMINANCE_THRESHOLD;
  const lightText = options?.lightText ?? DEFAULT_LIGHT_TEXT;
  const darkText = options?.darkText ?? DEFAULT_DARK_TEXT;
  return isDarkHexColor(backgroundColor, threshold) ? lightText : darkText;
}

/** Inline style for a solid-color pill: background + contrasting text color. */
export function coloredPillStyle(
  backgroundColor: string,
  options?: ContrastTextOptions,
): { backgroundColor: string; color: string } {
  return {
    backgroundColor,
    color: contrastTextColorForBackground(backgroundColor, options),
  };
}
