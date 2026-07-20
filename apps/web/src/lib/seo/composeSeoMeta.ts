import { cache } from "react";

import {
	composeAttributeGlossarySeo as composeAttributeGlossarySeoFn,
	composeBrandSeo as composeBrandSeoFn,
	composeCategorySeo as composeCategorySeoFn,
	composeGradeGlossarySeo as composeGradeGlossarySeoFn,
	composeHomeSeo as composeHomeSeoFn,
	composeIntentSurfaceSeo as composeIntentSurfaceSeoFn,
	composeOfferSeo as composeOfferSeoFn,
	composeProductSeo as composeProductSeoFn,
	composeProductPageSeo as composeProductPageSeoFn,
} from "@store/shared";

export type { BrandSeoRef, CategorySeoRef, ResolvedSeoMeta, SeoSettings } from "@store/shared";

/** Per-render dedupe — `generateMetadata` and the page body share one pass. */
export const composeBrandSeo = cache(composeBrandSeoFn);
export const composeCategorySeo = cache(composeCategorySeoFn);
export const composeGradeGlossarySeo = cache(composeGradeGlossarySeoFn);
export const composeAttributeGlossarySeo = cache(composeAttributeGlossarySeoFn);
export const composeIntentSurfaceSeo = cache(composeIntentSurfaceSeoFn);
export const composeHomeSeo = cache(composeHomeSeoFn);
export const composeOfferSeo = cache(composeOfferSeoFn);
export const composeProductSeo = cache(composeProductSeoFn);
export const composeProductPageSeo = cache(composeProductPageSeoFn);
