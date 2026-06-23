import DOMPurify from "isomorphic-dompurify";

/** Max HTML length for admin-authored policy documents. */
export const POLICY_HTML_MAX_LENGTH = 20_000;

const POLICY_ALLOWED_TAGS = ["h2", "h3", "p", "br", "strong", "em", "ul", "ol", "li", "a", "blockquote"] as const;

/**
 * Strip unsafe markup from admin-authored return / privacy policy HTML
 * before rendering on the storefront.
 */
export function sanitizePolicyHtml(html: string): string {
	if (!html.trim()) {
		return "";
	}
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [...POLICY_ALLOWED_TAGS],
		ALLOWED_ATTR: ["href", "target", "rel"],
	});
}
