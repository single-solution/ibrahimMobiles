/**
 * Product image limits.
 *
 * The persisted source of truth is `Product.images` — a flat ordered
 * gallery applied to every variant. Resolution is trivial (`product.images`
 * is already in the right shape), so callers read it directly; this module
 * only exposes the cap shared by validators and form UIs.
 */

export const MAX_PRODUCT_IMAGES = 24;
