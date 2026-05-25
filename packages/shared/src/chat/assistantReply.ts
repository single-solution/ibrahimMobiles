/**
 * Sanitize assistant output before it reaches customers.
 * Strips external URLs and markdown links; keeps internal /shop paths.
 */

const EXTERNAL_URL_PATTERN =
  /https?:\/\/[^\s<>"')\]]+/gi;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Relative storefront paths the assistant may mention. */
const INTERNAL_PATH_PATTERN = /^\/(?:shop|deals|search|checkout|account)(?:\/[\w-]+)*(?:\?[\w%&=.-]*)?$/i;

export function sanitizeAssistantReply(raw: string): string {
  let text = raw.trim();

  text = text.replace(MARKDOWN_LINK_PATTERN, (_match, label: string, url: string) => {
    const trimmed = url.trim();
    if (INTERNAL_PATH_PATTERN.test(trimmed)) {
      return `${label} (${trimmed})`;
    }
    return label;
  });

  text = text.replace(EXTERNAL_URL_PATTERN, "");

  text = text.replace(/\s{2,}/g, " ").trim();

  return text.slice(0, 3_500);
}

export function assistantReplyLooksUnsafe(text: string): boolean {
  if (!text || text.length < 8) {
    return true;
  }
  if (EXTERNAL_URL_PATTERN.test(text)) {
    return true;
  }
  return false;
}
