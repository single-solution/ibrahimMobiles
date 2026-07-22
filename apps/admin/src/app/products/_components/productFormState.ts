/**
 * In-memory shape for the `/products/new` form. Mirrors the AdminVariant
 * payload but every field is optional during authoring; `validate()` is
 * the canonical conversion to a clean POST body.
 */

import {
	capitalizeEachWord,
	compareAlphabetically,
	DEFAULT_VARIANT_WARRANTY_DAYS,
	formatAttributeOptionLabel,
	filterAttributesForProduct,
	mergeProductPoolIntoAttributeOptions,
	type ProductAttributeConfig,
	type SeoMeta,
} from "@store/shared";
import type { GalleryImage } from "@/components/shared/uploads/imageStaging";

import type { AdminAttribute, AdminBrand, AdminCategory, AdminGrade, AdminProduct, AdminVariant } from "@/types/models";

/** Persisted attribute map: one value or several (e.g. three colors on one variant). */
export type VariantAttributeValue = string | string[];
export type VariantAttributesMap = Record<string, VariantAttributeValue>;

export interface VariantDraft {
	/** Local-only React key so the same draft can be re-rendered after edits. */
	uid: string;
	gradeSlug: string;
	priceRupees: number;
	quantity: number;
	/** Force sold out on storefront without changing `quantity`. */
	forceOutOfStock: boolean;
	warrantyDays: number | null;
	attributes: Record<string, string>;
	attributeDisplay?: Record<string, string>;
	/** Multiple global option values for one attribute on this variant (e.g. 3 colors). */
	attributesMulti?: Record<string, string[]>;
}

export interface ProductDraft {
	categorySlug: string;
	brandSlug: string;
	name: string;
	seo: SeoMeta;
	variants: VariantDraft[];
	/** Ordered product gallery — single gallery per product, shared by every variant. */
	images: GalleryImage[];
}

/** Per-category data the form needs to render. Loaded via the server page. */
export interface CategorySurface {
	category: AdminCategory;
	brands: AdminBrand[];
	grades: AdminGrade[];
	attributes: AdminAttribute[];
}

let variantCounter = 0;
export function newVariantUid(): string {
	variantCounter += 1;
	return `v-${Date.now().toString(36)}-${variantCounter}`;
}

export function emptyDraft(): ProductDraft {
	return {
		categorySlug: "",
		brandSlug: "",
		name: "",
		seo: {},
		variants: [],
		images: [],
	};
}

export function emptyVariantDraft(): VariantDraft {
	return {
		uid: newVariantUid(),
		gradeSlug: "",
		priceRupees: 0,
		quantity: 1,
		forceOutOfStock: false,
		warrantyDays: DEFAULT_VARIANT_WARRANTY_DAYS,
		attributes: {},
		attributeDisplay: {},
		attributesMulti: {},
	};
}

/** Merge single- and multi-select fields into the API/storefront attribute map. */
export interface DescribeVariantDraftLabelOptions {
	productConfig?: ProductAttributeConfig;
	/** Omit attributes whose product option pool has only one choice (sidebar summaries). */
	hideSingularPoolAttributes?: boolean;
}

/** Short label for pickers (e.g. "copy images from" sibling in the same grade). */
export function describeVariantDraftLabel(draft: VariantDraft, attributes: AdminAttribute[], options?: DescribeVariantDraftLabelOptions): string {
	const merged = mergeVariantDraftAttributes(draft);
	const parts: string[] = [];
	for (const attribute of attributes) {
		if (options?.hideSingularPoolAttributes && options.productConfig) {
			const poolOptions = mergeProductPoolIntoAttributeOptions(attribute, options.productConfig);
			if (poolOptions.length <= 1) {
				continue;
			}
		}

		const raw = merged[attribute.slug];
		if (!raw) {
			continue;
		}
		const values = Array.isArray(raw) ? raw : [raw];
		for (const value of values) {
			if (!value) {
				continue;
			}
			const option = attribute.options.find((row) => row.value.toLowerCase() === value.toLowerCase());
			const label = draft.attributeDisplay?.[attribute.slug] ?? (option ? formatAttributeOptionLabel(option.label, attribute.unit) : String(value));
			parts.push(label);
		}
	}
	if (parts.length > 0) {
		return parts.slice(0, 4).join(" · ");
	}
	if (options?.hideSingularPoolAttributes && Object.keys(merged).length > 0) {
		return "Variant";
	}
	return "Unconfigured variant";
}

