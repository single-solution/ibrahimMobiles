/**
 * Convert a free-form string to a URL-safe slug.
 * - lowercases
 * - replaces non-alphanumerics with single dashes
 * - trims leading/trailing dashes
 * - caps length so it stays index-friendly
 */
export function slugify(input: string, maxLength = 64): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}
