export type IconName = string;

export const DEFAULT_ICON: IconName = "Package";

const ICON_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

export function normalizeIconName(value: unknown, fallback: IconName = DEFAULT_ICON): IconName {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!ICON_NAME_PATTERN.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}