export function mergeVariantDraftAttributes(draft: VariantDraft): VariantAttributesMap {
	const merged: VariantAttributesMap = { ...draft.attributes };
	for (const [slug, values] of Object.entries(draft.attributesMulti ?? {})) {
		if (values.length > 0) {
			merged[slug] = values.length === 1 ? values[0] : [...values];
		}
	}
	return merged;
}

/** Selected option values for one attribute (single + multi-select). */
export function attributeValuesOnDraft(draft: VariantDraft, slug: string): string[] {
	const multi = draft.attributesMulti?.[slug];
	if (multi && multi.length > 0) {
		return multi;
	}
	const single = draft.attributes[slug];
	return single ? [single] : [];
}

export function attributeOptionValueMatches(left: string, right: string): boolean {
	return left.toLowerCase() === right.toLowerCase();
}

export function attributeValuesInclude(values: string[], candidate: string): boolean {
	const target = candidate.toLowerCase();
	return values.some((entry) => entry.toLowerCase() === target);
}

export function attributeValuesWithout(values: string[], candidate: string): string[] {
	const target = candidate.toLowerCase();
	return values.filter((entry) => entry.toLowerCase() !== target);
}

export function resolveCanonicalAttributeOptionValue(options: Array<{ value: string }>, value: string): string {
	const match = options.find((option) => attributeOptionValueMatches(option.value, value));
	return match?.value ?? value.trim().toLowerCase();
}

export function canonicalizeSelectedOptionKeys(options: Array<{ value: string }>, values: string[]): string[] {
	const seen = new Set<string>();
	const canonical: string[] = [];
	for (const value of values) {
		const resolved = resolveCanonicalAttributeOptionValue(options, value);
		const key = resolved.toLowerCase();
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		canonical.push(resolved);
	}
	return canonical;
}

function variantAttributeSortKey(variant: VariantDraft, slug: string, pool: Array<{ value: string }>): string {
	const merged = mergeVariantDraftAttributes(variant);
	const raw = merged[slug];
	if (raw === undefined || raw === null || raw === "") {
		return "~";
	}

	const values = Array.isArray(raw) ? raw : [raw];
	const ranks = values
		.map((value) => {
			const index = pool.findIndex((option) => attributeOptionValueMatches(option.value, String(value)));
			return index >= 0 ? index : 99_999;
		})
		.sort((left, right) => left - right)
		.map((rank) => String(rank).padStart(5, "0"));

	return ranks.join(",");
}

/** Stable admin order: product attribute slugs, then option-pool order (matches Generate). */
export function compareVariantDraftsForDisplay(
	left: VariantDraft,
	right: VariantDraft,
	attributes: AdminAttribute[],
	productConfig: ProductAttributeConfig,
): number {
	const attributesBySlug = new Map(attributes.map((attribute) => [attribute.slug, attribute]));

	for (const slug of productConfig.attributeSlugs) {
		const attribute = attributesBySlug.get(slug);
		if (!attribute) {
			continue;
		}

		const pool = mergeProductPoolIntoAttributeOptions(attribute, productConfig);
		if (pool.length <= 1) {
			continue;
		}

		const leftKey = variantAttributeSortKey(left, slug, pool);
		const rightKey = variantAttributeSortKey(right, slug, pool);
		if (leftKey !== rightKey) {
			return leftKey.localeCompare(rightKey);
		}
	}

	const scoped = filterAttributesForProduct(attributes, productConfig);
	const labelOrder = compareAlphabetically(describeVariantDraftLabel(left, scoped), describeVariantDraftLabel(right, scoped));
	if (labelOrder !== 0) {
		return labelOrder;
	}

	return compareAlphabetically(left.uid, right.uid);
}

export function sortVariantDraftsForDisplay(
	variants: VariantDraft[],
	attributes: AdminAttribute[],
	productConfig: ProductAttributeConfig,
): VariantDraft[] {
	return [...variants].sort((left, right) => compareVariantDraftsForDisplay(left, right, attributes, productConfig));
}

export function adminVariantToDraft(variant: AdminVariant): VariantDraft {
	const attributes: Record<string, string> = {};
	const attributesMulti: Record<string, string[]> = {};

	for (const [slug, raw] of Object.entries(variant.attributes ?? {})) {
		if (Array.isArray(raw)) {
			if (raw.length === 1) {
				attributes[slug] = raw[0];
			} else if (raw.length > 1) {
				attributesMulti[slug] = [...raw];
			}
			continue;
		}
		if (typeof raw === "string" && raw.length > 0) {
			attributes[slug] = raw;
		}
	}

	return {
		uid: variant.id,
		gradeSlug: variant.gradeSlug,
		priceRupees: variant.priceRupees,
		quantity: variant.quantity,
		forceOutOfStock: variant.forceOutOfStock ?? false,
		warrantyDays: variant.warrantyDays ?? null,
		attributes,
		attributesMulti,
		attributeDisplay: variant.attributeDisplay ? { ...variant.attributeDisplay } : {},
	};
}

