import { connectDB, getStoreSettings, Setting } from "@store/db";
import { resolvePublicSiteUrl, type SeoSettings, type StoredImage, type StoreSettings } from "@store/shared";

const SEO_SETTING_KEYS = ["seo.storeName", "seo.titleTemplate", "seo.defaultDescription", "seo.ogImageDefault", "store.logo"] as const;

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function isStoredImage(value: unknown): value is StoredImage {
	if (!value || typeof value !== "object") {
		return false;
	}
	const imageValue = value as Record<string, unknown>;
	return (
		typeof imageValue.blurDataURL === "string" &&
		typeof imageValue.alt === "string" &&
		!!imageValue.variants &&
		typeof (imageValue.variants as Record<string, unknown>).detail === "string"
	);
}

function seoSettingsFromStore(store: StoreSettings, map: Map<string, unknown>): SeoSettings {
	const ogImageDefault = map.get("seo.ogImageDefault");
	const storeLogo = map.get("store.logo");
	const fallbackOgUrl =
		(store.brandLogoLight.trim() || store.brandLogoDark.trim() || "") ||
		(isStoredImage(ogImageDefault) ? ogImageDefault.variants.detail : isStoredImage(storeLogo) ? storeLogo.variants.detail : "") ||
		"";

	return {
		siteName: store.siteName,
		siteTagline: store.siteTagline,
		siteUrl: resolvePublicSiteUrl(store.publicSiteUrl),
		seoStoreName: asString(map.get("seo.storeName"), ""),
		titleTemplate: asString(map.get("seo.titleTemplate"), "{title} | {storeName}"),
		defaultDescription: asString(map.get("seo.defaultDescription"), store.siteTagline),
		defaultOgImageUrl: fallbackOgUrl,
	};
}

export async function loadSeoSettings(): Promise<SeoSettings> {
	const store = await getStoreSettings();
	await connectDB();
	const docs = await Setting.find({ key: { $in: [...SEO_SETTING_KEYS] } })
		.select({ key: 1, value: 1 })
		.lean<Array<{ key: string; value: unknown }>>();
	const map = new Map(docs.map((doc) => [doc.key, doc.value]));
	return seoSettingsFromStore(store, map);
}