export interface ProductValidationError {
	/** Path like "name", "variants.0.gradeSlug", "variants.1.attributes.storage". */
	path: string;
	message: string;
}

export interface ProductValidationOk {
	ok: true;
	payload: {
		name: string;
		categorySlug: string;
		brandSlug: string;
		variants: Array<{
			gradeSlug: string;
			priceRupees: number;
			quantity: number;
			forceOutOfStock: boolean;
			warrantyDays?: number;
			attributes: VariantAttributesMap;
			attributeDisplay?: Record<string, string>;
		}>;
		seo?: SeoMeta;
	};
}

export interface ProductValidationFail {
	ok: false;
	errors: ProductValidationError[];
}

export interface ShellValidationOk {
	ok: true;
	payload: {
		name: string;
		categorySlug: string;
		brandSlug: string;
	};
}

export function validateShellDraft(draft: Pick<ProductDraft, "categorySlug" | "brandSlug" | "name">): ShellValidationOk | ProductValidationFail {
	const errors: ProductValidationError[] = [];

	if (!draft.categorySlug) {
		errors.push({ path: "categorySlug", message: "Pick a category." });
	}
	if (!draft.brandSlug) {
		errors.push({ path: "brandSlug", message: "Pick a brand." });
	}
	const name = capitalizeEachWord(draft.name).trim();
	if (name.length < 2) {
		errors.push({ path: "name", message: "Product name is required." });
	} else if (name.length > 120) {
		errors.push({ path: "name", message: "Product name is too long (max 120)." });
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		payload: {
			name,
			categorySlug: draft.categorySlug,
			brandSlug: draft.brandSlug,
		},
	};
}

function collectVariantErrors(
	variants: VariantDraft[],
	surface: CategorySurface,
	brandSlug: string,
	pathForIndex: (index: number) => string,
	productConfig: ProductAttributeConfig,
): ProductValidationError[] {
	const errors: ProductValidationError[] = [];
	const requiredAttributes = filterAttributesForProduct(surface.attributes, productConfig).map((attribute) => ({
		...attribute,
		options: mergeProductPoolIntoAttributeOptions(attribute, productConfig),
	}));

	variants.forEach((variant, index) => {
		const prefix = pathForIndex(index);
		if (!variant.gradeSlug) {
			errors.push({
				path: `${prefix}.gradeSlug`,
				message: "Pick a grade.",
			});
		}
		if (!Number.isInteger(variant.priceRupees) || variant.priceRupees <= 0) {
			errors.push({
				path: `${prefix}.priceRupees`,
				message: "Enter a price.",
			});
		}
		if (!Number.isInteger(variant.quantity) || variant.quantity < 0) {
			errors.push({
				path: `${prefix}.quantity`,
				message: "Quantity must be a non-negative whole number.",
			});
		}
		if (variant.warrantyDays !== null && (!Number.isInteger(variant.warrantyDays) || variant.warrantyDays < 0)) {
			errors.push({
				path: `${prefix}.warrantyDays`,
				message: "Warranty days must be a non-negative whole number.",
			});
		}

		for (const attr of requiredAttributes) {
			const selectedValues = attributeValuesOnDraft(variant, attr.slug);
			if (selectedValues.length === 0) {
				errors.push({
					path: `${prefix}.attributes.${attr.slug}`,
					message: `Select a ${attr.label.toLowerCase()}.`,
				});
				continue;
			}

			for (const value of selectedValues) {
				const inPool = attr.options.some((option) => option.value.toLowerCase() === value.toLowerCase());
				if (!inPool) {
					errors.push({
						path: `${prefix}.attributes.${attr.slug}`,
						message: `${value} is not in this product's option pool for ${attr.label.toLowerCase()}.`,
					});
				}
			}
		}
	});

	return errors;
}

/** A product must have at least one photo in its shared gallery. */
export function collectProductImageErrors(images: GalleryImage[]): ProductValidationError[] {
	if (images.length > 0) {
		return [];
	}
	return [
		{
			path: "images",
			message: "Add at least one product photo.",
		},
	];
}

export function validateVariantDrafts(
	variants: VariantDraft[],
	surface: CategorySurface,
	brandSlug: string,
	productConfig: ProductAttributeConfig,
	pathForIndex: (index: number) => string = (index) => `variants.${index}`,
): ProductValidationOk | ProductValidationFail {
	const errors = collectVariantErrors(variants, surface, brandSlug, pathForIndex, productConfig);

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		payload: {
			name: "",
			categorySlug: surface.category.slug,
			brandSlug,
			variants: variants.map((variant) => {
				const out: ProductValidationOk["payload"]["variants"][number] = {
					gradeSlug: variant.gradeSlug,
					priceRupees: variant.priceRupees,
					quantity: variant.quantity,
					forceOutOfStock: variant.forceOutOfStock,
					attributes: mergeVariantDraftAttributes(variant),
				};
				if (variant.warrantyDays !== null) {
					out.warrantyDays = variant.warrantyDays;
				}
				if (variant.attributeDisplay && Object.keys(variant.attributeDisplay).length > 0) {
					out.attributeDisplay = { ...variant.attributeDisplay };
				}
				return out;
			}),
		},
	};
}

export function validateDraft(draft: ProductDraft, surface: CategorySurface | null, productConfig?: ProductAttributeConfig): ProductValidationOk | ProductValidationFail {
	const shell = validateShellDraft(draft);
	if (!shell.ok) {
		return shell;
	}

	if (!surface) {
		return { ok: false, errors: [{ path: "categorySlug", message: "Pick a category." }] };
	}

	if (draft.variants.length === 0) {
		return {
			ok: false,
			errors: [{ path: "variants", message: "Add at least one variant." }],
		};
	}

	const resolvedConfig = productConfig ?? ({ attributeSlugs: [], attributeOptionPool: {} } satisfies ProductAttributeConfig);

	const variantErrors = collectVariantErrors(draft.variants, surface, draft.brandSlug, (index) => `variants.${index}`, resolvedConfig);
	const imageErrors = collectProductImageErrors(draft.images);
	const allErrors = [...variantErrors, ...imageErrors];

	if (allErrors.length > 0) {
		return { ok: false, errors: allErrors };
	}

	const seoPayload = draft.seo ?? {};
	const hasSeo = Object.values(seoPayload).some((value) => value === true || (typeof value === "string" && value.length > 0));

	return {
		ok: true,
		payload: {
			...shell.payload,
			...(hasSeo ? { seo: seoPayload } : {}),
			variants: draft.variants.map((variant) => {
				const out: ProductValidationOk["payload"]["variants"][number] = {
					gradeSlug: variant.gradeSlug,
					priceRupees: variant.priceRupees,
					quantity: variant.quantity,
					forceOutOfStock: variant.forceOutOfStock,
					attributes: mergeVariantDraftAttributes(variant),
				};
				if (variant.warrantyDays !== null) {
					out.warrantyDays = variant.warrantyDays;
				}
				if (variant.attributeDisplay && Object.keys(variant.attributeDisplay).length > 0) {
					out.attributeDisplay = { ...variant.attributeDisplay };
				}
				return out;
			}),
		},
	};
}

export function errorsByPath(errors: ProductValidationError[]) {
	const map = new Map<string, string>();
	for (const error of errors) {
		if (!map.has(error.path)) {
			map.set(error.path, error.message);
		}
	}
	return map;
}

/** Whether any validation error belongs to one variant draft path prefix. */
export function variantHasErrors(errorByPath: Map<string, string>, pathPrefix: string): boolean {
	for (const path of errorByPath.keys()) {
		if (path === pathPrefix || path.startsWith(`${pathPrefix}.`)) {
			return true;
		}
	}
	return false;
}

export function variantErrorCount(errorByPath: Map<string, string>, pathPrefix: string): number {
	let count = 0;
	for (const path of errorByPath.keys()) {
		if (path === pathPrefix || path.startsWith(`${pathPrefix}.`)) {
			count += 1;
		}
	}
	return count;
}

export function gradeErrorCount(errorByPath: Map<string, string>, gradeSlug: string): number {
	const prefix = `grade.${gradeSlug}.combinations.`;
	let count = 0;
	for (const path of errorByPath.keys()) {
		if (path.startsWith(prefix)) {
			count += 1;
		}
	}
	return count;
}

export function gradeHasErrors(errorByPath: Map<string, string>, gradeSlug: string): boolean {
	return gradeErrorCount(errorByPath, gradeSlug) > 0;
}
